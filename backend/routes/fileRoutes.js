/**
 * CopyCraft — File Download/Delete Routes
 * -----------------------------------------
 * Handles file access from Cloudflare R2 storage.
 * Dealers download customer print files via pre-signed URLs.
 * Admins can delete files from R2.
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  isR2Configured,
  getDownloadUrl,
  deleteFile,
  listFiles,
  fileExists
} from '../services/r2Storage.js';
import { db } from '../models/dbStore.js';

const router = express.Router();

/**
 * GET /api/files/:orderId/:fileId/download
 * Generate a pre-signed R2 download URL for a specific file.
 * Accessible by: order's customer, assigned dealer, distributor, admin
 */
router.get('/:orderId/:fileId/download', authenticateToken, async (req, res) => {
  try {
    const { orderId, fileId } = req.params;

    // Find the order
    const order = db.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check
    const { role, id: userId } = req.user;
    const isCustomer = role === 'customer' && order.customerId === userId;
    const isDealer = role === 'dealer' && order.dealerId === userId;
    const isDistributor = role === 'distributor';
    const isAdmin = role === 'admin' || role === 'super_admin';

    if (!isCustomer && !isDealer && !isDistributor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You do not have permission to download this file' });
    }

    // Find the file in the order
    const file = order.files.find(f => f.id === fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found in this order' });
    }

    // Check if R2 is configured and file has an R2 key
    if (!isR2Configured() || !file.r2Key) {
      return res.status(400).json({
        success: false,
        message: 'File storage not available. R2 is not configured or file was not uploaded to cloud storage.'
      });
    }

    // Generate pre-signed URL (valid for 1 hour)
    const downloadUrl = await getDownloadUrl(file.r2Key, 3600);

    return res.json({
      success: true,
      downloadUrl,
      fileName: file.name,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('File download error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/files/:orderId
 * List all files for an order (metadata only, no download).
 */
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = db.orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check
    const { role, id: userId } = req.user;
    const isOwner = order.customerId === userId;
    const isStaff = ['dealer', 'distributor', 'admin', 'super_admin'].includes(role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // If R2 is configured, also list files from R2 for verification
    let r2Files = [];
    if (isR2Configured()) {
      try {
        r2Files = await listFiles(`orders/${orderId}/`);
      } catch {
        // R2 listing failed — not critical
      }
    }

    return res.json({
      success: true,
      files: order.files,
      r2Files,
      storageMode: isR2Configured() ? 'cloudflare_r2' : 'memory'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/files/:orderId/:fileId
 * Delete a file from R2 storage. Admin only.
 */
router.delete('/:orderId/:fileId', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete files from storage' });
    }

    const { orderId, fileId } = req.params;
    const order = db.orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const file = order.files.find(f => f.id === fileId);
    if (!file || !file.r2Key) {
      return res.status(404).json({ success: false, message: 'File not found or not stored in R2' });
    }

    if (!isR2Configured()) {
      return res.status(400).json({ success: false, message: 'R2 storage not configured' });
    }

    await deleteFile(file.r2Key);

    // Remove R2 references from the file record
    file.r2Key = null;
    file.r2Url = null;

    // Audit log
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      userId: req.user.id,
      userName: req.user.name,
      action: 'FILE_DELETE_R2',
      details: `Deleted file "${file.name}" from R2 for order ${orderId}`,
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true, message: `File "${file.name}" deleted from cloud storage` });
  } catch (error) {
    console.error('File delete error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
