import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { generateToken, verifyToken } from '../config/jwt.js';
import { extractFileMetadata } from '../services/pdfService.js';
import { analyzeDocumentAI } from '../services/aiService.js';
import {
  isR2Configured,
  getDownloadUrl,
  deleteFile,
  listFiles,
  fileExists,
  getUploadPresignedUrl,
  getObjectMetadata,
  getObjectBuffer,
  generateUploadKey,
  getR2Url
} from '../services/r2Storage.js';
import { db } from '../models/dbStore.js';

const router = express.Router();

const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx|ppt|pptx|jpg|jpeg|png|webp)$/i;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/octet-stream',
]);

const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50) * 1024 * 1024;

/**
 * POST /api/files/presign-upload
 * Generate secure presigned PUT URLs for direct browser-to-R2 file uploads.
 * Enforces authenticated user binding, unique server fileIds, allowed file formats, and max size.
 */
export const presignUploadHandler = async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one file descriptor is required' });
    }

    if (files.length > 10) {
      return res.status(400).json({ success: false, message: 'Maximum 10 files allowed per upload batch' });
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rawName = String(file.fileName || file.name || '').trim();

      if (!rawName) {
        return res.status(400).json({ success: false, message: `File at index ${i} is missing fileName` });
      }

      // Security check: reject directory traversal attempts
      if (rawName.includes('..') || rawName.includes('/') || rawName.includes('\\')) {
        return res.status(400).json({ success: false, message: `Invalid filename format for "${rawName}"` });
      }

      // Validate extension
      if (!rawName.match(ALLOWED_EXTENSIONS)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported file type for "${rawName}". Allowed formats: PDF, DOCX, PPTX, JPG, PNG, WEBP.`
        });
      }

      // Validate declared size
      const declaredSize = Number(file.fileSize || file.size || 0);
      if (declaredSize > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          message: `File "${rawName}" exceeds the maximum allowed size of 50MB.`
        });
      }
    }

    // Graceful fallback when Cloudflare R2 is not configured
    if (!isR2Configured()) {
      return res.json({
        success: true,
        directUploadSupported: false,
        storageMode: 'memory',
        message: 'Cloudflare R2 is not configured. Use multipart POST /api/orders/upload instead.',
      });
    }

    const userId = req.user?.id || 'unknown';
    const presignedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rawName = String(file.fileName || file.name || '').trim();
      const declaredSize = Number(file.fileSize || file.size || 0);

      // Resolve and sanitize MIME type
      let mimeType = String(file.mimeType || file.type || '').toLowerCase();
      if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
        const ext = rawName.split('.').pop().toLowerCase();
        const mimeMap = {
          pdf: 'application/pdf',
          doc: 'application/msword',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ppt: 'application/vnd.ms-powerpoint',
          pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp'
        };
        mimeType = mimeMap[ext] || 'application/octet-stream';
      }

      // Generate server-controlled, cryptographically random fileId
      const fileId = `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Strict server-generated R2 key incorporating userId and fileId
      const r2Key = generateUploadKey(userId, fileId, rawName);

      // Issue pre-signed PUT upload URL valid for 15 minutes (900 seconds)
      const presigned = await getUploadPresignedUrl(r2Key, mimeType, {
        uploadedBy: userId,
        fileId,
        originalName: rawName
      }, 900);

      // Issue signed upload token binding user, fileId, key, and filename
      const uploadToken = generateToken({
        userId,
        fileId,
        r2Key,
        fileName: rawName,
        mimeType
      }, '15m');

      presignedFiles.push({
        fileId,
        fileName: rawName,
        mimeType,
        fileSize: declaredSize,
        r2Key,
        uploadUrl: presigned.uploadUrl,
        method: 'PUT',
        headers: presigned.headers,
        uploadToken,
        expiresIn: 900
      });
    }

    return res.json({
      success: true,
      directUploadSupported: true,
      storageMode: 'cloudflare_r2',
      files: presignedFiles
    });
  } catch (error) {
    console.error('Presign upload error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate upload URL' });
  }
};

/**
 * POST /api/files/verify-upload
 * Verify completed direct uploads to R2:
 * 1. Validates user-file binding to prevent object key forgery
 * 2. Verifies actual file size in R2 against 50MB limit
 * 3. Extracts verified PDF page count and runs AI analysis
 * 4. Returns canonical file objects compatible with order creation
 */
export const verifyUploadHandler = async (req, res) => {
  try {
    if (!isR2Configured()) {
      return res.status(400).json({
        success: false,
        message: 'Cloudflare R2 is not configured in this environment.'
      });
    }

    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No uploaded files provided for verification' });
    }

    if (files.length > 10) {
      return res.status(400).json({ success: false, message: 'Maximum 10 files allowed per verification batch' });
    }

    const userId = req.user?.id || 'unknown';
    const processedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = String(file.fileId || file.id || '').trim();
      const rawName = String(file.fileName || file.name || '').trim();
      const r2Key = String(file.r2Key || '').trim();
      const uploadToken = file.uploadToken;

      if (!fileId || !r2Key || !rawName) {
        return res.status(400).json({
          success: false,
          message: `File at index ${i} is missing required fields (fileId, fileName, or r2Key)`
        });
      }

      // Security Check 1: Key format & Path traversal prevention
      if (r2Key.includes('..') || r2Key.includes('\\') || rawName.includes('..')) {
        return res.status(400).json({
          success: false,
          message: `Illegal path characters detected in key: "${r2Key}"`
        });
      }

      // Security Check 2: Strict user and file ID prefix binding
      const expectedPrefix = `orders/uploads/${userId}/${fileId}_`;
      if (!r2Key.startsWith(expectedPrefix)) {
        return res.status(403).json({
          success: false,
          message: `Unauthorized R2 object key: Key does not belong to the authenticated user and file ID session.`
        });
      }

      // Security Check 3: Cryptographic upload token verification if provided
      if (uploadToken) {
        const decoded = verifyToken(uploadToken);
        if (!decoded || decoded.userId !== userId || decoded.fileId !== fileId || decoded.r2Key !== r2Key) {
          return res.status(403).json({
            success: false,
            message: `Upload token validation failed: token is expired, forged, or mismatched.`
          });
        }
      }

      // Security Check 4: Inspect actual object metadata in R2 via HeadObjectCommand
      let objectMeta;
      try {
        objectMeta = await getObjectMetadata(r2Key);
      } catch (headErr) {
        return res.status(404).json({
          success: false,
          message: `File "${rawName}" was not found in storage. Upload may have failed or timed out.`
        });
      }

      const actualSize = objectMeta.contentLength;

      // Size verification
      if (actualSize <= 0) {
        return res.status(400).json({
          success: false,
          message: `Uploaded file "${rawName}" is empty (0 bytes).`
        });
      }

      if (actualSize > MAX_FILE_SIZE_BYTES) {
        // Immediately purge oversized object from R2 to save space and enforce limit
        try {
          await deleteFile(r2Key);
        } catch (_) {}
        return res.status(400).json({
          success: false,
          message: `File "${rawName}" size (${Math.round(actualSize / 1024 / 1024)}MB) exceeds the maximum allowed limit of 50MB.`
        });
      }

      // Security Check 5: Check embedded S3 metadata if present
      const embeddedMetadata = objectMeta.metadata || {};
      if (embeddedMetadata.uploadedby && embeddedMetadata.uploadedby !== userId) {
        return res.status(403).json({
          success: false,
          message: `Security violation: Object uploadedBy tag does not match current user session.`
        });
      }
      if (embeddedMetadata.fileid && embeddedMetadata.fileid !== fileId) {
        return res.status(403).json({
          success: false,
          message: `Security violation: Object fileId tag does not match current file ID.`
        });
      }

      // Process file metadata & page count
      const ext = rawName.split('.').pop().toLowerCase();
      const mimeType = file.mimeType || objectMeta.contentType || 'application/octet-stream';
      let pageCount = 1;

      if (ext === 'pdf') {
        try {
          const fileBuffer = await getObjectBuffer(r2Key);
          const metaResult = await extractFileMetadata(fileBuffer, rawName, mimeType);
          pageCount = metaResult.pageCount || 1;
        } catch (pdfErr) {
          console.warn(`PDF parsing fallback for ${rawName}:`, pdfErr.message);
          const metaResult = await extractFileMetadata(null, rawName, mimeType);
          pageCount = metaResult.pageCount || 1;
        }
      } else {
        const metaResult = await extractFileMetadata(null, rawName, mimeType);
        pageCount = metaResult.pageCount || 1;
      }

      // AI Document Intelligence Analysis
      const aiAnalysis = analyzeDocumentAI(rawName, actualSize, pageCount);

      processedFiles.push({
        id: fileId,
        name: rawName,
        size: actualSize,
        mimeType,
        pageCount,
        printMode: 'bw',
        sideMode: pageCount >= 4 ? 'double' : 'single',
        paperSize: 'A4',
        binding: 'none',
        lamination: 'none',
        coverSheet: 'none',
        r2Key,
        r2Url: getR2Url(r2Key),
        ai: aiAnalysis
      });
    }

    return res.json({
      success: true,
      message: 'Direct upload files verified and analyzed successfully',
      files: processedFiles,
      storageMode: 'cloudflare_r2'
    });
  } catch (error) {
    console.error('Verify upload error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to verify uploaded files' });
  }
};

router.post('/presign-upload', authenticateToken, presignUploadHandler);
router.post('/verify-upload', authenticateToken, verifyUploadHandler);

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
    const { role, id: userId, collegeId: userCollegeId, collegeIds: userCollegeIds = [] } = req.user;
    const allUserCollegeIds = Array.isArray(userCollegeIds) && userCollegeIds.length > 0 ? userCollegeIds : (userCollegeId ? [userCollegeId] : []);
    const isCustomer = role === 'customer' && order.customerId === userId;
    const isDealer = role === 'dealer' && (order.dealerId === userId || allUserCollegeIds.includes(order.collegeId) || !order.dealerId);
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

    // If R2 is configured and file has an R2 key, generate pre-signed URL (valid for 1 hour)
    if (isR2Configured() && file.r2Key) {
      try {
        const downloadUrl = await getDownloadUrl(file.r2Key, 3600);
        return res.json({
          success: true,
          downloadUrl,
          fileName: file.name,
          expiresIn: 3600
        });
      } catch (r2Err) {
        console.warn('R2 presigned URL generation failed, falling back:', r2Err.message);
      }
    }

    // Fallback: If direct R2 URL exists or fallback data URI
    const fallbackDownloadUrl = file.r2Url || `data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==`;

    return res.json({
      success: true,
      downloadUrl: fallbackDownloadUrl,
      fileName: file.name,
      expiresIn: 3600,
      note: 'Direct download link'
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
