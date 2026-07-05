import { Request, Response } from 'express';
import Papa from 'papaparse';
import { PDFParse } from 'pdf-parse';
import { BtlRuntimeService, BTLMessage } from '../services/btlRuntime.service';
import { prisma } from '../db';

export class AiController {
  
  static async datasetReview(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId, documentId, customPrompt, rawData } = req.body;
      const file = req.file;

      if (!repositoryId) {
        res.status(400).json({ error: 'repositoryId is required.' });
        return;
      }
      if (!file && !rawData) {
        res.status(400).json({ error: 'Either CSV file or rawData is required.' });
        return;
      }

      // 1. Parse CSV or rawData to get deterministic stats
      let rows: any[] = [];
      if (rawData) {
        rows = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      } else if (file) {
        const csvString = file.buffer.toString('utf-8');
        const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
        rows = parsed.data as any[];
      }
      const totalRows = rows.length;
      let missingValuesCount = 0;
      let duplicateCount = 0;
      const seenRows = new Set();

      rows.forEach(row => {
        let hasMissing = false;
        const rowString = JSON.stringify(row);
        if (seenRows.has(rowString)) {
          duplicateCount++;
        } else {
          seenRows.add(rowString);
        }

        Object.values(row).forEach(val => {
          if (val === null || val === undefined || val === '') {
            hasMissing = true;
          }
        });
        if (hasMissing) missingValuesCount++;
      });

      const dataSample = rows.slice(0, 50);
      const statsSummary = `
Dataset Stats:
- Total Rows: ${totalRows}
- Rows with missing values: ${missingValuesCount}
- Duplicate rows: ${duplicateCount}

Data Sample (First ${dataSample.length} rows):
${JSON.stringify(dataSample, null, 2)}
      `;

      // 2. Ask BTL Runtime for qualitative writeup
      const systemInstruction = 'You are an AI data reviewer. Given the statistical summary and data sample of a dataset, return a JSON object with a single "findings" array. Each item should have "type" (e.g. "missing_values", "duplicates", "outliers", "trends") and "description". Answer any user questions based on the sample.' + 
        (customPrompt ? `\n\nAdditional user instructions: ${customPrompt}` : '');

      const messages: BTLMessage[] = [
        {
          role: 'system',
          content: systemInstruction
        },
        {
          role: 'user',
          content: statsSummary
        }
      ];

      const btlResponse = await BtlRuntimeService.createChatCompletion({
        repositoryId,
        userId: (req as any).user?.userId,
        messages,
        response_format: { type: 'json_object' }
      });

      const responseContent = JSON.parse(btlResponse.choices[0].message.content);

      // 3. Save the review if documentId exists
      let review = null;
      if (documentId) {
        review = await prisma.datasetReview.create({
          data: {
            documentId,
            findings: responseContent.findings || responseContent
          }
        });
      } else {
        review = { findings: responseContent.findings || responseContent };
      }

      // 4. Extract Fact
      await AiController.extractAndSaveFact(repositoryId, messages, btlResponse.choices[0].message.content, 'dataset');

      res.status(200).json({ stats: statsSummary, review });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process dataset review', details: error.message });
    }
  }

  static async literatureDigest(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId, documentId, textContext, customPrompt } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!repositoryId || !documentId) {
        res.status(400).json({ error: 'repositoryId and documentId are required.' });
        return;
      }

      let combinedText = '';

      if (textContext) {
        combinedText = textContext.substring(0, 30000);
      } else if (files && files.length > 0) {
        // 1. Extract text from PDFs
        for (const file of files) {
          const parser = new PDFParse({ data: file.buffer });
          const data = await parser.getText();
          combinedText += `\n--- Document ---\n${data.text.substring(0, 15000)}`; // limit to avoid token limits
        }
      } else {
        res.status(400).json({ error: 'Either PDF files or textContext must be provided.' });
        return;
      }

      let systemInstruction = '';
      if (customPrompt) {
        systemInstruction = `You are an expert research assistant. Read the provided documents and answer the user's prompt directly in plain text: ${customPrompt}`;
      } else {
        systemInstruction = 'You are an expert research assistant. Read the provided papers and produce a short digest: return a JSON object containing "summary" (a one-line summary per paper as a string) and "gaps" (an array of 2-3 bullet points representing gaps or open questions across all of them).';
      }

      const messages: BTLMessage[] = [
        {
          role: 'system',
          content: systemInstruction
        },
        {
          role: 'user',
          content: combinedText
        }
      ];

      const btlResponse = await BtlRuntimeService.createChatCompletion({
        repositoryId,
        userId: (req as any).user?.userId,
        messages,
        ...(customPrompt ? {} : { response_format: { type: 'json_object' } })
      });

      if (customPrompt) {
        await AiController.extractAndSaveFact(repositoryId, messages, btlResponse.choices[0].message.content, 'paper');
        res.status(200).json({ customResponse: btlResponse.choices[0].message.content });
        return;
      }

      const responseContent = JSON.parse(btlResponse.choices[0].message.content);

      // 3. Save the digest
      const digest = await prisma.paperDigest.create({
        data: {
          documentId,
          summary: responseContent.summary || "Digest summary",
          gaps: responseContent.gaps || []
        }
      });

      // 4. Extract Fact
      await AiController.extractAndSaveFact(repositoryId, messages, btlResponse.choices[0].message.content, 'paper');

      res.status(200).json({ digest });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process literature digest', details: error.message });
    }
  }

  static async memoryLookup(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId, query } = req.query;
      
      if (!repositoryId || !query) {
        res.status(400).json({ error: 'repositoryId and query are required.' });
        return;
      }

      // Simple recency/keyword fetch for hackathon MVP
      const facts = await prisma.aiFact.findMany({
        where: { repositoryId: String(repositoryId) },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const factContext = facts.map(f => f.content).join('\n');

      const messages: BTLMessage[] = [
        {
          role: 'system',
          content: `You are an AI co-PI. Answer the user's question purely based on these established project facts. If the facts don't contain the answer, say you don't remember.\n\nProject Facts:\n${factContext}`
        },
        {
          role: 'user',
          content: String(query)
        }
      ];

      const btlResponse = await BtlRuntimeService.createChatCompletion({
        repositoryId: String(repositoryId),
        userId: (req as any).user?.userId,
        messages
      });

      res.status(200).json({ 
        answer: btlResponse.choices[0].message.content,
        factsUsed: facts 
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to lookup memory', details: error.message });
    }
  }

  // Utility to extract facts after interactions
  static async extractAndSaveFact(repositoryId: string, promptMessages: BTLMessage[], responseContent: string, sourceType: string) {
    try {
      const extractionMessages: BTLMessage[] = [
        {
          role: 'system',
          content: 'Extract 1-3 short factual statements from this exchange that are important to remember for the project. Return a JSON object with a "facts" array of strings. If there is nothing important, return an empty array.'
        },
        {
          role: 'user',
          content: `Prompt: ${JSON.stringify(promptMessages)}\nResponse: ${responseContent}`
        }
      ];

      const btlResponse = await BtlRuntimeService.createChatCompletion({
        repositoryId,
        messages: extractionMessages,
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(btlResponse.choices[0].message.content);
      const facts = parsed.facts || [];

      for (const fact of facts) {
        await prisma.aiFact.create({
          data: {
            repositoryId,
            content: fact,
            sourceType
          }
        });
      }
    } catch (err) {
      console.error('Fact extraction failed', err);
    }
  }
}
