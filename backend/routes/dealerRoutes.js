import express from 'express';
import {
  getDealerQueue,
  updateOrderStatus,
  updateInventoryItem
} from '../controllers/dealerController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['dealer', 'admin', 'super_admin']));

router.get('/queue', getDealerQueue);
router.put('/orders/:id/status', updateOrderStatus);
router.put('/inventory/:id', updateInventoryItem);

export default router;
