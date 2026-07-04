import { Router } from 'express';
import { OutputController } from '../controllers/OutputController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Research Outputs
 *   description: Logging and managing research outputs
 */

/**
 * @swagger
 * /api/projects/{id}/outputs:
 *   post:
 *     summary: Log a new research output
 *     tags: [Research Outputs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outputType
 *               - citation
 *             properties:
 *               outputType:
 *                 type: string
 *                 enum: [JOURNAL, CONFERENCE, REPORT]
 *               citation:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *                 description: Optional link to the output file
 *     responses:
 *       201:
 *         description: Output logged successfully.
 */
router.post('/repositories/:id/outputs', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR']), OutputController.createOutput);

/**
 * @swagger
 * /api/projects/{id}/outputs:
 *   get:
 *     summary: Get all research outputs for a project
 *     tags: [Research Outputs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of research outputs.
 */
router.get('/repositories/:id/outputs', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR', 'ASSISTANT', 'REVIEWER']), OutputController.getOutputs);

export default router;
