import { Request, Response, NextFunction } from 'express';
import { DiscoveryService } from '../services/DiscoveryService';

export class DiscoveryController {
  static async searchPublicCount(req: Request, res: Response, next: NextFunction) {
    try {
      const keyword = (req.query.q as string) || '';
      const count = await DiscoveryService.searchPublicRepositoriesCount(keyword);
      res.status(200).json({ count });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicRepositories(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const repositories = await DiscoveryService.getPublicRepositories(userId);
      res.status(200).json(repositories);
    } catch (error) {
      next(error);
    }
  }

  static async applyToRepository(req: Request, res: Response, next: NextFunction) {
    try {
      const repositoryId = req.params.id as string;
      const userId = (req as any).user.id;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: 'Bad Request', message: 'Role is required.' });
      }

      const application = await DiscoveryService.applyToRepository(repositoryId, userId, role);
      res.status(201).json({ message: 'Application submitted successfully', application });
    } catch (error) {
      next(error);
    }
  }
}
