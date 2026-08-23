/**
 * CopyCraft Database Configuration — MongoDB Atlas Engine
 * --------------------------------------------------------
 * Supports:
 *   1. MongoDB Atlas — Primary production database
 *   2. In-memory store (dbStore.js) + R2/Local JSON — Graceful fallback if MongoDB is unreachable
 */

import dns from 'dns';
import { db as inMemoryDb, syncDbToR2 } from '../models/dbStore.js';
import { applyPricingDefaults } from '../services/pricingService.js';

// Force Node.js DNS to prefer IPv4 over IPv6 for MongoDB Atlas connection reliability
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

let isMongoConnected = false;
let mongoClient = null;
let mongoDb = null;

/**
 * Sanitize MongoDB URI to strip extraneous brackets around passwords.
 */
function sanitizeMongoUri(rawUri) {
  if (!rawUri) return rawUri;
  // Replace <password> placeholder format if angle brackets were left in
  return rawUri.replace(/:\s*<([^>]+)>\s*@/, ':$1@');
}

/**
 * Initialize the MongoDB database connection.
 * Call this once at server startup.
 */
export async function initDatabase() {
  const rawUri = process.env.MONGODB_URI;
  const mongoUri = sanitizeMongoUri(rawUri);

  if (!mongoUri || mongoUri.trim() === '' || process.env.DB_MODE === 'memory') {
    console.log('📦 Database Mode: In-Memory Store (demo mode)');
    return { mode: 'memory', db: inMemoryDb };
  }

  try {
    const { MongoClient } = await import('mongodb');

    console.log('🔄 Connecting to MongoDB...');
    mongoClient = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      tls: true,
    });

    await mongoClient.connect();
    mongoDb = mongoClient.db(process.env.DB_NAME || 'copycraft_db');

    await mongoDb.command({ ping: 1 });
    isMongoConnected = true;

    console.log('✅ MongoDB Connected Successfully');
    console.log(`   → Database: ${mongoDb.databaseName}`);
    console.log(`   → Host: ${mongoUri.includes('@') ? mongoUri.split('@')[1].split('/')[0] : 'localhost'}`);

    await seedAndSyncCollections(mongoDb);

    return { mode: 'mongodb', db: mongoDb, client: mongoClient };
  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err.message);
    console.log('📦 Falling back to In-Memory Store (demo mode)');
    isMongoConnected = false;
    return { mode: 'memory', db: inMemoryDb };
  }
}

/**
 * Get the active database reference.
 */
export function getDb() {
  if (isMongoConnected && mongoDb) {
    return { mode: 'mongodb', db: mongoDb };
  }
  return { mode: 'memory', db: inMemoryDb };
}

/**
 * Get a specific MongoDB collection by name.
 */
export function getMongoCollection(collectionName) {
  if (isMongoConnected && mongoDb) {
    return mongoDb.collection(collectionName);
  }
  return null;
}

/**
 * Check if MongoDB is currently active.
 */
export function isUsingMongo() {
  return isMongoConnected;
}

/**
 * Close MongoDB connection gracefully.
 */
export async function closeDatabase() {
  if (mongoClient) {
    await mongoClient.close();
    console.log('🔌 MongoDB connection closed');
  }
}

async function seedAndSyncCollections(db) {
  const collections = ['users', 'orders', 'colleges', 'coupons', 'notifications', 'auditLogs', 'supportTickets'];

  for (const collName of collections) {
    const collection = db.collection(collName);
    const count = await collection.countDocuments();

    if (count === 0 && inMemoryDb[collName] && inMemoryDb[collName].length > 0) {
      // Seed initial data if MongoDB collection is completely empty
      await collection.insertMany(inMemoryDb[collName]);
      console.log(`   → Seeded ${collName}: ${inMemoryDb[collName].length} records`);
    } else {
      // Sync from MongoDB to in-memory store so memory references are always up to date
      const docs = await collection.find({}).toArray();
      // Remove MongoDB _id field when updating memory array
      inMemoryDb[collName] = docs.map(({ _id, ...doc }) => doc);
      console.log(`   → Loaded ${collName} from MongoDB: ${docs.length} records`);
    }
  }

  // Load persistent system settings (e.g., admin pricing matrix)
  try {
    const settingsCol = db.collection('system_settings');
    const pricingDoc = await settingsCol.findOne({ key: 'pricing_defaults' });
    if (pricingDoc && pricingDoc.rates) {
      applyPricingDefaults(pricingDoc.rates);
      inMemoryDb.pricingDefaults = pricingDoc.rates;
      console.log('   → Loaded custom Admin Pricing Rates from MongoDB');
    }
  } catch (err) {
    console.warn('   ⚠️ Failed to load system settings from MongoDB:', err.message);
  }

  const receiptsCol = db.collection('paymentReceipts');
  await receiptsCol.createIndex({ customerId: 1 });
  await receiptsCol.createIndex({ orderId: 1 }, { unique: true, sparse: true });
  await receiptsCol.createIndex({ receiptId: 1 }, { unique: true });

  const profilesCol = db.collection('userProfiles');
  await profilesCol.createIndex({ userId: 1 }, { unique: true });

  // 14-Day TTL Index for Audit Logs (automatic database cleanup)
  const auditLogsCol = db.collection('auditLogs');
  await auditLogsCol.createIndex({ timestamp: 1 }, { expireAfterSeconds: 1209600 });

  // 7-Day TTL Index for Notifications
  const notificationsCol = db.collection('notifications');
  await notificationsCol.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 });
}
