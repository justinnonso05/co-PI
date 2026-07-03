import { Router } from 'express';
import { UploadController } from '../controllers/UploadController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { upload } from '../config/cloudinary';

const router = Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file to Cloudinary
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload (PDF, JPG, PNG, CSV, DOCX)
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 fileUrl:
 *                   type: string
 *       400:
 *         description: No file provided
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateJWT, upload.single('file'), UploadController.uploadFile);

export default router;
