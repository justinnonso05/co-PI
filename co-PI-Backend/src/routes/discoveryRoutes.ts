import { Router } from 'express';
import { DiscoveryController } from '../controllers/DiscoveryController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

// Unauthenticated endpoint for landing page search (returns counts only)
router.get('/search/count', DiscoveryController.searchPublicCount);

// Authenticated endpoints for discovering and applying to repositories
router.get('/public', authenticateJWT, DiscoveryController.getPublicRepositories);
router.post('/apply/:id', authenticateJWT, DiscoveryController.applyToRepository);

// Unauthenticated endpoint for explore page
router.get('/explore', DiscoveryController.explorePublicRepositories);

export default router;
