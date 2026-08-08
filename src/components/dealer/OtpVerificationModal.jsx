import React, { useState } from 'react';
import { Key, CheckCircle2 } from 'lucide-react';
import Modal from '../common/Modal';
import { useToast } from '../../context/ToastContext';

export default function OtpVerificationModal({ isOpen, onClose, order, onVerifySuccess }) {
  const [otpInput, setOtpInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { addToast } = useToast();

  const handleVerify = async () => {
    if (!otpInput || otpInput.length < 4) {
      addToast('Please enter the complete 4-digit OTP provided by customer', 'warning');
      return;
    }

    setIsVerifying(true);
    try {
      await onVerifySuccess(order.id, otpInput);
      setOtpInput('');
      onClose();
    } catch (err) {
      addToast(err.message || 'OTP verification failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="OTP Delivery Verification" maxWidth="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--primary-light)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto'
        }}>
          <Key size={26} color="var(--primary)" />
        </div>

        <div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Order #{order?.id}</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Verify the 4-digit confirmation code at delivery location <span style={{ fontWeight: 700 }}>{order?.deliveryLocation}</span> to complete the handover.
          </p>
        </div>

        <div className="input-group">
          <input
            type="text"
            className="input-field"
            placeholder="Enter 4-digit OTP"
            maxLength={4}
            value={otpInput}
            onChange={e => setOtpInput(e.target.value)}
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '0.5em',
              textAlign: 'center',
              padding: '0.6rem'
            }}
          />
        </div>

        <button
          className="btn btn-lg btn-primary"
          onClick={handleVerify}
          disabled={isVerifying}
          style={{ width: '100%', gap: '0.5rem', background: 'var(--success)' }}
        >
          <CheckCircle2 size={18} />
          {isVerifying ? 'Verifying OTP...' : 'Verify OTP & Complete Delivery'}
        </button>
      </div>
    </Modal>
  );
}
