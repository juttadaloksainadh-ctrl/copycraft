import React, { useState, useEffect } from 'react';
import { Tag, Check, ShieldCheck, CreditCard, Banknote, ArrowRight, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../utils/api';
import confetti from 'canvas-confetti';

export default function OrderSummary({ quote, onOrderSubmit, isSubmitting }) {
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [deliveryLocation, setDeliveryLocation] = useState('Hostel 4, Room 302');
  const [collegeName, setCollegeName] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('3rd Year');
  const [branch, setBranch] = useState('Computer Science');
  const [colleges, setColleges] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await apiFetch('/orders/colleges');
        if (res.success && res.colleges?.length > 0) {
          setColleges(res.colleges);
          setCollegeName(res.colleges[0].name);
        }
      } catch (e) {}
    };
    fetchColleges();
  }, []);

  const breakdown = quote?.breakdown || {
    printCost: 0,
    addonCost: 0,
    subtotal: 0,
    deliveryFee: 0,
    couponDiscount: 0,
    gstAmount: 0,
    convenienceFee: 0,
    finalPrice: 0
  };

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const code = couponInput.trim().toUpperCase();

    if (['WELCOME10', 'EXAM50', 'FREEDEL', 'STUDENT20'].includes(code)) {
      setAppliedCoupon(code);
      addToast(`Promo code '${code}' applied successfully!`, 'success');
    } else {
      addToast('Invalid coupon code. Try WELCOME10 or EXAM50', 'error');
    }
  };

  const handleSubmit = () => {
    if (!deliveryLocation.trim()) {
      addToast('Please enter your campus delivery location', 'warning');
      return;
    }
    if (!collegeName.trim()) {
      addToast('Please enter your college name', 'warning');
      return;
    }
    if (!branch.trim()) {
      addToast('Please enter your academic branch', 'warning');
      return;
    }

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    onOrderSubmit({
      deliveryLocation,
      paymentMethod,
      couponCode: appliedCoupon,
      collegeName,
      yearOfStudy,
      branch
    });
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: '90px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        Order Summary & Checkout
      </h3>

      {/* College Name Input */}
      <div className="input-group">
        <label className="input-label">Select College Station</label>
        <select
          className="input-field"
          value={collegeName}
          onChange={e => setCollegeName(e.target.value)}
        >
          {colleges.map(c => (
            <option key={c.id} value={c.name}>{c.name} ({c.city})</option>
          ))}
        </select>
      </div>

      {/* Year of Study Input */}
      <div className="input-group">
        <label className="input-label">Year of Study</label>
        <select
          className="input-field"
          value={yearOfStudy}
          onChange={e => setYearOfStudy(e.target.value)}
        >
          <option value="1st Year">1st Year</option>
          <option value="2nd Year">2nd Year</option>
          <option value="3rd Year">3rd Year</option>
          <option value="4th Year">4th Year</option>
          <option value="PG / Masters">PG / Masters</option>
          <option value="PhD">PhD</option>
        </select>
      </div>

      {/* Branch Input */}
      <div className="input-group">
        <label className="input-label">Academic Branch</label>
        <input
          type="text"
          className="input-field"
          value={branch}
          onChange={e => setBranch(e.target.value)}
          placeholder="e.g. Computer Science & Eng"
        />
      </div>

      {/* Campus Delivery Location Input */}
      <div className="input-group">
        <label className="input-label">Campus Delivery Location</label>
        <input
          type="text"
          className="input-field"
          value={deliveryLocation}
          onChange={e => setDeliveryLocation(e.target.value)}
          placeholder="e.g. Hostel 4, Room 302 or LTC Hall A"
        />
      </div>

      {/* Promo Coupon Box */}
      <div className="input-group">
        <label className="input-label" style={{ display: 'flex', alignItems: 'center', justify: 'space-between' }}>
          <span>Promo / Referral Coupon</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Try: WELCOME10</span>
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Enter code"
            value={couponInput}
            onChange={e => setCouponInput(e.target.value)}
            style={{ textTransform: 'uppercase' }}
          />
          <button className="btn btn-sm btn-secondary" onClick={handleApplyCoupon}>
            Apply
          </button>
        </div>
        {appliedCoupon && (
          <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={14} /> Code '{appliedCoupon}' active
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
          <span>Paper & Printing Cost</span>
          <span>₹{breakdown.printCost.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
          <span>Binding & Finishing Addons</span>
          <span>₹{breakdown.addonCost.toFixed(2)}</span>
        </div>

        {breakdown.couponDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 600 }}>
            <span>Coupon Discount</span>
            <span>- ₹{breakdown.couponDiscount.toFixed(2)}</span>
          </div>
        )}

        {/* Convenience Fee Line */}
        {breakdown.convenienceFee > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              Convenience Fee
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.35rem',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#d97706',
                letterSpacing: '0.02em'
              }}>
                2.6%
              </span>
            </span>
            <span style={{ color: '#d97706', fontWeight: 600 }}>+ ₹{breakdown.convenienceFee.toFixed(2)}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '1.25rem',
          fontWeight: 800,
          color: 'var(--primary)',
          paddingTop: '0.75rem',
          borderTop: '2px dashed var(--border-color)'
        }}>
          <span>Total Amount</span>
          <span>₹{breakdown.finalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Gateway Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        <label className="input-label">Select Payment Gateway</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {[
            { id: 'UPI', label: 'Razorpay UPI', icon: CreditCard },
            { id: 'COD', label: 'Cash on Delivery', icon: Banknote }
          ].map(method => (
            <button
              key={method.id}
              type="button"
              onClick={() => setPaymentMethod(method.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                gap: '0.4rem',
                padding: '0.65rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${paymentMethod === method.id ? 'var(--primary)' : 'var(--border-color)'}`,
                background: paymentMethod === method.id ? 'var(--primary-light)' : 'var(--bg-app)',
                color: paymentMethod === method.id ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.825rem'
              }}
            >
              <method.icon size={16} />
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {/* Place Order CTA Button */}
      <button
        className="btn btn-lg btn-primary"
        onClick={handleSubmit}
        disabled={isSubmitting}
        style={{ width: '100%', marginTop: '0.5rem', gap: '0.6rem' }}
      >
        {isSubmitting ? 'Securing Order...' : 'Confirm Order & Pay'}
        <ArrowRight size={18} />
      </button>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
        <ShieldCheck size={14} color="var(--success)" />
        100% Secure SSL Payment • Auto file deletion in 48 hrs
      </div>
    </div>
  );
}
