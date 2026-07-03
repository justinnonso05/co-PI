import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

export class ActivityController {
  /**
   * Get recent activities for all projects the user is a member of
   */
  static async getRecentActivities(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }

      // Find all project IDs the user belongs to
      const memberships = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const projectIds = memberships.map(m => m.projectId);

      if (projectIds.length === 0) {
        return res.status(200).json([]);
      }

      // Fetch the 20 most recent activities across those projects
      const activities = await prisma.activity.findMany({
        where: {
          projectId: { in: projectIds }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });

      res.status(200).json(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch activities' });
    }
  }
}
