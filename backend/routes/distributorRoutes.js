import express from 'express';
import { getDistributorDashboard, assignDealerToOrder } from '../controllers/distributorController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['distributor', 'admin', 'super_admin']));

router.get('/dashboard', getDistributorDashboard);
router.post('/assign-dealer', assignDealerToOrder);

export default router;
