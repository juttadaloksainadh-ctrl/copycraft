/**
 * CopyCraft — Payment Receipt Model (Cloudflare R2 Persistent Engine)
 * ---------------------------------------------------------------------
 * Stores payment receipt data in dbStore and synced to R2.
 */

import { db as dbStore, syncDbToR2 } from './dbStore.js';

if (!dbStore.paymentReceipts) {
  dbStore.paymentReceipts = [];
}

/**
 * Create a new payment receipt.
 */
export async function createPaymentReceipt(receiptData) {
  const receipt = {
    receiptId: `RCT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    ...receiptData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbStore.paymentReceipts.unshift(receipt);
  syncDbToR2();

  return receipt;
}

/**
 * Get all payment receipts for a customer.
 */
export async function getReceiptsByCustomer(customerId) {
  return dbStore.paymentReceipts.filter(r => r.customerId === customerId);
}

/**
 * Get a payment receipt by order ID.
 */
export async function getReceiptByOrderId(orderId) {
  return dbStore.paymentReceipts.find(r => r.orderId === orderId) || null;
}

/**
 * Get a payment receipt by its receipt ID.
 */
export async function getReceiptById(receiptId) {
  return dbStore.paymentReceipts.find(r => r.receiptId === receiptId) || null;
}

/**
 * Update receipt status (e.g., mark as REFUNDED).
 */
export async function updateReceiptStatus(receiptId, updates) {
  const receipt = await getReceiptById(receiptId);
  if (!receipt) return null;

  Object.assign(receipt, updates, { updatedAt: new Date().toISOString() });
  syncDbToR2();

  return receipt;
}
