import { Router } from 'express';
import { ProposalController } from '../controllers/ProposalController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

// Endpoints for managing proposals
router.post('/:projectId/proposal', authenticateJWT, ProposalController.createOrUpdateDraft);
router.post('/:projectId/proposal/submit', authenticateJWT, ProposalController.submitProposal);
router.post('/:projectId/proposal/review', authenticateJWT, ProposalController.reviewProposal);

export default router;
