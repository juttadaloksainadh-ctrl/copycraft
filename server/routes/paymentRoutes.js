/**
 * CopyCraft — Payment Receipt Routes
 * ------------------------------------
 * CRUD routes for payment receipts stored in MongoDB.
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getReceiptsByCustomer,
  getReceiptByOrderId,
  getReceiptById
} from '../models/paymentReceipt.js';

const router = express.Router();

/**
 * GET /api/payments/receipts
 * Get all payment receipts for the authenticated user.
 */
router.get('/receipts', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    let receipts;
    if (role === 'admin' || role === 'super_admin') {
      // Admins can see all receipts — but still use customer filter if provided
      const customerId = req.query.customerId || null;
      if (customerId) {
        receipts = await getReceiptsByCustomer(customerId);
      } else {
        // For admin without filter, return empty (they should specify a customer)
        receipts = await getReceiptsByCustomer(userId);
      }
    } else {
      receipts = await getReceiptsByCustomer(userId);
    }

    return res.json({
      success: true,
      receipts: receipts || [],
      count: (receipts || []).length
    });
  } catch (error) {
    console.error('Get receipts error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/payments/receipts/order/:orderId
 * Get the payment receipt for a specific order.
 */
router.get('/receipts/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const receipt = await getReceiptByOrderId(orderId);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found for this order' });
    }

    // Security check: customers can only view their own receipts
    if (req.user.role === 'customer' && receipt.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, receipt });
  } catch (error) {
    console.error('Get receipt error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/payments/receipts/:receiptId
 * Get a specific receipt by its receipt ID.
 */
router.get('/receipts/:receiptId', authenticateToken, async (req, res) => {
  try {
    const { receiptId } = req.params;
    const receipt = await getReceiptById(receiptId);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    // Security check
    if (req.user.role === 'customer' && receipt.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, receipt });
  } catch (error) {
    console.error('Get receipt error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
