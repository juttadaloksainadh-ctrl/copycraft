/**
 * CopyCraft — Delivered Order File Cleanup Service
 * --------------------------------------------------
 * Automatically deletes print files from Cloudflare R2 48 hours
 * after an order is marked as DELIVERED.
 *
 * How it works:
 *  - Runs a sweep every hour on server startup via setInterval.
 *  - Finds all DELIVERED orders where deliveredAt is > 48 hours ago.
 *  - Deletes all associated R2 file objects under orders/<orderId>/.
 *  - Marks orders with filesDeletedAt so they aren't scanned again.
 */

import { db } from '../models/dbStore.js';
import { isR2Configured, listFiles, deleteFile } from './r2Storage.js';

const DELETION_DELAY_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;       // Run sweep every hour

/**
 * Run a single sweep: find all DELIVERED orders past the 48-hour mark
 * and delete their R2 files.
 */
export async function runDeliveredFileCleanup() {
  if (!isR2Configured()) {
    return;
  }

  const now = Date.now();
  let totalDeleted = 0;
  let ordersProcessed = 0;

  for (const order of db.orders) {
    // Skip if not delivered or already cleaned up
    if (order.orderStatus !== 'DELIVERED') continue;
    if (order.filesDeletedAt) continue;

    // deliveredAt is stamped by the distributor's PIN verification
    if (!order.deliveredAt) continue;

    const deliveredAt = new Date(order.deliveredAt).getTime();
    const elapsed = now - deliveredAt;

    if (elapsed < DELETION_DELAY_MS) {
      // Not yet 48 hours — skip
      continue;
    }

    // 48 hours have passed — delete all R2 files for this order
    try {
      const prefix = `orders/${order.id}/`;
      const files = await listFiles(prefix, 200);

      if (files.length > 0) {
        for (const file of files) {
          await deleteFile(file.key);
          totalDeleted++;
          console.log(`   🗑️  Deleted R2 file: ${file.key}`);
        }
        console.log(`✅ Cleanup: Deleted ${files.length} file(s) for order ${order.id} (delivered ${Math.round(elapsed / 3600000)}h ago)`);
      }

      // Mark order so it isn't re-scanned
      order.filesDeletedAt = new Date().toISOString();
      order.filesDeletedCount = files.length;
      ordersProcessed++;
    } catch (err) {
      console.error(`⚠️ Cleanup error for order ${order.id}:`, err.message);
    }
  }

  if (ordersProcessed > 0) {
    console.log(`🗑️  File Cleanup Complete: ${totalDeleted} file(s) removed across ${ordersProcessed} delivered order(s).`);
  }
}

/**
 * Start the background cleanup scheduler.
 * Call this once at server startup.
 * Runs immediately on boot, then every hour thereafter.
 */
export function startFileCleanupScheduler() {
  console.log(`⏰ File Cleanup Scheduler started — deletes R2 files 48h after delivery (scans every hour)`);

  // Run immediately on startup to catch any orders that were overdue
  runDeliveredFileCleanup().catch(err => {
    console.error('⚠️ Initial file cleanup scan failed:', err.message);
  });

  // Then run every hour
  setInterval(() => {
    runDeliveredFileCleanup().catch(err => {
      console.error('⚠️ Scheduled file cleanup scan failed:', err.message);
    });
  }, SWEEP_INTERVAL_MS);
}
