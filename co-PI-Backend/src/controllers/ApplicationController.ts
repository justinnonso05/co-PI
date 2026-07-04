import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';
import { io } from '../sockets/collaborationHandler';

const ROLE_LABELS: Record<string, string> = {
  CO_INVESTIGATOR: 'Co-Investigator',
  ASSISTANT: 'Research Assistant',
  REVIEWER: 'Reviewer',
  PI: 'Principal Investigator',
};

export class ApplicationController {
  /** GET /api/projects/:id/applications — PI sees all pending applications */
  static async listApplications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;
      const applications = await prisma.projectApplication.findMany({
        where: { projectId, status: 'PENDING' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      res.status(200).json({ applications });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/applications/:appId — PI approves or rejects */
  static async reviewApplication(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const appId = req.params.appId as string;
      const { decision } = req.body; // 'APPROVED' | 'REJECTED'

      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Decision must be APPROVED or REJECTED.' });
      }

      const application = await prisma.projectApplication.findUnique({
        where: { id: appId },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      });

      if (!application) {
        return res.status(404).json({ error: 'Not Found', message: 'Application not found.' });
      }

      // Update status
      const updated = await prisma.projectApplication.update({
        where: { id: appId },
        data: { status: decision },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      // If approved, add user as project member (skip if already a member)
      if (decision === 'APPROVED') {
        const existing = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: application.projectId, userId: application.userId } },
        });
        if (!existing) {
          await prisma.projectMember.create({
            data: {
              projectId: application.projectId,
              userId: application.userId,
              role: application.role,
            },
          });
          if (io) {
            io.to(`user-${application.userId}`).emit('project-added');
          }
        }
      }

      res.status(200).json({ message: `Application ${decision.toLowerCase()}.`, application: updated });
    } catch (error) {
      next(error);
    }
  }
}
