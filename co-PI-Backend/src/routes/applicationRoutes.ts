import { Router } from 'express';
import { ApplicationController } from '../controllers/ApplicationController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';

const router = Router();

/**
 * PATCH /api/applications/:appId
 * PI approves or rejects a collaboration application.
 */
router.patch('/:appId', authenticateJWT, requireRole(['PI']), ApplicationController.reviewApplication);

export default router;
