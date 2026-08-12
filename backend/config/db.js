/**
 * CopyCraft Database Configuration — Cloudflare R2 JSON Database
 * ---------------------------------------------------------------
 * Uses Cloudflare R2 Object Storage as the persistent database engine.
 * Reads data/app_database.json from R2 on startup, and syncs mutations back to R2.
 */

import { db as inMemoryDb } from '../models/dbStore.js';
import { isR2Configured, loadDatabaseFromR2, saveDatabaseToR2 } from '../services/r2Storage.js';

let isDatabaseInitialized = false;

/**
 * Initialize the Cloudflare R2 Database Store.
 * Call this once at server startup.
 */
export async function initDatabase() {
  console.log('☁️  Initializing Cloudflare R2 Database Engine...');

  if (!isR2Configured()) {
    console.log('📦 R2 Storage not connected — running in Local In-Memory Mode');
    isDatabaseInitialized = true;
    return { mode: 'memory', db: inMemoryDb };
  }

  try {
    const remoteData = await loadDatabaseFromR2();

    if (remoteData && typeof remoteData === 'object') {
      // Merge remote R2 JSON collections into inMemoryDb
      for (const [key, val] of Object.entries(remoteData)) {
        if (Array.isArray(val)) {
          inMemoryDb[key] = val;
        }
      }
      console.log('✅ Connected to Cloudflare R2 Database Store');
      console.log(`   → Loaded ${Object.keys(remoteData).length} collections from R2`);
    } else {
      console.log('📦 No existing R2 database found — seeding initial database & saving to R2...');
      await saveDatabaseToR2(inMemoryDb);
      console.log('✅ Initial database seeded into Cloudflare R2');
    }

    isDatabaseInitialized = true;
    return { mode: 'cloudflare_r2', db: inMemoryDb };
  } catch (err) {
    console.error('⚠️  Failed to load R2 database:', err.message);
    console.log('📦 Falling back to local in-memory store');
    isDatabaseInitialized = true;
    return { mode: 'memory', db: inMemoryDb };
  }
}

/**
 * Get the active database reference.
 */
export function getDb() {
  return { mode: 'cloudflare_r2', db: inMemoryDb };
}

/**
 * Get MongoDB collection (returns null since MongoDB is removed).
 */
export function getMongoCollection() {
  return null;
}

/**
 * MongoDB status check (always false now).
 */
export function isUsingMongo() {
  return false;
}

export async function closeDatabase() {
  console.log('🔌 Cloudflare R2 database session saved');
}
