import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { EmailService } from '../services/EmailService';
import { io } from '../sockets/collaborationHandler';

export class ProposalController {
  static async createOrUpdateDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { type, content, fileUrl } = req.body;
      const userId = (req as any).user.id;

      // Role check: Only PI, Co-Investigator, or Assistant can edit draft
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      });
      if (!member || member.role === 'REVIEWER') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      let proposal = await prisma.proposal.findUnique({ where: { projectId } });

      if (proposal && proposal.status !== 'DRAFT' && proposal.status !== 'REVISION_REQUIRED') {
        return res.status(400).json({ message: 'Proposal is locked and cannot be edited.' });
      }

      if (proposal) {
        proposal = await prisma.proposal.update({
          where: { projectId },
          data: { type, content, fileUrl }
        });
      } else {
        proposal = await prisma.proposal.create({
          data: { projectId, type, content, fileUrl, status: 'DRAFT' }
        });
      }

      res.status(200).json(proposal);
    } catch (error) {
      next(error);
    }
  }

  static async submitProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const userId = (req as any).user.id;

      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      });
      if (!member || (member.role !== 'PI' && member.role !== 'CO_INVESTIGATOR')) {
        return res.status(403).json({ message: 'Only PI or Co-Investigator can submit.' });
      }

      const proposal = await prisma.proposal.upsert({
        where: { projectId },
        update: { status: 'SUBMITTED' },
        create: { projectId, type: 'document', status: 'SUBMITTED', content: 'See collaborative document' }
      });
      
      const project = await prisma.project.update({
        where: { id: projectId },
        data: { status: 'PROPOSAL_SUBMITTED' },
        include: { members: { include: { user: true } } }
      });

      // Notify Reviewer
      const reviewer = project.members.find(m => m.role === 'REVIEWER');
      const submitter = await prisma.user.findUnique({ where: { id: userId } });
      if (reviewer && submitter) {
        await EmailService.sendProposalSubmitted(
          reviewer.user.email,
          `${reviewer.user.firstName} ${reviewer.user.lastName}`,
          `${submitter.firstName} ${submitter.lastName}`,
          project.title
        );
      }

      // Emitting standard socket event
      if (io) {
        io.to(`project_${projectId}`).emit('proposal.submitted', { projectId, status: 'SUBMITTED' });
      }

      res.status(200).json(proposal);
    } catch (error) {
      next(error);
    }
  }

  static async reviewProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { decision } = req.body; // 'APPROVE' or 'REVISE'
      const userId = (req as any).user.id;

      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      });
      if (!member || member.role !== 'REVIEWER') {
        return res.status(403).json({ message: 'Only Reviewers can make decisions on proposals.' });
      }

      const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUIRED';
      const newProjectStatus = decision === 'APPROVE' ? 'PROPOSAL_APPROVED' : 'DRAFT';

      const proposal = await prisma.proposal.update({
        where: { projectId },
        data: { status: newStatus }
      });

      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { status: newProjectStatus },
        include: { members: { include: { user: true } } }
      });

      // Notify PI
      const pi = updatedProject.members.find(m => m.role === 'PI');
      const reviewerUser = await prisma.user.findUnique({ where: { id: userId } });
      if (pi && reviewerUser) {
        await EmailService.sendProposalReviewed(
          pi.user.email,
          `${pi.user.firstName} ${pi.user.lastName}`,
          `${reviewerUser.firstName} ${reviewerUser.lastName}`,
          updatedProject.title,
          decision
        );
      }

      if (io) {
        io.to(`project_${projectId}`).emit('proposal.status_changed', { projectId, status: newStatus });
      }

      res.status(200).json(proposal);
    } catch (error) {
      next(error);
    }
  }
}
