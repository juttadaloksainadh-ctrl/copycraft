/**
 * CopyCraft — User Profile Model (Cloudflare R2 Persistent Engine)
 * -----------------------------------------------------------------
 * Extended user profile data stored in dbStore and synced to R2.
 */

import { db as dbStore, syncDbToR2 } from './dbStore.js';

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

if (!dbStore.userProfiles) {
  dbStore.userProfiles = [];
}

/**
 * Create a new user profile.
 */
export async function createUserProfile(userId, initialData = {}) {
  let profile = dbStore.userProfiles.find(p => p.userId === userId);

  if (!profile) {
    profile = {
      userId,
      avatarUrl: initialData.avatarUrl || '',
      preferences: { ...DEFAULT_PREFERENCES, ...(initialData.preferences || {}) },
      addresses: initialData.addresses || [],
      walletHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbStore.userProfiles.push(profile);
    syncDbToR2();
  }

  return profile;
}

/**
 * Get a user's extended profile by user ID.
 */
export async function getUserProfile(userId) {
  let profile = dbStore.userProfiles.find(p => p.userId === userId);
  if (!profile) {
    profile = await createUserProfile(userId);
  }
  return profile;
}

/**
 * Update a user's profile fields.
 */
export async function updateUserProfile(userId, updates) {
  let profile = await getUserProfile(userId);

  if (updates.avatarUrl !== undefined) profile.avatarUrl = updates.avatarUrl;
  if (updates.preferences) {
    profile.preferences = { ...profile.preferences, ...updates.preferences };
  }
  if (updates.addresses !== undefined) profile.addresses = updates.addresses;

  profile.updatedAt = new Date().toISOString();
  syncDbToR2();

  return profile;
}

/**
 * Add an address to the user's address list.
 */
export async function addUserAddress(userId, address) {
  const profile = await getUserProfile(userId);

  if (address.isDefault) {
    profile.addresses.forEach(a => { a.isDefault = false; });
  }

  profile.addresses.push({ id: `addr_${Date.now()}`, ...address });
  profile.updatedAt = new Date().toISOString();
  syncDbToR2();

  return profile;
}

/**
 * Add a wallet transaction to history.
 */
export async function addWalletTransaction(userId, type, amount, reason) {
  const profile = await getUserProfile(userId);

  const transaction = {
    id: `txn_${Date.now()}`,
    type,
    amount,
    reason,
    timestamp: new Date().toISOString(),
  };

  profile.walletHistory.unshift(transaction);
  profile.updatedAt = new Date().toISOString();
  syncDbToR2();

  return profile;
}
