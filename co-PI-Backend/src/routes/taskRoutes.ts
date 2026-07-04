import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Operations related to managing tasks within projects
 */

/**
 * @swagger
 * /api/projects/{id}/tasks:
 *   post:
 *     summary: Create a new task in a project
 *     tags: [Tasks]
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
 *               - title
 *               - dueDate
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the task
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Due date for the task
 *               assignedUserId:
 *                 type: string
 *                 description: (Optional) ID of the user assigned to this task
 *     responses:
 *       201:
 *         description: Task created successfully.
 *       400:
 *         description: Bad Request.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Only PIs and Co-Investigators can create tasks.
 */
router.post('/repositories/:id/tasks', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR']), TaskController.createTask);

/**
 * @swagger
 * /api/projects/{id}/tasks:
 *   get:
 *     summary: Get all tasks for a project
 *     tags: [Tasks]
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
 *         description: A list of tasks belonging to the project.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. You are not a member of this project.
 */
router.get('/repositories/:id/tasks', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR', 'ASSISTANT', 'REVIEWER']), TaskController.getTasks);

/**
 * @swagger
 * /api/tasks/{taskId}/status:
 *   put:
 *     summary: Update the completion status of a task
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: The task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isCompleted
 *             properties:
 *               isCompleted:
 *                 type: boolean
 *                 description: The new completion status
 *     responses:
 *       200:
 *         description: Task status updated successfully.
 *       400:
 *         description: Bad Request.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. You are not a member of the project.
 *       404:
 *         description: Task not found.
 */
router.put('/tasks/:taskId/status', authenticateJWT, TaskController.updateTaskStatus);

export default router;
