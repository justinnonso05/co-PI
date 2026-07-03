import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/ProjectService';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Role, EthicalStatus, ProjectStatus } from '../types/enums';
import { prisma } from '../db';
import { EmailService } from '../services/EmailService';
import { io } from '../sockets/collaborationHandler';

export class ProjectController {
  static async createProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { title, description, researchTopic } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated.' });
      }

      if (!title || !description || !researchTopic) {
        return res.status(400).json({ error: 'Bad Request', message: 'Title, description, and research topic are required.' });
      }

      const project = await ProjectService.createProject(userId, title, description, researchTopic);
      if (io) {
        io.to(`user-${userId}`).emit('project-added');
      }
      res.status(201).json({ message: 'Project created successfully.', project });
    } catch (error) {
      next(error);
    }
  }

  static async getProjects(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated.' });
      }

      const projects = await ProjectService.getProjectsForUser(userId);
      res.status(200).json({ projects });
    } catch (error) {
      next(error);
    }
  }

  static async getProjectById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;

      const project = await ProjectService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({ error: 'Not Found', message: 'Project not found.' });
      }

      res.status(200).json({ project });
    } catch (error) {
      next(error);
    }
  }

  static async addMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;
      const { targetUserId, role } = req.body;

      if (!targetUserId || !role) {
        return res.status(400).json({ error: 'Bad Request', message: 'Target user ID and role are required.' });
      }

      if (!Object.values(Role).includes(role as Role)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid role.' });
      }

      const member = await ProjectService.addProjectMember(projectId, targetUserId, role);

      // Notify the new member
      const user = await prisma.user.findUnique({ where: { id: targetUserId } });
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (user && project) {
        await EmailService.sendMemberAdded(
          user.email,
          `${user.firstName} ${user.lastName}`,
          project.title,
          role
        );
        if (io) {
          io.to(`user-${targetUserId}`).emit('project-added');
        }
      }

      res.status(201).json({ message: 'Member added successfully.', member });
    } catch (error) {
      next(error);
    }
  }


  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!status) {
        return res.status(400).json({ error: 'Bad Request', message: 'Project status is required.' });
      }

      if (!Object.values(ProjectStatus).includes(status as ProjectStatus)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid project status.' });
      }

      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: userId! } }
      });

      // Role check
      if (!member || (member.role === Role.REVIEWER && ![ProjectStatus.CERTIFICATION, ProjectStatus.COMPLETED, ProjectStatus.REPORT_WRITING].includes(status as ProjectStatus))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Not authorized for this status.' });
      }
      if (member?.role === Role.ASSISTANT && status === ProjectStatus.CERTIFICATION) {
        return res.status(403).json({ error: 'Forbidden', message: 'Assistant cannot certify.' });
      }

      // We enforce strict linear transition in the frontend and a basic check here
      const project = await ProjectService.updateProjectStatus(projectId, status);

      // Notify members of stage advancement
      const updatedProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: { include: { user: true } } }
      });
      const actor = await prisma.user.findUnique({ where: { id: userId! } });

      if (updatedProject && actor) {
        const actorName = `${actor.firstName} ${actor.lastName}`;
        
        // Notify all members
        for (const m of updatedProject.members) {
          await EmailService.sendStageAdvanced(
            m.user.email,
            `${m.user.firstName} ${m.user.lastName}`,
            actorName,
            updatedProject.title,
            status
          );
        }

        // If it's a final submission, also send a specific Reviewer notification
        if (status === ProjectStatus.FINAL_SUBMISSION) {
          const reviewer = updatedProject.members.find(m => m.role === Role.REVIEWER);
          if (reviewer) {
            await EmailService.sendReportSubmitted(
              reviewer.user.email,
              `${reviewer.user.firstName} ${reviewer.user.lastName}`,
              actorName,
              updatedProject.title
            );
          }
        }
      }

      res.status(200).json({ message: 'Project status updated.', project });
    } catch (error) {
      next(error);
    }
  }

  static async updateVisibility(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;
      const { visibility } = req.body;
      
      if (visibility !== 'PUBLIC' && visibility !== 'PRIVATE') {
        return res.status(400).json({ error: 'Bad Request', message: 'Visibility must be PUBLIC or PRIVATE.' });
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { visibility }
      });

      const updatedProject = await ProjectService.getProjectById(projectId);

      // Notify clients to refresh project list/dashboard if necessary
      const { io } = await import('../sockets/collaborationHandler');
      io.emit('project-added');

      res.status(200).json({ message: 'Project visibility updated.', project: updatedProject });
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id as string;
      const targetUserId = req.params.userId as string;

      if (!targetUserId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Target user ID is required.' });
      }

      await ProjectService.removeProjectMember(projectId, targetUserId);
      res.status(200).json({ message: 'Member removed successfully.' });
    } catch (error) {
      next(error);
    }
  }
}
