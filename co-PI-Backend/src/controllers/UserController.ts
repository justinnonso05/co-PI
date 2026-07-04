import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

export class UserController {
  /**
   * Search users by email or list all users if no query is provided
   */
  static async searchUsers(req: Request, res: Response) {
    try {
      const query = req.query.q as string;

      let users;
      if (query) {
        users = await prisma.user.findMany({
          where: {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
          take: 20, // limit to 20 results for performance
        });
      } else {
        users = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
          take: 50, // limit to 50 results if no query
        });
      }

      res.status(200).json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update user profile (firstName, lastName)
   */
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { firstName, lastName } = req.body;
      if (!firstName || !lastName) {
        return res.status(400).json({ error: 'Bad Request', message: 'First and last name are required.' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { firstName, lastName },
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
      });

      res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      res.status(200).json({ message: 'Account deactivated successfully.' });
    } catch (error) {
      console.error('Error deactivating account:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
