import { Request, Response } from 'express';
import Papa from 'papaparse';
const pdf = require('pdf-parse');
import { BtlRuntimeService, BTLMessage } from '../services/btlRuntime.service';
import { prisma } from '../db';

export class AiController {
  
  static async datasetReview(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId, documentId } = req.body;
      const file = req.file;

      if (!repositoryId || !documentId) {
        res.status(400).json({ error: 'repositoryId and documentId are required.' });
        return;
      }
      if (!file) {
        res.status(400).json({ error: 'CSV file is required.' });
        return;
      }

      // 1. Parse CSV to get deterministic stats
      const csvString = file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
      
      const rows = parsed.data as any[];
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

      const statsSummary = `
Dataset Stats:
- Total Rows: ${totalRows}
- Rows with missing values: ${missingValuesCount}
- Duplicate rows: ${duplicateCount}
      `;

      // 2. Ask BTL Runtime for qualitative writeup
      const messages: BTLMessage[] = [
        {
          role: 'system',
          content: 'You are an AI data reviewer. Given the statistical summary of a dataset, return a JSON object with a single "findings" array. Each item should have "type" (e.g. "missing_values", "duplicates", "outliers") and "description". Do not invent new stats, only comment on the provided ones.'
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

      // 3. Save the review
      const review = await prisma.datasetReview.create({
        data: {
          documentId,
          findings: responseContent.findings || responseContent
        }
      });

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
      const { repositoryId, documentId } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!repositoryId || !documentId) {
        res.status(400).json({ error: 'repositoryId and documentId are required.' });
        return;
      }
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'At least one PDF file is required.' });
        return;
      }

      // 1. Extract text from PDFs
      let combinedText = '';
      for (const file of files) {
        const data = await pdf(file.buffer);
        combinedText += `\n--- Document ---\n${data.text.substring(0, 15000)}`; // limit to avoid token limits
      }

      // 2. Ask BTL Runtime for digest
      const messages: BTLMessage[] = [
        {
          role: 'system',
          content: 'You are an expert research assistant. Read the provided papers and produce a short digest: return a JSON object containing "summary" (a one-line summary per paper as a string) and "gaps" (an array of 2-3 bullet points representing gaps or open questions across all of them).'
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
        response_format: { type: 'json_object' }
      });

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
