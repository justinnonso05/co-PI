import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: Get recent activities
 *     description: Returns the 20 most recent activities across all projects the authenticated user belongs to.
 *     tags: [Activity]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of recent activities
 *       401:
 *         description: Unauthorized
 */
router.get('/activities', authenticateJWT, ActivityController.getRecentActivities);

export default router;
