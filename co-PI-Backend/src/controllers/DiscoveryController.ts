import { Request, Response, NextFunction } from 'express';
import { DiscoveryService } from '../services/DiscoveryService';
import { prisma } from '../db';

export class DiscoveryController {
  static async searchPublicCount(req: Request, res: Response, next: NextFunction) {
    try {
      const keyword = (req.query.q as string) || '';
      const count = await DiscoveryService.searchPublicProjectsCount(keyword);
      res.status(200).json({ count });
    } catch (error) {
      next(error);
    }
  }

  static async getUniversityProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      // JWT only stores { id } — always fetch fresh university from DB
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { university: true },
      });
      if (!dbUser?.university) {
        return res.status(403).json({ error: 'Forbidden', message: 'User does not belong to a university.' });
      }
      const projects = await DiscoveryService.getUniversityProjects(dbUser.university, userId);
      res.status(200).json(projects);
    } catch (error) {
      next(error);
    }
  }

  static async applyToProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;
      const userId = (req as any).user.id;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: 'Bad Request', message: 'Role is required.' });
      }

      const application = await DiscoveryService.applyToProject(projectId, userId, role);
      res.status(201).json({ message: 'Application submitted successfully', application });
    } catch (error) {
      next(error);
    }
  }
}
