/**
 * CopyCraft Database Configuration
 * ---------------------------------
 * Supports both:
 *   1. In-memory store (dbStore.js) — for development/demo mode
 *   2. MongoDB connection — for production
 *
 * Controlled by MONGODB_URI in .env
 * If MONGODB_URI is set and not empty, MongoDB is used.
 * Otherwise, falls back to in-memory dbStore.
 */

import dns from 'dns';
import { db as inMemoryDb } from '../models/dbStore.js';

// Force Node.js DNS to prefer IPv4 over IPv6 for MongoDB Atlas connection reliability
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

// Database state
let isMongoConnected = false;
let mongoClient = null;
let mongoDb = null;

/**
 * Initialize the database connection.
 * Call this once at server startup.
 */
export async function initDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  // If no URI or explicitly set to in-memory mode
  if (!mongoUri || mongoUri.trim() === '' || process.env.DB_MODE === 'memory') {
    console.log('📦 Database Mode: In-Memory Store (demo mode)');
    console.log('   → Data will reset on server restart');
    console.log('   → Set MONGODB_URI in .env to connect to MongoDB');
    return { mode: 'memory', db: inMemoryDb };
  }

  // Attempt MongoDB connection
  try {
    // Dynamic import so mongodb isn't required for in-memory mode
    const { MongoClient } = await import('mongodb');

    // TLS is required by MongoDB Atlas (mongodb+srv) but unsupported by a
    // plain local/self-hosted mongod unless it was started with certificates.
    const useTls = process.env.MONGODB_TLS
      ? process.env.MONGODB_TLS === 'true'
      : mongoUri.startsWith('mongodb+srv://');

    console.log(`🔄 Connecting to MongoDB (TLS: ${useTls ? 'on' : 'off'})...`);
    mongoClient = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      tls: useTls,
    });

    await mongoClient.connect();
    mongoDb = mongoClient.db(process.env.DB_NAME || 'copycraft_db');

    // Verify connection with a ping
    await mongoDb.command({ ping: 1 });
    isMongoConnected = true;

    console.log('✅ MongoDB Connected Successfully');
    console.log(`   → Database: ${mongoDb.databaseName}`);
    console.log(`   → Host: ${mongoUri.includes('@') ? mongoUri.split('@')[1].split('/')[0] : 'localhost'}`);

    // Seed default collections if empty
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
 * Returns either the MongoDB database or the in-memory store.
 */
export function getDb() {
  if (isMongoConnected && mongoDb) {
    return { mode: 'mongodb', db: mongoDb };
  }
  return { mode: 'memory', db: inMemoryDb };
}

/**
 * Get a specific MongoDB collection by name.
 * Returns null if MongoDB is not connected (allows graceful fallback).
 *
 * @param {string} collectionName - The collection name
 * @returns {import('mongodb').Collection|null}
 */
export function getMongoCollection(collectionName) {
  if (isMongoConnected && mongoDb) {
    return mongoDb.collection(collectionName);
  }
  return null;
}

/**
 * Check if MongoDB is the active database.
 */
export function isUsingMongo() {
  return isMongoConnected;
}

/**
 * Graceful shutdown — close MongoDB connection.
 */
export async function closeDatabase() {
  if (mongoClient) {
    await mongoClient.close();
    console.log('🔌 MongoDB connection closed');
  }
}

/**
 * Seed MongoDB collections with default data if they are empty.
 * Also creates indexes for performance-critical collections.
 * This ensures the app works immediately after first MongoDB setup.
 */
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

  // Create indexes for paymentReceipts collection
  const receiptsCol = db.collection('paymentReceipts');
  await receiptsCol.createIndex({ customerId: 1 });
  await receiptsCol.createIndex({ orderId: 1 }, { unique: true, sparse: true });
  await receiptsCol.createIndex({ receiptId: 1 }, { unique: true });
  console.log('   → Indexes created for paymentReceipts');

  // Create indexes for userProfiles collection
  const profilesCol = db.collection('userProfiles');
  await profilesCol.createIndex({ userId: 1 }, { unique: true });
  console.log('   → Indexes created for userProfiles');
}
