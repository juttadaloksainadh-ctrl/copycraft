/**
 * CopyCraft — User Profile MongoDB Model
 * ----------------------------------------
 * Extended user profile data stored in MongoDB.
 * The base user record (id, email, passwordHash, role) lives in the main
 * users collection/store. This model stores rich profile extensions:
 * avatar, preferences, addresses, wallet history.
 *
 * Collection: userProfiles
 *
 * {
 *   _id:          ObjectId (auto),
 *   userId:       String  — Reference to user ID in users collection
 *   avatarUrl:    String  — URL to profile picture (stored in R2 or external)
 *   preferences: {
 *     theme:          String — 'light' | 'dark' | 'system'
 *     language:       String — 'en' | 'hi' | 'te' etc.
 *     defaultPrint: {
 *       printMode:    String — 'bw' | 'color'
 *       sideMode:     String — 'single' | 'double'
 *       paperSize:    String — 'A4' | 'A3' | 'Letter'
 *       binding:      String — 'none' | 'spiral' | 'softcover' | 'hardcover'
 *     }
 *   },
 *   addresses: [
 *     { label, hostel, room, landmark, isDefault }
 *   ],
 *   walletHistory: [
 *     { type: 'credit'|'debit', amount, reason, timestamp }
 *   ],
 *   createdAt:    Date,
 *   updatedAt:    Date
 * }
 */

import { getMongoCollection } from '../config/db.js';

/** Default preferences for new users */
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

/**
 * Create a new user profile in MongoDB.
 *
 * @param {string} userId - The user's ID from the users collection
 * @param {object} initialData - Optional initial profile data
 * @returns {Promise<object>} The created profile
 */
export async function createUserProfile(userId, initialData = {}) {
  const collection = getMongoCollection('userProfiles');
  if (!collection) {
    console.log('[UserProfile] MongoDB not available — profile not persisted');
    return { userId, ...DEFAULT_PREFERENCES, _fallback: true };
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

/**
 * Get a user's extended profile by user ID.
 *
 * @param {string} userId - The user ID
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(userId) {
  const collection = getMongoCollection('userProfiles');
  if (!collection) return null;

  return collection.findOne({ userId });
}

/**
 * Update a user's profile fields.
 *
 * @param {string} userId - The user ID
 * @param {object} updates - Fields to update (avatarUrl, preferences, addresses)
 * @returns {Promise<object|null>} The updated profile
 */
export async function updateUserProfile(userId, updates) {
  const collection = getMongoCollection('userProfiles');
  if (!collection) return null;

  // Build $set payload — supports nested preference updates
  const setPayload = { updatedAt: new Date() };

  if (updates.avatarUrl !== undefined) setPayload.avatarUrl = updates.avatarUrl;
  if (updates.preferences) {
    // Merge preferences instead of replacing
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

/**
 * Add an address to the user's address list.
 *
 * @param {string} userId - The user ID
 * @param {object} address - { label, hostel, room, landmark, isDefault }
 * @returns {Promise<object|null>}
 */
export async function addUserAddress(userId, address) {
  const collection = getMongoCollection('userProfiles');
  if (!collection) return null;

  // If isDefault, unset other defaults first
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

/**
 * Add a wallet transaction to history.
 *
 * @param {string} userId - The user ID
 * @param {string} type - 'credit' or 'debit'
 * @param {number} amount - Transaction amount
 * @param {string} reason - Description
 * @returns {Promise<object|null>}
 */
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
