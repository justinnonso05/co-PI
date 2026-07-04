import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Operations related to managing collaborative documents
 */

/**
 * @swagger
 * /api/projects/{id}/documents:
 *   post:
 *     summary: Create a new blank document in a project
 *     tags: [Documents]
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
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the document
 *     responses:
 *       201:
 *         description: Document created successfully.
 *       400:
 *         description: Bad Request.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.post('/repositories/:id/documents', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR', 'ASSISTANT']), DocumentController.createDocument);

/**
 * @swagger
 * /api/projects/{id}/documents:
 *   get:
 *     summary: Get all documents for a project
 *     tags: [Documents]
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
 *         description: A list of documents belonging to the project.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get('/repositories/:id/documents', authenticateJWT, requireRole(['PI', 'CO_INVESTIGATOR', 'ASSISTANT', 'REVIEWER']), DocumentController.getDocuments);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     summary: Get a specific document by ID, including its content
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID
 *     responses:
 *       200:
 *         description: Full document object.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Document not found.
 */
router.get('/documents/:documentId', authenticateJWT, DocumentController.getDocumentById);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   put:
 *     summary: Save the document content to the database
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: object
 *                 description: The JSON state or text of the document
 *     responses:
 *       200:
 *         description: Document saved successfully.
 *       400:
 *         description: Bad Request.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Document not found.
 */
router.put('/documents/:documentId', authenticateJWT, DocumentController.saveDocument);

export default router;
