/**
 * CopyCraft — Delivered Order & File Auto-Purge Service
 * -----------------------------------------------------
 * Automatically deletes print files (R2 + local disk) and permanently
 * removes order records 48 hours after an order is marked DELIVERED.
 *
 * Workflow:
 *  - Runs a sweep on server startup and every 15 minutes thereafter.
 *  - Finds all DELIVERED orders where deliveredAt timestamp is >= 48 hours ago.
 *  - Deletes all associated R2 cloud files and local upload files.
 *  - Permanently removes the order document from MongoDB and in-memory storage.
 */

import fs from 'fs';
import { db } from '../models/dbStore.js';
import { isR2Configured, listFiles, deleteFile } from './r2Storage.js';
import { isUsingMongo, getMongoCollection } from '../config/db.js';

const DELETION_DELAY_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;       // Run sweep every 15 minutes

/**
 * Run a single sweep: find all DELIVERED orders past the 48-hour mark,
 * delete their files from storage, and remove the order from the database.
 */
export async function runDeliveredFileCleanup() {
  const now = Date.now();
  let totalDeletedFiles = 0;
  let ordersDeleted = 0;

  let deliveredOrders = [];

  // 1. Fetch delivered orders from MongoDB if enabled
  if (isUsingMongo()) {
    try {
      const ordersCol = getMongoCollection('orders');
      if (ordersCol) {
        const mongoOrders = await ordersCol.find({ orderStatus: 'DELIVERED' }).toArray();
        deliveredOrders = mongoOrders;
      }
    } catch (err) {
      console.error('⚠️ Mongo delivered orders query error:', err.message);
    }
  }

  // 2. Combine with in-memory db.orders
  const memOrders = db.orders.filter(o => o.orderStatus === 'DELIVERED');
  for (const mo of memOrders) {
    if (!deliveredOrders.some(o => o.id === mo.id)) {
      deliveredOrders.push(mo);
    }
  }

  for (const order of deliveredOrders) {
    if (!order.deliveredAt) continue;

    const deliveredAtTime = new Date(order.deliveredAt).getTime();
    const elapsed = now - deliveredAtTime;

    if (elapsed < DELETION_DELAY_MS) {
      // Not yet 48 hours post-delivery — skip
      continue;
    }

    // 48 hours have passed — proceed with deleting files and purging order record
    try {
      // A. Delete Cloudflare R2 files
      if (isR2Configured()) {
        try {
          const prefix = `orders/${order.id}/`;
          const r2Files = await listFiles(prefix, 200);
          for (const file of r2Files) {
            await deleteFile(file.key);
            totalDeletedFiles++;
            console.log(`   🗑️  Deleted R2 cloud file: ${file.key}`);
          }
        } catch (r2Err) {
          console.error(`⚠️ R2 deletion error for order ${order.id}:`, r2Err.message);
        }
      }

      // B. Delete local disk files if present
      if (order.files && Array.isArray(order.files)) {
        for (const file of order.files) {
          if (file.path && fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
              totalDeletedFiles++;
              console.log(`   🗑️  Deleted local disk file: ${file.path}`);
            } catch (_) {}
          }
        }
      }

      // C. Delete order document from MongoDB
      if (isUsingMongo()) {
        try {
          const ordersCol = getMongoCollection('orders');
          if (ordersCol) {
            await ordersCol.deleteOne({ id: order.id });
            console.log(`   🗑️  Purged order #${order.id} from MongoDB database`);
          }
        } catch (mongoErr) {
          console.error(`⚠️ MongoDB order delete error for order ${order.id}:`, mongoErr.message);
        }
      }

      // D. Remove order record from in-memory db.orders
      const index = db.orders.findIndex(o => o.id === order.id);
      if (index !== -1) {
        db.orders.splice(index, 1);
        console.log(`   🗑️  Removed order #${order.id} from in-memory store`);
      }

      // E. Log system audit log
      db.auditLogs.unshift({
        id: `log_${Date.now()}`,
        userId: 'SYSTEM_CLEANUP',
        userName: 'Auto File Cleanup Service',
        action: 'ORDER_PURGED_48H_POST_DELIVERY',
        details: `Automatically deleted order #${order.id} and all print files 48 hours after delivery.`,
        timestamp: new Date().toISOString()
      });

      ordersDeleted++;
      console.log(`✅ Auto-Purge Complete for Order #${order.id} (delivered ${Math.round(elapsed / 3600000)} hours ago)`);
    } catch (err) {
      console.error(`⚠️ Auto-purge error for order #${order.id}:`, err.message);
    }
  }

  if (ordersDeleted > 0) {
    console.log(`🗑️  48-Hour Cleanup Sweep Finished: ${ordersDeleted} order(s) and ${totalDeletedFiles} file(s) permanently deleted.`);
  }
}

/**
 * Start the background cleanup scheduler.
 * Call this once at server startup.
 * Runs immediately on boot, then every 15 minutes thereafter.
 */
export function startFileCleanupScheduler() {
  console.log(`⏰ 48-Hour Auto-Purge Scheduler started — automatically deletes files and order records 48 hours after delivery (scans every 15 min)`);

  // Run immediately on startup to catch any orders that were overdue
  runDeliveredFileCleanup().catch(err => {
    console.error('⚠️ Initial file cleanup scan failed:', err.message);
  });

  // Then run every 15 minutes
  setInterval(() => {
    runDeliveredFileCleanup().catch(err => {
      console.error('⚠️ Scheduled file cleanup scan failed:', err.message);
    });
  }, SWEEP_INTERVAL_MS);
}
