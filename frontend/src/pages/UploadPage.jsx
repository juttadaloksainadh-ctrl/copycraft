import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import FileUploader from '../components/customer/FileUploader';
import PrintCustomizer from '../components/customer/PrintCustomizer';
import OrderSummary from '../components/customer/OrderSummary';
import AiSuggestionsModal from '../components/customer/AiSuggestionsModal';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../utils/api';
import { calculateOrderPrice, updateLocalPricingDefaults } from '../utils/pricingService';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function UploadPage({ onNavigate }) {
  const { addToast } = useToast();

  // Initialize with clean empty file list — no default mock documents
  const [files, setFiles] = useState([]);

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
        }
      })
      .catch(() => {});
  }, []);

  // Compute aggregated quote across all uploaded files
  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 1), 0);

  const quote = calculateOrderPrice({
    pageCount: Math.max(1, totalPages),
    quantity: options.quantity,
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

    setIsSubmitting(true);
    try {
      const orderPayload = {
        files: files.map(f => ({ ...f, ...options })),
        deliveryLocation: checkoutData.deliveryLocation,
        paymentMethod: checkoutData.paymentMethod,
        couponCode: checkoutData.couponCode,
        collegeName: checkoutData.collegeName,
        yearOfStudy: checkoutData.yearOfStudy,
        branch: checkoutData.branch
      };

      const res = await apiFetch('/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      if (res.success) {
        addToast(`Order ${res.order.id} placed successfully!`, 'success');
        onNavigate('dashboard');
      } else {
        addToast(res.message || 'Order submission failed', 'error');
      }
    } catch (e) {
      addToast('Error placing order', 'error');
    } finally {
      setIsSubmitting(false);
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          {/* Left Column: File Upload & Finishing Preferences */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <FileUploader files={files} onFilesUpdated={setFiles} />
            <PrintCustomizer options={options} onOptionsChange={setOptions} />
          </div>

          {/* Right Column: Dynamic Price Quote & Checkout */}
          <OrderSummary
            quote={quote}
            onOrderSubmit={handleOrderSubmit}
            isSubmitting={isSubmitting}
          />
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
