const API_BASE = '/api';

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

    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    return { success: false, message: error.message || 'Network request failed' };
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
 * Get a payment receipt for a specific order.
 *
 * @param {string} orderId - The order ID
 * @returns {Promise<{success: boolean, receipt?: object}>}
 */
export async function getPaymentReceiptByOrder(orderId) {
  return apiFetch(`/payments/receipts/order/${orderId}`);
}

