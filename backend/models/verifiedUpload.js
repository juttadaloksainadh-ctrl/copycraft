/**
 * CopyCraft — Verified Upload Record Model
 * ------------------------------------------
 * Persistently stores verified direct-upload records binding:
 *   - Authenticated userId
 *   - Server-generated unique fileId
 *   - Generated Cloudflare R2 object key (r2Key)
 *   - Original fileName and verified fileSize
 *   - Extracted pageCount (counted locally via PDF.js prior to R2 upload)
 *
 * Persistence Strategy (survives restarts and deployments):
 *   1. MongoDB Atlas (collection `verifiedUploads`) when MongoDB is active
 *   2. Cloudflare R2 (`data/app_database.json`) via syncDbToR2()
 *   3. Local persistent JSON store (`backend/data/verified_uploads.json`) fallback
 *   4. Fast in-memory cache in dbStore for sub-millisecond retrieval
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMongoCollection, isUsingMongo } from '../config/db.js';
import { db, syncDbToR2 } from './dbStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const LOCAL_PERSIST_FILE = path.join(DATA_DIR, 'verified_uploads.json');

// Ensure dbStore has verifiedUploads array
if (!Array.isArray(db.verifiedUploads)) {
  db.verifiedUploads = [];
}

// Load local persistent file on module initialization if present
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(LOCAL_PERSIST_FILE)) {
    const raw = fs.readFileSync(LOCAL_PERSIST_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with in-memory store without duplicates
      for (const item of parsed) {
        if (!db.verifiedUploads.some(u => u.fileId === item.fileId && u.userId === item.userId)) {
          db.verifiedUploads.push(item);
        }
      }
    }
  }
} catch (err) {
  console.warn('⚠️  Could not load local verified uploads store:', err.message);
}

function persistToLocalFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_PERSIST_FILE, JSON.stringify(db.verifiedUploads, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️  Failed to persist verified uploads to local file:', err.message);
  }
}

/**
 * Save or update a verified upload record.
 * Writes across MongoDB, R2 sync, local JSON file, and memory.
 *
 * @param {object} record
 * @returns {Promise<object>} The stored record
 */
export async function saveVerifiedUpload(record) {
  const {
    userId,
    fileId,
    r2Key,
    fileName,
    fileSize,
    mimeType,
    pageCount
  } = record;

  if (!userId || !fileId || !r2Key || pageCount === undefined || pageCount === null) {
    throw new Error('Missing required fields for verified upload record (userId, fileId, r2Key, pageCount)');
  }

  const normalizedRecord = {
    id: fileId,
    fileId,
    userId,
    r2Key,
    fileName: String(fileName || 'document'),
    fileSize: Number(fileSize || 0),
    mimeType: String(mimeType || 'application/octet-stream'),
    pageCount: Number(pageCount),
    verifiedAt: record.verifiedAt || new Date().toISOString()
  };

  // 1. Update in-memory array (upsert)
  const existingIdx = db.verifiedUploads.findIndex(
    u => u.userId === userId && u.fileId === fileId && u.r2Key === r2Key
  );
  if (existingIdx >= 0) {
    db.verifiedUploads[existingIdx] = normalizedRecord;
  } else {
    db.verifiedUploads.unshift(normalizedRecord);
  }

  // 2. Persist to local JSON file for Node process restart survival
  persistToLocalFile();

  // 3. Persist to Cloudflare R2 application database
  syncDbToR2();

  // 4. Persist to MongoDB Atlas if connected
  if (isUsingMongo()) {
    try {
      const col = getMongoCollection('verifiedUploads');
      if (col) {
        await col.updateOne(
          { userId, fileId, r2Key },
          { $set: normalizedRecord },
          { upsert: true }
        );
      }
    } catch (mongoErr) {
      console.warn('⚠️  Failed to save verified upload to MongoDB:', mongoErr.message);
    }
  }

  return normalizedRecord;
}

/**
 * Retrieve a verified upload record by userId, fileId, and r2Key.
 * Checks MongoDB first, then in-memory and local disk fallback.
 *
 * @param {string} userId
 * @param {string} fileId
 * @param {string} r2Key
 * @returns {Promise<object|null>}
 */
export async function getVerifiedUpload(userId, fileId, r2Key) {
  if (!userId || (!fileId && !r2Key)) return null;

  // 1. Check MongoDB Atlas if active
  if (isUsingMongo()) {
    try {
      const col = getMongoCollection('verifiedUploads');
      if (col) {
        const query = { userId };
        if (fileId && r2Key) {
          query.$or = [
            { fileId, r2Key },
            { id: fileId, r2Key }
          ];
        } else if (fileId) {
          query.$or = [{ fileId }, { id: fileId }];
        } else if (r2Key) {
          query.r2Key = r2Key;
        }

        const foundMongo = await col.findOne(query);
        if (foundMongo) {
          const { _id, ...clean } = foundMongo;
          return clean;
        }
      }
    } catch (mongoErr) {
      console.warn('⚠️  MongoDB verified upload lookup error:', mongoErr.message);
    }
  }

  // 2. Check in-memory store
  const foundMem = db.verifiedUploads.find(u => {
    if (u.userId !== userId) return false;
    if (r2Key && u.r2Key !== r2Key) return false;
    if (fileId && (u.fileId !== fileId && u.id !== fileId)) return false;
    return true;
  });

  if (foundMem) return foundMem;

  // 3. Check local JSON file if in-memory was somehow cleared
  try {
    if (fs.existsSync(LOCAL_PERSIST_FILE)) {
      const raw = fs.readFileSync(LOCAL_PERSIST_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const foundDisk = list.find(u => {
          if (u.userId !== userId) return false;
          if (r2Key && u.r2Key !== r2Key) return false;
          if (fileId && (u.fileId !== fileId && u.id !== fileId)) return false;
          return true;
        });
        if (foundDisk) {
          // Re-populate in-memory cache
          db.verifiedUploads.unshift(foundDisk);
          return foundDisk;
        }
      }
    }
  } catch (_) {}

  return null;
}

