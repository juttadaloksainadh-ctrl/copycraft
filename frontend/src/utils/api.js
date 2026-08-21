// In development, Vite's proxy rewrites /api → http://localhost:5000/api.
// In production (Vercel), set VITE_API_URL=https://your-backend.onrender.com
// in Vercel's project environment variables — no trailing slash.
const API_BASE = import.meta.env.VITE_API_URL
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


