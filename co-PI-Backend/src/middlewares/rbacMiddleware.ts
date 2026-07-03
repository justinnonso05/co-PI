import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { Role } from '../types/enums';

import { prisma } from '../db';

export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const projectId = req.params.id || req.body.projectId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated.' });
      }

      if (!projectId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Project ID is required to evaluate permissions.' });
      }

      // Check if user is a member of the project
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });

      if (!member) {
        return res.status(403).json({ error: 'Forbidden', message: 'You are not a member of this project.' });
      }

      if (!allowedRoles.includes(member.role as Role)) {
        return res.status(403).json({ error: 'Forbidden', message: 'You do not have the required role to perform this action.' });
      }

      // If checks pass, proceed
      next();
    } catch (error) {
      next(error);
    }
  };
};
