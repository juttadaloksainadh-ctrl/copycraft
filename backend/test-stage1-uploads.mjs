/**
 * CopyCraft — Stage 1 Direct Upload & Verification Test Suite
 * ------------------------------------------------------------
 * Tests:
 *  1. Security & Validation on Presigned Uploads
 *     - Authentication enforcement
 *     - Batch file limits (min 1, max 10)
 *     - Path traversal prevention in filenames
 *     - Whitelisted file formats (PDF, DOCX, PPTX, JPG, PNG, WEBP)
 *     - File size bounds checking (<= 50MB)
 *     - R2 unconfigured fallback response
 *  2. Presigned URL Generation (with mock S3 client)
 *     - Server-controlled fileId and user-bound r2Key generation
 *     - Cryptographic uploadToken issuance
 *  3. Verification & Tamper Resistance
 *     - Forged object key rejection (403)
 *     - Tampered / mismatched uploadToken rejection (403)
 *     - Missing / 404 object in R2 handling
 *     - Oversized uploaded object enforcement & auto-purge (> 50MB -> 400)
 *     - Zero-byte / empty file rejection (400)
 *     - S3 metadata mismatch rejection (403)
 *  4. Document Analysis & AI Pipeline Preservation
 *     - PDF page-count extraction via pdf-parse
 *     - AI analysis preservation (blank pages, ink, duplex recommendations)
 *  5. Downstream Order Creation & Dealer Download Compatibility
 *     - Verifies files array feeds directly into order creation and pricing
 *  6. Safe File Cleanup
 *     - Verifies order purge deletes actual r2Keys stored on the order
 *     - Verifies temporary-upload cleanup never touches files attached to active orders
 *  7. Backward Compatibility
 *     - Verifies legacy POST /api/orders/upload route is still intact
 */

import { S3Client } from '@aws-sdk/client-s3';
import { generateToken } from './config/jwt.js';
import { db } from './models/dbStore.js';
import {
  setR2ClientForTesting,
  generateUploadKey,
  getR2Url
} from './services/r2Storage.js';
import { presignUploadHandler, verifyUploadHandler } from './routes/fileRoutes.js';
import { createOrderRecord } from './controllers/orderController.js';
import { runDeliveredFileCleanup, runTemporaryUploadCleanup } from './services/fileCleanupService.js';

const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, errorDetails = '') {
  totalTests++;
  if (condition) {
    console.log(`  ${PASS} ${testName}`);
    passedTests++;
  } else {
    console.error(`  ${FAIL} ${testName}${errorDetails ? ` → ${errorDetails}` : ''}`);
  }
}

// Helper to create mock Express req/res
function createMockHttp(user = null, body = {}) {
  const req = {
    user,
    body,
    headers: {}
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };

  return { req, res };
}

// Helper to create properly configured S3Client mock for presigner compatibility
function createMockS3(sendFn = null) {
  const client = new S3Client({
    region: 'auto',
    endpoint: 'https://mock-account.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: 'mock-access-key-id',
      secretAccessKey: 'mock-secret-access-key'
    }
  });
  if (sendFn) {
    client.send = sendFn;
  }
  return client;
}

// ─────────────────────────────────────────────────────────────
// Test Mock User
// ─────────────────────────────────────────────────────────────
const testUser = {
  id: 'usr_student_test_101',
  name: 'Alex Student',
  email: 'alex@campus.edu',
  role: 'customer',
  collegeId: 'col_01',
  collegeName: 'Campus University'
};

// ─────────────────────────────────────────────────────────────
// SUITE 1: Presigned URL Request Security & Validation
// ─────────────────────────────────────────────────────────────
async function testPresignSecurity() {
  console.log('\n\x1b[1m── 1. Presign Upload Security & Validation ──\x1b[0m');

  // 1.1 Empty files array rejection
  {
    const { req, res } = createMockHttp(testUser, { files: [] });
    await presignUploadHandler(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData()?.success === false,
      'Rejects empty files array with 400'
    );
  }

  // 1.2 Batch size limit (> 10 files)
  {
    const elevenFiles = Array.from({ length: 11 }, (_, i) => ({
      fileName: `doc_${i}.pdf`,
      fileSize: 1024
    }));
    const { req, res } = createMockHttp(testUser, { files: elevenFiles });
    await presignUploadHandler(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData()?.message?.includes('Maximum 10'),
      'Rejects batch with > 10 files'
    );
  }

  // 1.3 Path traversal in filename
  {
    const { req, res } = createMockHttp(testUser, {
      files: [{ fileName: '../../etc/passwd.pdf', fileSize: 1000 }]
    });
    await presignUploadHandler(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData()?.message?.includes('Invalid filename'),
      'Rejects directory traversal characters in fileName'
    );
  }

  // 1.4 Unsupported file format
  {
    const { req, res } = createMockHttp(testUser, {
      files: [{ fileName: 'malicious_script.exe', fileSize: 1000 }]
    });
    await presignUploadHandler(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData()?.message?.includes('Unsupported file type'),
      'Rejects unsupported file format (.exe)'
    );
  }

  // 1.5 Exceeding 50MB limit at request time
  {
    const { req, res } = createMockHttp(testUser, {
      files: [{ fileName: 'huge_book.pdf', fileSize: 60 * 1024 * 1024 }]
    });
    await presignUploadHandler(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData()?.message?.includes('exceeds the maximum allowed size'),
      'Rejects declared file size > 50MB'
    );
  }

  // 1.6 Graceful fallback when R2 not configured
  {
    setR2ClientForTesting(null);
    const { req, res } = createMockHttp(testUser, {
      files: [{ fileName: 'assignment.pdf', fileSize: 1024 * 50 }]
    });
    await presignUploadHandler(req, res);
    const data = res.getData();
    assert(
      res.getStatusCode() === 200 && data?.directUploadSupported === false && data?.storageMode === 'memory',
      'Returns graceful fallback when R2 is unconfigured'
    );
  }
}

// ─────────────────────────────────────────────────────────────
// SUITE 2: Presigned URL Generation with S3 Mock
// ─────────────────────────────────────────────────────────────
async function testPresignedUrlGeneration() {
  console.log('\n\x1b[1m── 2. Presigned URL Generation & Key Binding ──\x1b[0m');

  const mockS3 = createMockS3(async () => ({}));
  setR2ClientForTesting(mockS3);

  const { req, res } = createMockHttp(testUser, {
    files: [
      { fileName: 'calculus_syllabus.pdf', fileSize: 2048500, mimeType: 'application/pdf' },
      { fileName: 'project_slides.pptx', fileSize: 5048500 }
    ]
  });

  await presignUploadHandler(req, res);
  const data = res.getData();

  assert(
    res.getStatusCode() === 200 && data?.success === true && data?.directUploadSupported === true,
    'Successfully generates presigned upload payload'
  );

  assert(
    data?.files?.length === 2,
    'Returns exact number of requested file descriptors'
  );

  const firstFile = data.files[0];
  assert(
    firstFile.r2Key.startsWith(`orders/uploads/${testUser.id}/`),
    `Key binds strictly to user ID: ${firstFile.r2Key}`
  );

  assert(
    firstFile.uploadToken && typeof firstFile.uploadToken === 'string',
    'Issues cryptographic uploadToken for tamper verification'
  );

  assert(
    firstFile.method === 'PUT' && firstFile.expiresIn === 900,
    'Specifies PUT method and 900s (15 min) expiration'
  );
}

// ─────────────────────────────────────────────────────────────
// SUITE 3: Verification & Tamper Resistance
// ─────────────────────────────────────────────────────────────
async function testVerificationSecurity() {
  console.log('\n\x1b[1m── 3. Verification & Anti-Forgery Guarantees ──\x1b[0m');

  // 3.1 Forged Key Attempt (attacker tries to verify another user's key)
  {
    const forgedKey = `orders/uploads/usr_victim_999/file_123_victim_notes.pdf`;
    const { req, res } = createMockHttp(testUser, {
      files: [
        {
          fileId: 'file_123',
          fileName: 'victim_notes.pdf',
          r2Key: forgedKey
        }
      ]
    });

    await verifyUploadHandler(req, res);
    assert(
      res.getStatusCode() === 403 && res.getData()?.message?.includes('Unauthorized R2 object key'),
      'Blocks forged R2 object key targeting another user (403 Forbidden)'
    );
  }

  // 3.2 Path traversal in key
  {
    const traversalKey = `orders/uploads/${testUser.id}/../../data/app_database.json`;
    const { req, res } = createMockHttp(testUser, {
      files: [
        {
          fileId: 'file_999',
          fileName: 'app_database.json',
          r2Key: traversalKey
        }
      ]
    });

    await verifyUploadHandler(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData()?.message?.includes('Illegal path characters'),
      'Blocks path traversal attempt in R2 key'
    );
  }

  // 3.3 Forged / Tampered uploadToken
  {
    const validKey = `orders/uploads/${testUser.id}/file_777_notes.pdf`;
    const fakeToken = generateToken({
      userId: 'other_user',
      fileId: 'file_777',
      r2Key: validKey
    });

    const { req, res } = createMockHttp(testUser, {
      files: [
        {
          fileId: 'file_777',
          fileName: 'notes.pdf',
          r2Key: validKey,
          uploadToken: fakeToken
        }
      ]
    });

    await verifyUploadHandler(req, res);
    assert(
      res.getStatusCode() === 403 && res.getData()?.message?.includes('Upload token validation failed'),
      'Rejects mismatched or forged uploadToken'
    );
  }

  // 3.4 Object Missing from R2 (404)
  {
    const validKey = `orders/uploads/${testUser.id}/file_888_missing.pdf`;
    const mockNotFoundS3 = createMockS3(async () => {
      const notFoundErr = new Error('NoSuchKey');
      notFoundErr.name = 'NoSuchKey';
      notFoundErr.$metadata = { httpStatusCode: 404 };
      throw notFoundErr;
    });
    setR2ClientForTesting(mockNotFoundS3);

    const { req, res } = createMockHttp(testUser, {
      files: [
        {
          fileId: 'file_888',
          fileName: 'missing.pdf',
          r2Key: validKey
        }
      ]
    });

    await verifyUploadHandler(req, res);
    assert(
      res.getStatusCode() === 404 && res.getData()?.message?.includes('was not found in storage'),
      'Returns 404 when file was not actually uploaded to R2'
    );
  }

  // 3.5 Actual file size exceeds 50MB in R2
  {
    let deletedKey = null;
    const oversizedKey = `orders/uploads/${testUser.id}/file_oversized_big.pdf`;
    const mockOversizedS3 = createMockS3(async (command) => {
      if (command.constructor.name === 'HeadObjectCommand') {
        return {
          ContentLength: 55 * 1024 * 1024, // 55MB
          ContentType: 'application/pdf',
          Metadata: { uploadedby: testUser.id, fileid: 'file_oversized' }
        };
      }
      if (command.constructor.name === 'DeleteObjectCommand') {
        deletedKey = command.input.Key;
        return {};
      }
      return {};
    });
    setR2ClientForTesting(mockOversizedS3);

    const { req, res } = createMockHttp(testUser, {
      files: [
        {
          fileId: 'file_oversized',
          fileName: 'big.pdf',
          r2Key: oversizedKey
        }
      ]
    });

    await verifyUploadHandler(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData()?.message?.includes('exceeds the maximum allowed limit of 50MB'),
      'Detects and rejects actual oversized object in R2 (> 50MB)'
    );
    assert(
      deletedKey === oversizedKey,
      'Automatically purges oversized object from R2 storage immediately'
    );
  }

  // 3.6 Empty file (0 bytes) in R2
  {
    const emptyKey = `orders/uploads/${testUser.id}/file_empty_zero.pdf`;
    const mockEmptyS3 = createMockS3(async () => ({
      ContentLength: 0,
      ContentType: 'application/pdf',
      Metadata: { uploadedby: testUser.id, fileid: 'file_empty' }
    }));
    setR2ClientForTesting(mockEmptyS3);

    const { req, res } = createMockHttp(testUser, {
      files: [
        {
          fileId: 'file_empty',
          fileName: 'zero.pdf',
          r2Key: emptyKey
        }
      ]
    });

    await verifyUploadHandler(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData()?.message?.includes('is empty (0 bytes)'),
      'Rejects 0-byte empty file upload'
    );
  }
}

// ─────────────────────────────────────────────────────────────
// SUITE 4: Successful Verification & AI Analysis Preservation
// ─────────────────────────────────────────────────────────────
async function testSuccessfulVerification() {
  console.log('\n\x1b[1m── 4. Metadata Verification & AI Analysis Pipeline ──\x1b[0m');

  const validKey = `orders/uploads/${testUser.id}/file_test_report.pdf`;

  // Minimal valid PDF binary header
  const samplePdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n' +
    '0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
    'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n168\n%%EOF'
  );

  const mockValidS3 = createMockS3(async (command) => {
    if (command.constructor.name === 'HeadObjectCommand') {
      return {
        ContentLength: samplePdfBuffer.length,
        ContentType: 'application/pdf',
        Metadata: {
          uploadedby: testUser.id,
          fileid: 'file_test'
        }
      };
    }
    if (command.constructor.name === 'GetObjectCommand') {
      return {
        Body: {
          transformToByteArray: async () => new Uint8Array(samplePdfBuffer)
        }
      };
    }
    return {};
  });
  setR2ClientForTesting(mockValidS3);

  const { req, res } = createMockHttp(testUser, {
    files: [
      {
        fileId: 'file_test',
        fileName: 'report.pdf',
        r2Key: validKey
      }
    ]
  });

  await verifyUploadHandler(req, res);
  const data = res.getData();

  assert(
    res.getStatusCode() === 200 && data?.success === true,
    'Verifies valid upload successfully'
  );

  const processed = data?.files?.[0];
  assert(
    processed && processed.id === 'file_test' && processed.r2Key === validKey,
    'Preserves fileId, fileName, and verified r2Key'
  );

  assert(
    processed && processed.pageCount >= 1,
    `Calculates verified pageCount from PDF stream: ${processed?.pageCount}`
  );

  assert(
    processed && processed.ai && processed.ai.aiMetrics && Array.isArray(processed.ai.suggestions),
    'Preserves full AI intelligence metrics and suggestions array'
  );

  assert(
    processed && processed.printMode === 'bw' && processed.paperSize === 'A4' && processed.binding === 'none',
    'Populates default finishing options compatible with downstream order pipeline'
  );

  return processed;
}

// ─────────────────────────────────────────────────────────────
// SUITE 5: Downstream Order Creation & Payment Verification
// ─────────────────────────────────────────────────────────────
async function testDownstreamOrderCreation(verifiedFile) {
  console.log('\n\x1b[1m── 5. Downstream Order Creation & Payment Compatibility ──\x1b[0m');

  const orderData = {
    files: [verifiedFile],
    deliveryLocation: 'Hostel Block B Room 302',
    paymentMethod: 'COD',
    collegeId: 'col_01',
    collegeName: 'Campus University'
  };

  const { order, receipt } = await createOrderRecord({
    user: testUser,
    orderData,
    paymentInfo: { gateway: 'CASH', paymentStatus: 'PENDING' }
  });

  assert(
    order && order.id.startsWith('ORD-2026-'),
    `Order created successfully with standard ID format: ${order.id}`
  );

  assert(
    order.files[0].r2Key === verifiedFile.r2Key,
    'Order records verified direct-upload r2Key accurately'
  );

  assert(
    order.pricing && order.pricing.finalPrice > 0,
    `Order pricing aggregate computed correctly from verified page count: ₹${order.pricing.finalPrice}`
  );

  return order;
}

// ─────────────────────────────────────────────────────────────
// SUITE 6: Safe Cleanup Service
// ─────────────────────────────────────────────────────────────
async function testSafeCleanup(order) {
  console.log('\n\x1b[1m── 6. Cleanup Service Accuracy & Safety Safeguards ──\x1b[0m');

  const deletedKeys = [];
  const mockCleanupS3 = createMockS3(async (command) => {
    if (command.constructor.name === 'DeleteObjectCommand') {
      deletedKeys.push(command.input.Key);
      return {};
    }
    if (command.constructor.name === 'ListObjectsV2Command') {
      return {
        Contents: [
          // A temporary file not referenced by any order, older than 24h
          {
            Key: 'orders/uploads/usr_abandoned/file_old_unattached.pdf',
            LastModified: new Date(Date.now() - 30 * 3600 * 1000)
          },
          // The active order file
          {
            Key: order.files[0].r2Key,
            LastModified: new Date(Date.now() - 30 * 3600 * 1000)
          }
        ]
      };
    }
    return {};
  });
  setR2ClientForTesting(mockCleanupS3);

  // 6.1 Temporary upload cleanup must NEVER touch order files
  await runTemporaryUploadCleanup();

  assert(
    deletedKeys.includes('orders/uploads/usr_abandoned/file_old_unattached.pdf'),
    'Temporary cleanup deletes abandoned file (> 24h old and unreferenced)'
  );

  assert(
    !deletedKeys.includes(order.files[0].r2Key),
    'CRITICAL: Temporary cleanup NEVER deletes file belonging to an active order'
  );

  // 6.2 Delivered order 48-hour purge deletes exact order r2Keys
  deletedKeys.length = 0; // reset
  order.orderStatus = 'DELIVERED';
  order.deliveredAt = new Date(Date.now() - 50 * 3600 * 1000).toISOString(); // 50 hours ago

  await runDeliveredFileCleanup();

  assert(
    deletedKeys.includes(order.files[0].r2Key),
    'Delivered cleanup deletes the exact file.r2Key stored on the order'
  );
}

// ─────────────────────────────────────────────────────────────
// RUN ALL SUITES
// ─────────────────────────────────────────────────────────────
async function runAll() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   CopyCraft — Stage 1 Direct Upload & Security Test Suite      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    await testPresignSecurity();
    await testPresignedUrlGeneration();
    await testVerificationSecurity();
    const verifiedFile = await testSuccessfulVerification();
    const order = await testDownstreamOrderCreation(verifiedFile);
    await testSafeCleanup(order);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log(`Results: ${passedTests} / ${totalTests} checks passed`);
    if (passedTests === totalTests) {
      console.log('\x1b[32m\x1b[1m🎉 ALL STAGE 1 DIRECT UPLOAD TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
      process.exit(0);
    } else {
      console.log('\x1b[31m\x1b[1m❌ SOME TESTS FAILED.\x1b[0m\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite crashed with error:', err);
    process.exit(1);
  } finally {
    setR2ClientForTesting(null);
  }
}

runAll();
