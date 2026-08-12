/**
 * CopyCraft — Payment Receipt Model (MongoDB + Fallback)
 * --------------------------------------------------------
 * Stores payment receipt data in MongoDB collection `paymentReceipts`.
 */

import { getMongoCollection } from '../config/db.js';
import { db as dbStore } from './dbStore.js';

export async function createPaymentReceipt(receiptData) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) {
    const receipt = {
      receiptId: `RCT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      ...receiptData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _fallback: true
    };
    dbStore.paymentReceipts?.unshift(receipt);
    return receipt;
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

export async function getReceiptsByCustomer(customerId) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) {
    return dbStore.paymentReceipts?.filter(r => r.customerId === customerId) || [];
  }

  return collection.find({ customerId }).sort({ createdAt: -1 }).toArray();
}

export async function getReceiptByOrderId(orderId) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) {
    return dbStore.paymentReceipts?.find(r => r.orderId === orderId) || null;
  }

  return collection.findOne({ orderId });
}

export async function getReceiptById(receiptId) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) {
    return dbStore.paymentReceipts?.find(r => r.receiptId === receiptId) || null;
  }

  return collection.findOne({ receiptId });
}

export async function updateReceiptStatus(receiptId, updates) {
  const collection = getMongoCollection('paymentReceipts');
  if (!collection) {
    const receipt = dbStore.paymentReceipts?.find(r => r.receiptId === receiptId);
    if (receipt) Object.assign(receipt, updates, { updatedAt: new Date().toISOString() });
    return receipt;
  }

  const result = await collection.findOneAndUpdate(
    { receiptId },
    { $set: { ...updates, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  return result;
}
