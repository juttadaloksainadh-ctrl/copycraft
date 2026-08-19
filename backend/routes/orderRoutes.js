import express from 'express';
import {
  calculateQuote,
  getPricingRatesHandler,
  uploadAndAnalyzeFiles,
  createOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  getCollegesList,
  getActiveStaffList
} from '../controllers/orderController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/colleges', getCollegesList);
router.get('/pricing-rates', getPricingRatesHandler);
router.get('/staff/active', authenticateToken, getActiveStaffList);
router.post('/quote', calculateQuote);
router.post('/upload', authenticateToken, upload.array('files', 10), uploadAndAnalyzeFiles);
router.post('/create', authenticateToken, createOrder);
router.get('/my-orders', authenticateToken, getCustomerOrders);
router.get('/:id', authenticateToken, getOrderById);
router.post('/:id/cancel', authenticateToken, cancelOrder);

export default router;
