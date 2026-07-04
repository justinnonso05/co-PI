import { Request, Response } from 'express';
import { prisma } from '../db';

export class ChatController {
  /**
   * Get the chat history for a repository
   */
  static getChatHistory = async (req: Request, res: Response) => {
    const id = req.params.id as string; // Repository ID

    try {
      // Get the last 100 messages, ordered by creation date ascending (oldest first, so we display top to bottom)
      const messages = await prisma.chatMessage.findMany({
        where: {
          projectId: id,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 100, // Reasonable limit for initial load
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      });

      return res.status(200).json(messages);
    } catch (error: any) {
      console.error('Failed to get chat history:', error);
      return res.status(500).json({ error: 'Failed to retrieve chat history' });
    }
  };
}
