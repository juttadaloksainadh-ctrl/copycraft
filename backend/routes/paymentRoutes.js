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

import {
  isRazorpayConfigured,
  getRazorpayKeyId,
  createRazorpayOrder,
  verifyRazorpaySignature
} from '../services/razorpayService.js';
import { calculateOrderAggregateQuote, createOrderRecord } from '../controllers/orderController.js';

const router = express.Router();

/**
 * GET /api/payments/razorpay/config
 * Returns public Razorpay key ID and configuration status.
 */
router.get('/razorpay/config', authenticateToken, (req, res) => {
  const isConfigured = isRazorpayConfigured();
  const keyId = getRazorpayKeyId();

  return res.json({
    success: true,
    isConfigured,
    keyId: isConfigured ? keyId : null,
    currency: 'INR',
    message: isConfigured
      ? 'Razorpay gateway is active and configured'
      : 'Razorpay keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) not set in backend/.env'
  });
});

/**
 * POST /api/payments/razorpay/create-order
 * Creates an official Razorpay order with amount computed from files & discounts.
 */
router.post('/razorpay/create-order', authenticateToken, async (req, res) => {
  try {
    const { files, couponCode = null, referralDiscount = 0 } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one document file is required to calculate quote' });
    }

    if (!isRazorpayConfigured()) {
      return res.status(400).json({
        success: false,
        isConfigured: false,
        message: 'Razorpay gateway is not configured yet. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env'
      });
    }

    // Compute exact backend price breakdown
    const aggregateQuote = calculateOrderAggregateQuote(files, couponCode, referralDiscount);
    const amountInRupees = aggregateQuote.finalPrice;

    if (amountInRupees <= 0) {
      return res.status(400).json({ success: false, message: 'Order amount must be greater than zero' });
    }

    const tempReceiptId = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const rzpOrder = await createRazorpayOrder({
      amountInRupees,
      receipt: tempReceiptId,
      notes: {
        userId: req.user.id,
        userEmail: req.user.email,
        collegeId: req.user.collegeId || '',
        fileCount: String(files.length)
      }
    });

    return res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      keyId: getRazorpayKeyId(),
      breakdown: aggregateQuote
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create Razorpay order'
    });
  }
});

/**
 * POST /api/payments/razorpay/verify
 * Verifies HMAC-SHA256 signature and records verified order and payment receipt in DB.
 */
router.post('/razorpay/verify', authenticateToken, async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderData
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay payment verification parameters'
      });
    }

    if (!orderData || !orderData.files || orderData.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order data with document files is required'
      });
    }

    // Verify cryptographic signature
    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    if (!isValid) {
      console.warn(`⚠️ Fraud alert / Invalid Razorpay signature for user ${req.user.id}`);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid transaction signature'
      });
    }

    // Create the confirmed order in the database
    const { order, receipt } = await createOrderRecord({
      user: req.user,
      orderData: {
        ...orderData,
        paymentMethod: 'ONLINE_UPI'
      },
      paymentInfo: {
        gateway: 'RAZORPAY',
        paymentStatus: 'PAID',
        transactionId: razorpayPaymentId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Payment verified and order placed successfully!',
      order,
      receipt
    });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Payment verification processing failed'
    });
  }
});

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
