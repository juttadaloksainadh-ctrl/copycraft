/**
 * CopyCraft — Payment Receipt MongoDB Model
 * -------------------------------------------
 * Stores payment receipt data in MongoDB.
 * Each receipt is linked to an order and a customer.
 *
 * Used for: receipt history, refund tracking, payment audits.
 */

/**
 * Payment Receipt Schema Definition
 * (Used for validation and as reference for MongoDB collection structure)
 *
 * Collection: paymentReceipts
 *
 * {
 *   _id:            ObjectId (auto),
 *   receiptId:      String  — Unique receipt ID (e.g., "RCT-2026-1234")
 *   orderId:        String  — Reference to order ID
 *   customerId:     String  — Reference to user ID
 *   customerName:   String  — Snapshot of customer name at payment time
 *   customerEmail:  String  — Snapshot of customer email
 *   amount:         Number  — Total amount paid (in ₹)
 *   method:         String  — Payment method: 'UPI' | 'RAZORPAY_CARDS' | 'COD' | 'WALLET'
 *   transactionId:  String  — External transaction reference (UPI ref / Razorpay ID)
 *   status:         String  — 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED'
 *   receiptData: {
 *     items: [
 *       { fileName, pageCount, printMode, binding, cost }
 *     ],
 *     printCost:       Number,
 *     addonCost:       Number,
 *     deliveryFee:     Number,
 *     couponDiscount:  Number,
 *     gstAmount:       Number,
 *     finalPrice:      Number
 *   },
 *   createdAt:      Date,
 *   updatedAt:      Date
 * }
 */

import { getMongoCollection } from '../config/db.js';

/**
 * Create a new payment receipt in MongoDB.
 *
 * @param {object} receiptData - The receipt payload
 * @returns {Promise<object>} The inserted receipt with its _id
 */
export async function createPaymentReceipt(receiptData) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) {
    // Fallback: return the receipt data without persisting (demo mode)
    console.log('[PaymentReceipt] MongoDB not available — receipt not persisted');
    return { ...receiptData, _fallback: true };
  }

  const receipt = {
    receiptId: `RCT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    ...receiptData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await collection.insertOne(receipt);
  return { ...receipt, _id: result.insertedId };
}

/**
 * Get all payment receipts for a customer.
 *
 * @param {string} customerId - The customer's user ID
 * @returns {Promise<Array>} List of receipts sorted by most recent first
 */
export async function getReceiptsByCustomer(customerId) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) return [];

  return collection
    .find({ customerId })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Get a payment receipt by order ID.
 *
 * @param {string} orderId - The order ID
 * @returns {Promise<object|null>} The receipt or null
 */
export async function getReceiptByOrderId(orderId) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) return null;

  return collection.findOne({ orderId });
}

/**
 * Get a payment receipt by its receipt ID.
 *
 * @param {string} receiptId - The receipt ID (e.g., "RCT-2026-1234")
 * @returns {Promise<object|null>}
 */
export async function getReceiptById(receiptId) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) return null;

  return collection.findOne({ receiptId });
}

/**
 * Update receipt status (e.g., mark as REFUNDED).
 *
 * @param {string} receiptId - The receipt ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object|null>} The updated receipt
 */
export async function updateReceiptStatus(receiptId, updates) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) return null;

  const result = await collection.findOneAndUpdate(
    { receiptId },
    { $set: { ...updates, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  return result;
}
