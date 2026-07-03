import { PrismaClient, Document } from '@prisma/client';

import { prisma } from '../db';

export class DocumentService {
  /**
   * Creates a new, empty document for a project.
   */
  static async createDocument(projectId: string, title: string, authorId: string): Promise<Document> {
    const document = await prisma.document.create({
      data: {
        projectId,
        title,
        lastModifiedBy: authorId,
        content: {}, // Initialize with empty JSON content
      },
    });

    return document;
  }

  /**
   * Fetches all documents for a specific project.
   */
  static async getDocumentsForProject(projectId: string): Promise<Document[]> {
    const documents = await prisma.document.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        projectId: true,
        title: true,
        lastModifiedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Document[];

    return documents;
  }

  /**
   * Fetches a specific document by its ID, including its full content.
   */
  static async getDocumentById(documentId: string): Promise<Document | null> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    return document;
  }

  /**
   * Persists the latest real-time collaboration changes to the database.
   */
  static async saveDocumentContent(documentId: string, content: any, userId: string): Promise<Document> {
    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        content,
        lastModifiedBy: userId,
      },
    });

    return document;
  }
}
