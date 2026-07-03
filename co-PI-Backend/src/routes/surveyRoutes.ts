import { Router } from 'express';
import { SurveyController } from '../controllers/SurveyController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Surveys
 *   description: Dynamic forms and responses
 */

/**
 * @swagger
 * /api/projects/{id}/surveys:
 *   post:
 *     summary: Define a new survey form
 *     tags: [Surveys]
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
 *               - title
 *               - schemaJson
 *             properties:
 *               title:
 *                 type: string
 *               schemaJson:
 *                 type: object
 *     responses:
 *       201:
 *         description: Survey defined successfully.
 */
router.post('/projects/:id/surveys', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR']), SurveyController.createSurvey);

/**
 * @swagger
 * /api/projects/{id}/surveys:
 *   get:
 *     summary: Get all surveys for a project
 *     tags: [Surveys]
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
 *         description: A list of surveys.
 */
router.get('/projects/:id/surveys', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR', 'ASSISTANT', 'REVIEWER']), SurveyController.getSurveys);

/**
 * @swagger
 * /api/surveys/{surveyId}:
 *   get:
 *     summary: Fetch a survey schema publically
 *     tags: [Surveys]
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Survey schema details.
 *       404:
 *         description: Not found.
 */
router.get('/surveys/:surveyId', SurveyController.getSurvey);

/**
 * @swagger
 * /api/surveys/{surveyId}/responses:
 *   post:
 *     summary: Submit a response to a survey
 *     tags: [Surveys]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: surveyId
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
 *               - answers
 *             properties:
 *               answers:
 *                 type: object
 *                 description: The JSON answers matching the survey schema.
 *     responses:
 *       201:
 *         description: Response submitted.
 */
router.post('/surveys/:surveyId/responses', SurveyController.submitResponse);

/**
 * @swagger
 * /api/surveys/{surveyId}/responses:
 *   get:
 *     summary: Fetch all responses for a survey
 *     tags: [Surveys]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of responses.
 */
router.get('/surveys/:surveyId/responses', authenticateJWT, SurveyController.getResponses);

export default router;
