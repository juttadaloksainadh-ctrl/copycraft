/**
 * CopyCraft — User Profile Model (MongoDB + Fallback)
 * ----------------------------------------------------
 * Extended user profile data stored in MongoDB collection `userProfiles`.
 */

import { getMongoCollection } from '../config/db.js';
import { db as dbStore } from './dbStore.js';

const DEFAULT_PREFERENCES = {
  theme: 'system',
  language: 'en',
  defaultPrint: {
    printMode: 'bw',
    sideMode: 'double',
    paperSize: 'A4',
    binding: 'none',
  },
};

export async function createUserProfile(userId, initialData = {}) {
  const collection = getMongoCollection('userProfiles');
  if (!collection) {
    let profile = dbStore.userProfiles?.find(p => p.userId === userId);
    if (!profile) {
      profile = { userId, ...DEFAULT_PREFERENCES, _fallback: true };
      dbStore.userProfiles?.push(profile);
    }
    return profile;
  }

  const profile = {
    userId,
    avatarUrl: initialData.avatarUrl || '',
    preferences: { ...DEFAULT_PREFERENCES, ...(initialData.preferences || {}) },
    addresses: initialData.addresses || [],
    walletHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await collection.insertOne(profile);
  return { ...profile, _id: result.insertedId };
}

export async function getUserProfile(userId) {
  const collection = getMongoCollection('userProfiles');
  if (!collection) {
    return dbStore.userProfiles?.find(p => p.userId === userId) || null;
  }

  return collection.findOne({ userId });
}

export async function updateUserProfile(userId, updates) {
  const collection = getMongoCollection('userProfiles');
  if (!collection) {
    let profile = dbStore.userProfiles?.find(p => p.userId === userId);
    if (profile) {
      if (updates.avatarUrl !== undefined) profile.avatarUrl = updates.avatarUrl;
      if (updates.preferences) profile.preferences = { ...profile.preferences, ...updates.preferences };
      if (updates.addresses !== undefined) profile.addresses = updates.addresses;
    }
    return profile;
  }

  const setPayload = { updatedAt: new Date() };
  if (updates.avatarUrl !== undefined) setPayload.avatarUrl = updates.avatarUrl;
  if (updates.preferences) {
    for (const [key, value] of Object.entries(updates.preferences)) {
      setPayload[`preferences.${key}`] = value;
    }
  }
  if (updates.addresses !== undefined) setPayload.addresses = updates.addresses;

  const result = await collection.findOneAndUpdate(
    { userId },
    { $set: setPayload },
    { returnDocument: 'after', upsert: true }
  );

  return result;
}

export async function addUserAddress(userId, address) {
  const collection = getMongoCollection('userProfiles');
  if (!collection) return null;

  if (address.isDefault) {
    await collection.updateOne(
      { userId },
      { $set: { 'addresses.$[].isDefault': false } }
    );
  }

  const result = await collection.findOneAndUpdate(
    { userId },
    {
      $push: { addresses: { id: `addr_${Date.now()}`, ...address } },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after', upsert: true }
  );

  return result;
}

export async function addWalletTransaction(userId, type, amount, reason) {
  const collection = getMongoCollection('userProfiles');
  if (!collection) return null;

  const transaction = {
    id: `txn_${Date.now()}`,
    type,
    amount,
    reason,
    timestamp: new Date(),
  };

  const result = await collection.findOneAndUpdate(
    { userId },
    {
      $push: { walletHistory: { $each: [transaction], $position: 0 } },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after' }
  );

  return result;
}
