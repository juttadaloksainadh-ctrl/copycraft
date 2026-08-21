/**
 * CopyCraft — Razorpay Service
 * ----------------------------------------------------
 * Handles Razorpay instance initialization, order creation,
 * and cryptographic HMAC-SHA256 signature verification.
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayInstance = null;

/**
 * Check if Razorpay keys are configured in environment variables.
 * @returns {boolean}
 */
export function isRazorpayConfigured() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(keyId && keySecret && keyId.trim() !== '' && keySecret.trim() !== '');
}

/**
 * Get public Razorpay Key ID (safe to expose to frontend).
 * @returns {string|null}
 */
export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.trim() : null;
}

/**
 * Get Razorpay SDK instance.
 * Returns null if credentials are not configured.
 * @returns {Razorpay|null}
 */
export function getRazorpayInstance() {
  if (!isRazorpayConfigured()) {
    return null;
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID.trim(),
      key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
    });
  }

  return razorpayInstance;
}

/**
 * Create a new Razorpay Order.
 * @param {Object} params
 * @param {number} params.amountInRupees - Order total amount in INR
 * @param {string} params.receipt - Internal receipt or order identifier
 * @param {Object} [params.notes] - Additional metadata/notes
 * @returns {Promise<Object>} Razorpay order object
 */
export async function createRazorpayOrder({ amountInRupees, receipt, notes = {} }) {
  const instance = getRazorpayInstance();
  if (!instance) {
    throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env');
  }

  // Convert INR amount to paise (smallest currency unit, e.g., ₹100.50 -> 10050 paise)
  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  if (amountInPaise <= 0) {
    throw new Error('Order amount must be greater than zero');
  }

  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: receipt || `rcpt_${Date.now()}`,
    notes: notes || {}
  };

  const order = await instance.orders.create(options);
  return order;
}

/**
 * Verify Razorpay payment signature using HMAC-SHA256.
 * Signature formula: HMAC_SHA256(order_id + "|" + payment_id, secret)
 * @param {Object} params
 * @param {string} params.orderId - Razorpay Order ID (e.g., order_DBJOWzybf0sJbb)
 * @param {string} params.paymentId - Razorpay Payment ID (e.g., pay_29QQoUBcxQtvjb)
 * @param {string} params.signature - Razorpay Signature returned by checkout
 * @returns {boolean} True if signature is valid, false otherwise
 */
export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay secret key is not configured for signature verification');
  }

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET.trim();
  const body = `${orderId}|${paymentId}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === signature;
}
