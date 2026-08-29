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

const router = express.Router();

// Public / Customer routes
router.get('/items', getStationeryItems);
router.post('/orders', authenticateToken, createStationeryOrder);

// Dealer routes
router.post('/items', authenticateToken, createStationeryItem);
router.put('/items/:id', authenticateToken, updateStationeryItem);
router.delete('/items/:id', authenticateToken, deleteStationeryItem);
router.get('/dealer/orders', authenticateToken, getDealerStationeryOrders);
router.put('/dealer/orders/:id/status', authenticateToken, updateStationeryOrderStatus);

export default router;
