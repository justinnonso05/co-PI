import { Router } from 'express';
import { DiscoveryController } from '../controllers/DiscoveryController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

// Unauthenticated endpoint for landing page search (returns counts only)
router.get('/search/count', DiscoveryController.searchPublicCount);

// Authenticated endpoints for discovering and applying to projects
router.get('/university', authenticateJWT, DiscoveryController.getUniversityProjects);
router.post('/apply/:id', authenticateJWT, DiscoveryController.applyToProject);

export default router;
