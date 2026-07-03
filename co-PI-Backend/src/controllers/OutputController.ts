import { Request, Response, NextFunction } from 'express';
import { OutputService } from '../services/OutputService';
import { AuthRequest } from '../middlewares/authMiddleware';

export class OutputController {
  static async createOutput(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;
      const { outputType, citation, fileUrl } = req.body;

      if (!outputType || !citation) {
        return res.status(400).json({ error: 'Bad Request', message: 'outputType and citation are required.' });
      }

      const output = await OutputService.createOutput(projectId, outputType, citation, fileUrl);
      res.status(201).json({ message: 'Output logged successfully.', output });
    } catch (error) {
      next(error);
    }
  }

  static async getOutputs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;

      const outputs = await OutputService.getOutputsForProject(projectId);
      res.status(200).json({ outputs });
    } catch (error) {
      next(error);
    }
  }
}
