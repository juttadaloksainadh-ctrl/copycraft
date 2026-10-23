/**
 * CopyCraft — Frontend Direct R2 Upload Flow Test Suite (Mocked)
 * -------------------------------------------------------------
 * Validates the frontend upload utilities, security guarantees,
 * protocol formatting, progress tracking, and fallback handling.
 */

import assert from 'node:assert';
import {
  getPresignedUploadUrls,
  uploadToR2,
  verifyDirectUpload,
  uploadFilesMultipart
} from './src/utils/api.js';

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// Mock localStorage for Node test runner
globalThis.localStorage = {
  _store: {},
  getItem(key) { return this._store[key] || null; },
  setItem(key, val) { this._store[key] = String(val); },
  removeItem(key) { delete this._store[key]; },
  clear() { this._store = {}; }
};

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   CopyCraft — Frontend Direct R2 Upload Flow Test Suite       ║');
console.log('║   Mode: Unit & Mocked Protocol Verification                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function runTests() {
  // Setup mock user token
  localStorage.setItem('copycraft_token', 'mock_jwt_token_for_student_test');

  // ── 1. Presign Request Formatting & Token Binding ──
  console.log('── 1. Presign Upload Request Protocol ──');
  {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = null;
    let interceptedOptions = null;

    globalThis.fetch = async (url, opts) => {
      interceptedUrl = url;
      interceptedOptions = opts;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          directUploadSupported: true,
          storageMode: 'cloudflare_r2',
          files: [
            {
              fileId: 'file_001',
              fileName: 'sample.pdf',
              mimeType: 'application/pdf',
              fileSize: 1024,
              r2Key: 'orders/uploads/usr_1/file_001_sample.pdf',
              uploadUrl: 'https://mock-r2.cloudflarestorage.com/upload-signed-url',
              headers: { 'Content-Type': 'application/pdf' },
              uploadToken: 'valid_upload_token_123'
            }
          ]
        })
      };
    };

    await itAsync('Formats presign payload correctly and attaches Authorization header', async () => {
      const files = [
        { name: 'sample.pdf', size: 1024, type: 'application/pdf' }
      ];
      const res = await getPresignedUploadUrls(files);

      assert.strictEqual(res.success, true);
      assert.strictEqual(interceptedUrl, '/api/files/presign-upload');
      assert.strictEqual(interceptedOptions.method, 'POST');
      assert.strictEqual(interceptedOptions.headers['Authorization'], 'Bearer mock_jwt_token_for_student_test');
      assert.strictEqual(interceptedOptions.headers['Content-Type'], 'application/json');

      const parsedBody = JSON.parse(interceptedOptions.body);
      assert.strictEqual(parsedBody.files.length, 1);
      assert.strictEqual(parsedBody.files[0].fileName, 'sample.pdf');
      assert.strictEqual(parsedBody.files[0].fileSize, 1024);
      assert.strictEqual(parsedBody.files[0].mimeType, 'application/pdf');
    });

    globalThis.fetch = originalFetch;
  }

  // ── 2. uploadToR2 Security & Header Isolation ──
  console.log('\n── 2. Direct Storage Upload (Security & Header Isolation) ──');
  {
    const originalFetch = globalThis.fetch;
    let interceptedPutUrl = null;
    let interceptedPutHeaders = null;
    let interceptedPutBody = null;

    globalThis.fetch = async (url, opts) => {
      interceptedPutUrl = url;
      interceptedPutHeaders = opts.headers;
      interceptedPutBody = opts.body;
      return {
        ok: true,
        status: 200,
        text: async () => ''
      };
    };

    await itAsync('SECURITY: uploadToR2 MUST NOT send Authorization header to Cloudflare R2', async () => {
      const mockFile = { name: 'sample.pdf', size: 2048, type: 'application/pdf' };
      // Deliberately pass Authorization in headers to verify it gets stripped
      const headersWithAuth = {
        'Content-Type': 'application/pdf',
        'Authorization': 'Bearer should_never_reach_r2',
        'authorization': 'Bearer lowercase_leak_check'
      };

      const res = await uploadToR2(
        'https://mock-r2.cloudflarestorage.com/upload-signed-url',
        mockFile,
        headersWithAuth
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(interceptedPutUrl, 'https://mock-r2.cloudflarestorage.com/upload-signed-url');
      assert.strictEqual(interceptedPutHeaders['Content-Type'], 'application/pdf');
      assert.strictEqual(interceptedPutHeaders['Authorization'], undefined, 'Authorization header leaked to R2!');
      assert.strictEqual(interceptedPutHeaders['authorization'], undefined, 'authorization header leaked to R2!');
    });

    await itAsync('Handles HTTP failure from R2 (e.g. 403 Expired URL or CORS)', async () => {
      globalThis.fetch = async () => ({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      let threw = false;
      try {
        await uploadToR2('https://mock-r2.cloudflarestorage.com/upload-signed-url', { type: 'application/pdf' });
      } catch (err) {
        threw = true;
        assert(err.message.includes('403'));
      }
      assert.strictEqual(threw, true, 'Should throw on non-2xx status');
    });

    globalThis.fetch = originalFetch;
  }

  // ── 3. Verification Protocol & Metadata Return ──
  console.log('\n── 3. Verification Request Protocol ──');
  {
    const originalFetch = globalThis.fetch;
    let verifyUrl = null;
    let verifyOptions = null;

    globalThis.fetch = async (url, opts) => {
      verifyUrl = url;
      verifyOptions = opts;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          message: 'Direct upload files verified and analyzed successfully',
          storageMode: 'cloudflare_r2',
          files: [
            {
              id: 'file_001',
              name: 'syllabus.pdf',
              size: 2048,
              mimeType: 'application/pdf',
              pageCount: 12,
              printMode: 'bw',
              sideMode: 'double',
              paperSize: 'A4',
              binding: 'none',
              lamination: 'none',
              coverSheet: 'none',
              r2Key: 'orders/uploads/usr_1/file_001_syllabus.pdf',
              r2Url: 'https://copycraft-files.r2.cloudflarestorage.com/orders/uploads/usr_1/file_001_syllabus.pdf',
              ai: { totalPages: 12, isDocument: true }
            }
          ]
        })
      };
    };

    await itAsync('Sends required verification payload and receives canonical file descriptor', async () => {
      const verifyList = [
        {
          fileId: 'file_001',
          fileName: 'syllabus.pdf',
          r2Key: 'orders/uploads/usr_1/file_001_syllabus.pdf',
          uploadToken: 'token_abc_123',
          mimeType: 'application/pdf'
        }
      ];

      const res = await verifyDirectUpload(verifyList);

      assert.strictEqual(res.success, true);
      assert.strictEqual(verifyUrl, '/api/files/verify-upload');
      assert.strictEqual(verifyOptions.method, 'POST');
      assert.strictEqual(verifyOptions.headers['Authorization'], 'Bearer mock_jwt_token_for_student_test');

      const body = JSON.parse(verifyOptions.body);
      assert.strictEqual(body.files[0].fileId, 'file_001');
      assert.strictEqual(body.files[0].r2Key, 'orders/uploads/usr_1/file_001_syllabus.pdf');
      assert.strictEqual(body.files[0].uploadToken, 'token_abc_123');

      // Verify canonical descriptor output
      assert.strictEqual(res.files.length, 1);
      assert.strictEqual(res.files[0].pageCount, 12);
      assert.strictEqual(res.files[0].sideMode, 'double');
      assert.strictEqual(res.files[0].r2Key, 'orders/uploads/usr_1/file_001_syllabus.pdf');
    });

    globalThis.fetch = originalFetch;
  }

  // ── 4. Deliberate Fallback Mechanism ──
  console.log('\n── 4. Deliberate Multipart Fallback ──');
  {
    const originalFetch = globalThis.fetch;
    let fallbackUrl = null;
    let fallbackOptions = null;

    globalThis.fetch = async (url, opts) => {
      fallbackUrl = url;
      fallbackOptions = opts;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          message: 'Files uploaded via fallback',
          files: [
            {
              id: 'file_fallback_01',
              name: 'notes.pdf',
              pageCount: 4,
              size: 512
            }
          ]
        })
      };
    };

    await itAsync('Sends FormData to POST /api/orders/upload when fallback is deliberately triggered', async () => {
      const dummyFile = { name: 'notes.pdf', size: 512, type: 'application/pdf' };
      const res = await uploadFilesMultipart([dummyFile]);

      assert.strictEqual(res.success, true);
      assert.strictEqual(fallbackUrl, '/api/orders/upload');
      assert.strictEqual(fallbackOptions.method, 'POST');
      assert(fallbackOptions.body instanceof FormData);
      assert.strictEqual(fallbackOptions.headers['Authorization'], 'Bearer mock_jwt_token_for_student_test');
    });

    globalThis.fetch = originalFetch;
  }

  // ── 5. End-to-End Mocked Flow Simulation ──
  console.log('\n── 5. Simulated End-to-End Direct Upload Flow ──');
  {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (url, opts) => {
      // 1. Presign
      if (url.endsWith('/files/presign-upload')) {
        const body = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            success: true,
            directUploadSupported: true,
            storageMode: 'cloudflare_r2',
            files: body.files.map((f, i) => ({
              fileId: `file_${i + 1}`,
              fileName: f.fileName,
              mimeType: f.mimeType,
              fileSize: f.fileSize,
              r2Key: `orders/uploads/usr_student_test/file_${i + 1}_${f.fileName}`,
              uploadUrl: `https://mock-r2.cloudflarestorage.com/presigned-put-${i + 1}`,
              headers: { 'Content-Type': f.mimeType },
              uploadToken: `upload_tok_${i + 1}`,
              expiresIn: 900
            }))
          })
        };
      }

      // 2. Direct PUT to R2
      if (url.includes('mock-r2.cloudflarestorage.com')) {
        return {
          ok: true,
          status: 200,
          text: async () => ''
        };
      }

      // 3. Verify
      if (url.endsWith('/files/verify-upload')) {
        const body = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            success: true,
            message: 'Direct upload verified',
            storageMode: 'cloudflare_r2',
            files: body.files.map((f, i) => ({
              id: f.fileId,
              name: f.fileName,
              size: 4096,
              mimeType: f.mimeType,
              pageCount: (i + 1) * 5,
              printMode: 'bw',
              sideMode: 'double',
              paperSize: 'A4',
              binding: 'none',
              lamination: 'none',
              coverSheet: 'none',
              r2Key: f.r2Key,
              r2Url: `https://copycraft-files.r2.cloudflarestorage.com/${f.r2Key}`,
              ai: { pageCount: (i + 1) * 5, summary: 'Clean document' }
            }))
          })
        };
      }

      return { ok: false, status: 404, text: async () => 'Not found' };
    };

    await itAsync('Simulates complete 3-step direct upload flow (Presign -> Direct PUT -> Verify)', async () => {
      const selectedFiles = [
        { name: 'syllabus.pdf', size: 4096, type: 'application/pdf' },
        { name: 'diagram.png', size: 2048, type: 'image/png' }
      ];

      // Step 1: Presign
      const presignRes = await getPresignedUploadUrls(selectedFiles);
      assert.strictEqual(presignRes.success, true);
      assert.strictEqual(presignRes.directUploadSupported, true);
      assert.strictEqual(presignRes.files.length, 2);

      // Step 2: Upload each directly to R2
      for (let i = 0; i < selectedFiles.length; i++) {
        const item = presignRes.files[i];
        const putRes = await uploadToR2(item.uploadUrl, selectedFiles[i], item.headers);
        assert.strictEqual(putRes.success, true);
      }

      // Step 3: Verify with backend
      const verifyPayload = presignRes.files.map(item => ({
        fileId: item.fileId,
        fileName: item.fileName,
        r2Key: item.r2Key,
        uploadToken: item.uploadToken,
        mimeType: item.mimeType
      }));

      const verifyRes = await verifyDirectUpload(verifyPayload);
      assert.strictEqual(verifyRes.success, true);
      assert.strictEqual(verifyRes.files.length, 2);
      assert.strictEqual(verifyRes.files[0].pageCount, 5);
      assert.strictEqual(verifyRes.files[1].pageCount, 10);
      assert(verifyRes.files[0].r2Key.startsWith('orders/uploads/usr_student_test/'));
    });

    globalThis.fetch = originalFetch;
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`Results: ${passed} / ${passed + failed} checks passed`);
  if (failed > 0) {
    console.error(`❌ ${failed} CHECKS FAILED!`);
    process.exit(1);
  } else {
    console.log('🎉 ALL FRONTEND UPLOAD TESTS PASSED SUCCESSFULLY!\n');
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
