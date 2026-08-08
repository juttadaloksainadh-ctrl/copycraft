import express from 'express';
import { analyzeDocument } from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/analyze', authenticateToken, analyzeDocument);

export default router;
