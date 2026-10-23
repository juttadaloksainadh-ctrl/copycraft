// In development, Vite's proxy rewrites /api → http://localhost:5000/api.
// In production (Vercel), set VITE_API_URL=https://your-backend.onrender.com
// in Vercel's project environment variables — no trailing slash.
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('copycraft_token');
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // Handles HTML responses (e.g. 404/502/index.html redirects)
      return {
        success: false,
        message: res.status >= 500
          ? `Backend server is starting up (${res.status}). Please wait 30 seconds and try again.`
          : `Backend unreachable (${res.status}). Please check VITE_API_URL configuration.`
      };
    }

    if (!res.ok && !data.message) {
      data.message = `Request failed with status ${res.status}`;
    }

    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    return {
      success: false,
      message: 'Cannot connect to backend server. Please check your internet or VITE_API_URL settings.'
    };
  }
}

/**
 * Get a pre-signed download URL for a file stored in Cloudflare R2.
 * Used by dealers to download customer print files.
 *
 * @param {string} orderId - The order ID
 * @param {string} fileId - The file ID
 * @returns {Promise<{success: boolean, downloadUrl?: string, fileName?: string}>}
 */
export async function getFileDownloadUrl(orderId, fileId) {
  return apiFetch(`/files/${orderId}/${fileId}/download`);
}

/**
 * Get payment receipts for the authenticated user.
 *
 * @returns {Promise<{success: boolean, receipts?: Array}>}
 */
export async function getPaymentReceipts() {
  return apiFetch('/payments/receipts');
}

/**
 * Get Razorpay public configuration and status.
 */
export async function getRazorpayConfig() {
  return apiFetch('/payments/razorpay/config');
}

/**
 * Create a Razorpay order from quote details.
 */
export async function createRazorpayOrder(orderParams) {
  return apiFetch('/payments/razorpay/create-order', {
    method: 'POST',
    body: JSON.stringify(orderParams)
  });
}

/**
 * Verify Razorpay payment signature and place confirmed order.
 */
export async function verifyRazorpayPayment(verificationPayload) {
  return apiFetch('/payments/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(verificationPayload)
  });
}

/**
 * Request pre-signed PUT upload URLs from backend for direct browser-to-R2 upload.
 *
 * @param {Array<{name: string, size: number, type: string}>} files
 * @returns {Promise<{success: boolean, directUploadSupported?: boolean, storageMode?: string, files?: Array, message?: string}>}
 */
export async function getPresignedUploadUrls(files) {
  const payload = {
    files: files.map(f => ({
      fileName: f.name || f.fileName,
      fileSize: f.size || f.fileSize,
      mimeType: f.type || f.mimeType
    }))
  };
  return apiFetch('/files/presign-upload', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Upload a file directly to Cloudflare R2 using a pre-signed PUT URL.
 * Guarantees:
 * - Does NOT attach backend Authorization header to Cloudflare R2.
 * - Applies required signed headers (such as Content-Type).
 * - Tracks upload progress via XMLHttpRequest when supported.
 *
 * @param {string} uploadUrl - Pre-signed PUT URL
 * @param {File|Blob} file - File binary content
 * @param {object} headers - Headers signed by backend
 * @param {function} onProgress - Optional callback for upload progress (percent, loaded, total)
 * @returns {Promise<{success: boolean, status: number}>}
 */
export async function uploadToR2(uploadUrl, file, headers = {}, onProgress = null) {
  // Never leak backend Bearer token to Cloudflare R2
  const cleanHeaders = {};
  if (headers && typeof headers === 'object') {
    Object.entries(headers).forEach(([k, v]) => {
      if (k.toLowerCase() !== 'authorization') {
        cleanHeaders[k] = v;
      }
    });
  }
  if (!cleanHeaders['Content-Type'] && file.type) {
    cleanHeaders['Content-Type'] = file.type;
  }

  if (typeof XMLHttpRequest !== 'undefined') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);

      Object.entries(cleanHeaders).forEach(([k, v]) => {
        xhr.setRequestHeader(k, v);
      });

      if (xhr.upload && typeof onProgress === 'function') {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent, e.loaded, e.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true, status: xhr.status });
        } else {
          reject(new Error(`Storage upload failed with HTTP ${xhr.status}: ${xhr.statusText || 'Upload rejected'}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during direct storage upload. Verify Cloudflare R2 CORS configuration and network connectivity.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Storage upload timed out. Please try again.'));
      };

      xhr.send(file);
    });
  } else {
    // Non-browser / Node.js test environment
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: cleanHeaders,
      body: file
    });
    if (!res.ok) {
      throw new Error(`Storage upload failed with HTTP ${res.status}`);
    }
    if (typeof onProgress === 'function') {
      onProgress(100, file.size || 0, file.size || 0);
    }
    return { success: true, status: res.status };
  }
}

/**
 * Verify completed direct uploads with the backend.
 * The backend verifies the object in R2, extracts server-verified page count and runs AI analysis.
 *
 * @param {Array<{fileId: string, fileName: string, r2Key: string, uploadToken?: string, mimeType?: string}>} files
 * @returns {Promise<{success: boolean, files?: Array, message?: string}>}
 */
export async function verifyDirectUpload(files) {
  const payload = {
    files: files.map(f => ({
      fileId: f.fileId || f.id,
      fileName: f.fileName || f.name,
      r2Key: f.r2Key,
      uploadToken: f.uploadToken,
      mimeType: f.mimeType || f.type
    }))
  };
  return apiFetch('/files/verify-upload', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Deliberate fallback: Multipart upload to Express backend (POST /api/orders/upload).
 * Used ONLY when backend explicitly signals directUploadSupported === false.
 *
 * @param {File[]} files
 * @returns {Promise<{success: boolean, files?: Array, message?: string}>}
 */
export async function uploadFilesMultipart(files) {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  return apiFetch('/orders/upload', {
    method: 'POST',
    body: formData
  });
}
