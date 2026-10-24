import express from 'express';
import {
  getStationeryItems,
  createStationeryItem,
  updateStationeryItem,
  deleteStationeryItem,
  createStationeryOrder,
  getDealerStationeryOrders,
  updateStationeryOrderStatus
} from '../controllers/stationeryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Public / Customer routes
router.get('/items', getStationeryItems);
router.post('/orders', authenticateToken, createStationeryOrder);

// Dealer routes
router.post('/items', authenticateToken, requireRole(['dealer', 'stationery_dealer', 'admin', 'super_admin']), createStationeryItem);
router.put('/items/:id', authenticateToken, requireRole(['dealer', 'stationery_dealer', 'admin', 'super_admin']), updateStationeryItem);
router.delete('/items/:id', authenticateToken, requireRole(['dealer', 'stationery_dealer', 'admin', 'super_admin']), deleteStationeryItem);
router.get('/dealer/orders', authenticateToken, requireRole(['dealer', 'stationery_dealer', 'admin', 'super_admin']), getDealerStationeryOrders);
router.put('/dealer/orders/:id/status', authenticateToken, requireRole(['dealer', 'stationery_dealer', 'admin', 'super_admin']), updateStationeryOrderStatus);

export default router;

