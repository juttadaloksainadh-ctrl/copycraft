import express from 'express';
import {
  getAdminAnalytics,
  getAllUsers,
  createCoupon,
  getCoupons,
  updatePricingDefaults,
  getAuditLogs,
  createStaffAccount,
  deleteStaffAccount,
  createCollege,
  updateCollege,
  deleteCollege
} from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin', 'super_admin']));

router.get('/analytics', getAdminAnalytics);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteStaffAccount);
router.post('/staff', createStaffAccount);
router.delete('/staff/:id', deleteStaffAccount);
router.post('/colleges', createCollege);
router.put('/colleges/:id', updateCollege);
router.delete('/colleges/:id', deleteCollege);
router.post('/coupons', createCoupon);
router.get('/coupons', getCoupons);
router.put('/pricing', updatePricingDefaults);
router.get('/audit-logs', getAuditLogs);

export default router;
