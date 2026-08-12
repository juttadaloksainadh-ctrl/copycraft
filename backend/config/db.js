/**
 * CopyCraft Database Configuration — MongoDB Atlas Engine
 * --------------------------------------------------------
 * Supports:
 *   1. MongoDB Atlas — Primary production database
 *   2. In-memory store (dbStore.js) — Graceful fallback if MongoDB is unreachable
 */

import dns from 'dns';
import { db as inMemoryDb } from '../models/dbStore.js';

// Force Node.js DNS to prefer IPv4 over IPv6 for MongoDB Atlas connection reliability
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

let isMongoConnected = false;
let mongoClient = null;
let mongoDb = null;

/**
 * Initialize the MongoDB database connection.
 * Call this once at server startup.
 */
export async function initDatabase() {
  const mongoUri = process.env.MONGODB_URI;

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

    await seedCollections(mongoDb);

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

async function seedCollections(db) {
  const collections = ['users', 'orders', 'colleges', 'coupons', 'notifications', 'auditLogs', 'supportTickets'];

  for (const collName of collections) {
    const collection = db.collection(collName);
    const count = await collection.countDocuments();

    if (count === 0 && inMemoryDb[collName] && inMemoryDb[collName].length > 0) {
      await collection.insertMany(inMemoryDb[collName]);
      console.log(`   → Seeded ${collName}: ${inMemoryDb[collName].length} records`);
    }
  }

  const receiptsCol = db.collection('paymentReceipts');
  await receiptsCol.createIndex({ customerId: 1 });
  await receiptsCol.createIndex({ orderId: 1 }, { unique: true, sparse: true });
  await receiptsCol.createIndex({ receiptId: 1 }, { unique: true });

  const profilesCol = db.collection('userProfiles');
  await profilesCol.createIndex({ userId: 1 }, { unique: true });

  // 14-Day TTL Index for Audit Logs (automatic database cleanup)
  const auditLogsCol = db.collection('auditLogs');
  // Ensure we have a timestamp index that expires docs after 14 days (14 * 24 * 3600 seconds)
  await auditLogsCol.createIndex({ timestamp: 1 }, { expireAfterSeconds: 1209600 });
  console.log('   → 14-day TTL Index created for auditLogs');

  // 7-Day TTL Index for Notifications
  const notificationsCol = db.collection('notifications');
  // Ensure we have a timestamp index that expires docs after 7 days (7 * 24 * 3600 seconds)
  await notificationsCol.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 });
  console.log('   → 7-day TTL Index created for notifications');
}
