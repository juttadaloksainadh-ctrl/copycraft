import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import FileUploader from '../components/customer/FileUploader';
import PrintCustomizer from '../components/customer/PrintCustomizer';
import OrderSummary from '../components/customer/OrderSummary';
import AiSuggestionsModal from '../components/customer/AiSuggestionsModal';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../utils/api';
import { calculateOrderPrice, updateLocalPricingDefaults, PRICING_DEFAULTS } from '../utils/pricingService';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRazorpayConfig, createRazorpayOrder, verifyRazorpayPayment } from '../utils/api';
import { openRazorpayCheckout } from '../utils/razorpay';
import confetti from 'canvas-confetti';

export default function UploadPage({ onNavigate }) {
  const { addToast } = useToast();
  const { user } = useAuth();

  // Initialize with clean empty file list — no default mock documents
  const [files, setFiles] = useState([]);
  const [rates, setRates] = useState(PRICING_DEFAULTS);

  const [options, setOptions] = useState({
    printMode: 'bw',
    sideMode: 'double',
    paperSize: 'A4',
    binding: 'spiral',
    lamination: 'none',
    coverSheet: 'transparent',
    quantity: 1
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Fetch latest dynamic pricing rates from backend on mount to ensure real-time admin prices apply
  useEffect(() => {
    apiFetch('/orders/pricing-rates')
      .then(res => {
        if (res.success && res.pricingRates) {
          updateLocalPricingDefaults(res.pricingRates);
          setRates({
            printMode: { ...PRICING_DEFAULTS.printMode, ...res.pricingRates.printMode },
            binding: { ...PRICING_DEFAULTS.binding, ...res.pricingRates.binding },
            lamination: { ...PRICING_DEFAULTS.lamination, ...res.pricingRates.lamination },
            coverSheet: { ...PRICING_DEFAULTS.coverSheet, ...res.pricingRates.coverSheet },
            paperBase: { ...PRICING_DEFAULTS.paperBase, ...res.pricingRates.paperBase }
          });
        }
      })
      .catch(() => {});
  }, []);

  // Compute aggregated quote across all uploaded files
  const totalPages = files.length > 0 ? files.reduce((sum, f) => sum + (f.pageCount || 1), 0) : 0;

  const quote = calculateOrderPrice({
    pageCount: totalPages,
    quantity: files.length > 0 ? options.quantity : 0,
    paperSize: options.paperSize,
    printMode: options.printMode,
    sideMode: options.sideMode,
    binding: options.binding,
    lamination: options.lamination,
    coverSheet: options.coverSheet
  });

  const handleOrderSubmit = async (checkoutData) => {
    if (!files.length) {
      addToast('Please upload at least one document', 'warning');
      return;
    }

    const filesToSend = files.map(f => ({ ...f, ...options }));
    const orderPayload = {
      files: filesToSend,
      deliveryLocation: checkoutData.deliveryLocation,
      paymentMethod: checkoutData.paymentMethod,
      couponCode: checkoutData.couponCode,
      collegeName: checkoutData.collegeName,
      yearOfStudy: checkoutData.yearOfStudy,
      branch: checkoutData.branch
    };

    setIsSubmitting(true);

    // Flow 1: Cash on Delivery (COD)
    if (checkoutData.paymentMethod === 'COD') {
      try {
        const res = await apiFetch('/orders/create', {
          method: 'POST',
          body: JSON.stringify(orderPayload)
        });

        if (res.success) {
          try {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          } catch (e) {}
          addToast(`Order ${res.order.id} placed successfully with Cash on Delivery!`, 'success');
          onNavigate('dashboard');
        } else {
          addToast(res.message || 'Order submission failed', 'error');
        }
      } catch (e) {
        addToast('Error placing COD order', 'error');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Flow 2: Razorpay Online Payment Gateway
    try {
      // Step A: Check Razorpay gateway configuration
      const configRes = await getRazorpayConfig();
      if (!configRes.isConfigured) {
        setIsSubmitting(false);
        addToast(
          'Razorpay credentials not yet configured in backend/.env. Please add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET to enable online checkout.',
          'warning'
        );
        return;
      }

      // Step B: Create official Razorpay Order on backend
      const rzpRes = await createRazorpayOrder({
        files: filesToSend,
        couponCode: checkoutData.couponCode,
        referralDiscount: 0
      });

      if (!rzpRes.success || !rzpRes.razorpayOrderId) {
        setIsSubmitting(false);
        addToast(rzpRes.message || 'Failed to initialize payment gateway order', 'error');
        return;
      }

      // Step C: Launch Razorpay Checkout Modal
      await openRazorpayCheckout({
        keyId: rzpRes.keyId,
        amount: rzpRes.amount,
        currency: rzpRes.currency || 'INR',
        orderId: rzpRes.razorpayOrderId,
        name: 'CopyCraft Printing',
        description: `Campus Print Order (${files.length} document${files.length > 1 ? 's' : ''})`,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || ''
        },
        onSuccess: async (paymentResponse) => {
          // Step D: Cryptographically verify signature on backend and generate verified order & receipt
          try {
            const verifyRes = await verifyRazorpayPayment({
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
              orderData: orderPayload
            });

            if (verifyRes.success) {
              try {
                confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
              } catch (e) {}
              addToast(`Payment verified! Order ${verifyRes.order.id} placed successfully!`, 'success');
              onNavigate('dashboard');
            } else {
              addToast(verifyRes.message || 'Payment verification failed', 'error');
            }
          } catch (err) {
            addToast('Error verifying transaction with server', 'error');
          } finally {
            setIsSubmitting(false);
          }
        },
        onDismiss: () => {
          setIsSubmitting(false);
          addToast('Payment cancelled by user', 'info');
        },
        onError: (paymentErr) => {
          setIsSubmitting(false);
          addToast(paymentErr?.description || 'Payment transaction failed', 'error');
        }
      });
    } catch (e) {
      setIsSubmitting(false);
      addToast(e.message || 'Error processing payment gateway', 'error');
    }
  };

  const allAiSuggestions = files.flatMap(f => f.ai?.suggestions || []);

  const handleApplyAiSuggestion = (suggestion) => {
    if (suggestion.type === 'DUPLEX_SAVINGS') {
      setOptions(prev => ({ ...prev, sideMode: 'double' }));
      addToast('Switched to Double-Sided Duplex printing!', 'success');
    } else if (suggestion.type === 'BLANK_PAGES') {
      setFiles(prev => prev.map(f => ({ ...f, pageCount: Math.max(1, f.pageCount - (suggestion.pagesToExclude?.length || 1)) })));
      addToast('Omitted blank pages from order count', 'success');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      <Navbar />

      <main className="main-content container" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Page Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1rem 0 2rem 0', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem', gap: '0.4rem' }}>
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Create New Print Order</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Configure your documents, finishing options, and campus delivery location
            </p>
          </div>

          {allAiSuggestions.length > 0 && (
            <button className="btn btn-sm btn-accent" onClick={() => setShowAiModal(true)} style={{ gap: '0.4rem' }}>
              <Sparkles size={16} />
              AI Insights ({allAiSuggestions.length})
            </button>
          )}
        </div>

        {/* 2-Column Responsive Form Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: File Upload & Finishing Preferences */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
            <FileUploader files={files} onFilesUpdated={setFiles} />
            <PrintCustomizer options={options} onOptionsChange={setOptions} rates={rates} />
          </div>

          {/* Right Column: Dynamic Price Quote & Checkout */}
          <div style={{ minWidth: 0 }}>
            <OrderSummary
              quote={quote}
              onOrderSubmit={handleOrderSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </main>

      {/* AI Insights Modal */}
      <AiSuggestionsModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        suggestions={allAiSuggestions}
        onApplySuggestion={handleApplyAiSuggestion}
      />

      <Footer />
    </div>
  );
}
