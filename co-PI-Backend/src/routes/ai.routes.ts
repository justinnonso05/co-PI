import { Router } from 'express';
import multer from 'multer';
import { AiController } from '../controllers/ai.controller';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/dataset-review', authenticateJWT, upload.single('file'), AiController.datasetReview);
router.post('/literature-digest', authenticateJWT, upload.array('files', 3), AiController.literatureDigest);
router.get('/memory-lookup', authenticateJWT, AiController.memoryLookup);

export default router;
