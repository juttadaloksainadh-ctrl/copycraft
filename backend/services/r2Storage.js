/**
 * CopyCraft — Cloudflare R2 Object Storage Service
 * --------------------------------------------------
 * Uses the S3-compatible @aws-sdk/client-s3 to interact with
 * Cloudflare R2 for storing customer print files (PDF, DOCX, PPTX, JPG, PNG).
 *
 * File key format: orders/<orderId>/<fileId>_<originalName>
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 configuration from environment
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'copycraft-files';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Track whether R2 is configured
let r2Configured = false;
let s3Client = null;

/**
 * Initialize the R2 client. Called once at startup.
 */
export function initR2() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.log('⚠️  Cloudflare R2 not configured — file uploads will use fallback (in-memory)');
    console.log('   → Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env');
    r2Configured = false;
    return false;
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  r2Configured = true;
  console.log('☁️  Cloudflare R2 Storage connected');
  console.log(`   → Bucket: ${R2_BUCKET_NAME}`);
  if (R2_PUBLIC_URL) {
    console.log(`   → Public URL: ${R2_PUBLIC_URL}`);
  }
  return true;
}

/**
 * Check if R2 is available and configured.
 */
export function isR2Configured() {
  return r2Configured && s3Client !== null;
}

/**
 * Upload a file buffer to Cloudflare R2.
 *
 * @param {Buffer} buffer - The file content buffer
 * @param {string} key - The storage key (path), e.g. "orders/ORD-123/file_001_notes.pdf"
 * @param {string} contentType - MIME type of the file
 * @param {object} metadata - Optional metadata to attach to the object
 * @returns {Promise<{key: string, url: string, size: number}>}
 */
export async function uploadFile(buffer, key, contentType, metadata = {}) {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured. Set R2 credentials in .env');
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      uploadedAt: new Date().toISOString(),
      ...metadata,
    },
  });

  await s3Client.send(command);

  const url = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL}/${key}`
    : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

  return {
    key,
    url,
    size: buffer.length,
  };
}

/**
 * Generate a pre-signed download URL for a file in R2.
 * The URL is valid for the specified duration (default: 1 hour).
 *
 * @param {string} key - The storage key of the file
 * @param {number} expiresIn - URL validity in seconds (default: 3600)
 * @returns {Promise<string>} Pre-signed URL
 */
export async function getDownloadUrl(key, expiresIn = 3600) {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured');
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return signedUrl;
}

/**
 * Delete a file from R2.
 *
 * @param {string} key - The storage key of the file to delete
 * @returns {Promise<boolean>}
 */
export async function deleteFile(key) {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  return true;
}

/**
 * List all files under a given prefix (e.g., all files for an order).
 *
 * @param {string} prefix - Key prefix, e.g. "orders/ORD-123/"
 * @param {number} maxKeys - Maximum number of results (default: 100)
 * @returns {Promise<Array<{key: string, size: number, lastModified: Date}>>}
 */
export async function listFiles(prefix, maxKeys = 100) {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured');
  }

  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);

  return (response.Contents || []).map(obj => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified,
  }));
}

/**
 * Check if a file exists in R2.
 *
 * @param {string} key - The storage key
 * @returns {Promise<boolean>}
 */
export async function fileExists(key) {
  if (!isR2Configured()) return false;

  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a standardized R2 key for an order file.
 *
 * @param {string} orderId - The order ID
 * @param {string} fileId - The file ID
 * @param {string} originalName - Original filename
 * @returns {string} R2 object key
 */
export function generateFileKey(orderId, fileId, originalName) {
  // Sanitize filename — keep only alphanumeric, dots, hyphens, underscores
  const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `orders/${orderId}/${fileId}_${sanitized}`;
}
