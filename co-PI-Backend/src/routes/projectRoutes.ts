import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';
import { ApplicationController } from '../controllers/ApplicationController';
import { ChatController } from '../controllers/ChatController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Operations related to managing projects and members
 */

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created successfully. The creator is assigned as PI.
 *       400:
 *         description: Bad Request. Title and description missing.
 *       401:
 *         description: Unauthorized. Invalid JWT token.
 */
router.post('/', authenticateJWT, ProjectController.createProject);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects for the authenticated user
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of projects the user is a member of.
 *       401:
 *         description: Unauthorized.
 */
router.get('/', authenticateJWT, ProjectController.getProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project details by ID
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The project ID
 *     responses:
 *       200:
 *         description: Project details including members and tasks.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. You are not a member of this project.
 *       404:
 *         description: Project not found.
 */
router.get('/:id', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR', 'ASSISTANT', 'REVIEWER']), ProjectController.getProjectById);

/**
 * @swagger
 * /api/projects/{id}/members:
 *   post:
 *     summary: Add a new member to the project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetUserId
 *               - role
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 description: The ID of the user being added
 *               role:
 *                 type: string
 *                 enum: [PI, CO_INVESTIGATOR, ASSISTANT, REVIEWER]
 *     responses:
 *       201:
 *         description: Member added successfully.
 *       400:
 *         description: Bad Request.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Only a PI can add members.
 *       409:
 *         description: Conflict. User is already a member.
 */
router.post('/:id/members', authenticateJWT, requireRole(['PI']), ProjectController.addMember);

router.patch('/:id/status', authenticateJWT, requireRole(['PI', 'REVIEWER']), ProjectController.updateStatus);
router.patch('/:id/visibility', authenticateJWT, requireRole(['PI']), ProjectController.updateVisibility);

/**
 * @swagger
 * /api/projects/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       403:
 *         description: Forbidden. Only the PI can remove members.
 */
router.delete('/:id/members/:userId', authenticateJWT, requireRole(['PI']), ProjectController.removeMember);

/** GET /api/projects/:id/applications — list pending applicants (PI only) */
router.get('/:id/applications', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR']), ApplicationController.listApplications);

// Chat
router.get('/:id/chat', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR', 'ASSISTANT', 'REVIEWER']), ChatController.getChatHistory);

export default router;
