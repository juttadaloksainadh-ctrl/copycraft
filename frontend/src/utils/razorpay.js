/**
 * CopyCraft — Razorpay Checkout Loader & Modal Helper
 * ----------------------------------------------------
 * Dynamically loads the official Razorpay Checkout SDK and provides
 * a clean promise/callback interface for triggering payments.
 */

let scriptLoadingPromise = null;

/**
 * Dynamically load the Razorpay checkout script if not already loaded.
 * @returns {Promise<boolean>}
 */
export function loadRazorpayScript() {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout script');
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Open Razorpay Checkout modal for user payment.
 *
 * @param {Object} options
 * @param {string} options.keyId - Razorpay Key ID
 * @param {number} options.amount - Amount in paise
 * @param {string} options.currency - e.g. 'INR'
 * @param {string} options.orderId - Razorpay order ID (order_xxx)
 * @param {string} [options.name] - Business / App name
 * @param {string} [options.description] - Transaction description
 * @param {Object} [options.prefill] - Customer { name, email, contact }
 * @param {Function} options.onSuccess - Callback on payment success: ({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
 * @param {Function} [options.onDismiss] - Callback when modal is dismissed by user
 * @param {Function} [options.onError] - Callback on payment failure / error
 */
export async function openRazorpayCheckout({
  keyId,
  amount,
  currency = 'INR',
  orderId,
  name = 'CopyCraft Printing',
  description = 'Campus Document Print Order',
  prefill = {},
  onSuccess,
  onDismiss,
  onError
}) {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Razorpay Checkout SDK could not be loaded. Please check your internet connection.');
  }

  const razorpayOptions = {
    key: keyId,
    amount,
    currency,
    name,
    description,
    order_id: orderId,
    prefill: {
      name: prefill.name || '',
      email: prefill.email || '',
      contact: prefill.contact || prefill.phone || ''
    },
    theme: {
      color: '#4f46e5' // CopyCraft brand indigo
    },
    modal: {
      ondismiss: () => {
        if (typeof onDismiss === 'function') {
          onDismiss();
        }
      }
    },
    handler: (response) => {
      if (typeof onSuccess === 'function') {
        onSuccess(response);
      }
    }
  };

  const rzp = new window.Razorpay(razorpayOptions);

  if (typeof onError === 'function') {
    rzp.on('payment.failed', (response) => {
      onError(response.error);
    });
  }

  rzp.open();
}
