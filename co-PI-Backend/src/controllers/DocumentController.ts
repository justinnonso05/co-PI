import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/DocumentService';
import { AuthRequest } from '../middlewares/authMiddleware';
import { PrismaClient } from '@prisma/client';

import { prisma } from '../db';

export class DocumentController {
  static async createDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;
      const { title } = req.body;
      const userId = req.user?.id;

      if (!title) {
        return res.status(400).json({ error: 'Bad Request', message: 'Title is required.' });
      }

      const document = await DocumentService.createDocument(projectId, title, userId!);
      res.status(201).json({ message: 'Document created successfully.', document });
    } catch (error) {
      next(error);
    }
  }

  static async getDocuments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;

      const documents = await DocumentService.getDocumentsForProject(projectId);
      res.status(200).json({ documents });
    } catch (error) {
      next(error);
    }
  }

  static async getDocumentById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const documentId = req.params.documentId as string;
      const userId = req.user?.id;

      // 1. Fetch document to ensure it exists and get its projectId
      const document = await DocumentService.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Not Found', message: 'Document not found.' });
      }

      // 2. Verify the current user is a member of the project this document belongs to
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: document.projectId,
            userId: userId!,
          },
        },
      });

      if (!member) {
        return res.status(403).json({ error: 'Forbidden', message: 'You are not a member of the project this document belongs to.' });
      }

      res.status(200).json({ document });
    } catch (error) {
      next(error);
    }
  }

  static async saveDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const documentId = req.params.documentId as string;
      const { content } = req.body;
      const userId = req.user?.id;

      if (!content) {
        return res.status(400).json({ error: 'Bad Request', message: 'Document content is required.' });
      }

      // 1. Fetch document to ensure it exists
      const existingDocument = await DocumentService.getDocumentById(documentId);
      if (!existingDocument) {
        return res.status(404).json({ error: 'Not Found', message: 'Document not found.' });
      }

      // 2. Verify membership
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existingDocument.projectId,
            userId: userId!,
          },
        },
      });

      if (!member) {
        return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to edit this document.' });
      }

      // 3. Save the document
      const updatedDocument = await DocumentService.saveDocumentContent(documentId, content, userId!);
      res.status(200).json({ message: 'Document saved successfully.', document: updatedDocument });
    } catch (error) {
      next(error);
    }
  }
}
