import React from 'react';
import Modal from '../common/Modal';
import { Printer, ShoppingBag, ArrowRight } from 'lucide-react';

export default function StationeryHubChoiceModal({ isOpen, onClose, onSelectHub }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Campus Station Hub"
      maxWidth="500px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Choose your operational department to access your station dashboard:
        </p>

        {/* Option 1: Printing Hub */}
        <div
          onClick={() => onSelectHub('print')}
          className="card card-hover"
          style={{
            cursor: 'pointer',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            border: '2px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Printer size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Printing Hub</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Manage document print queues, paper specs, and print fulfillment.
            </p>
          </div>
          <ArrowRight size={20} color="var(--primary)" />
        </div>

        {/* Option 2: Stationery Hub */}
        <div
          onClick={() => onSelectHub('stationery')}
          className="card card-hover"
          style={{
            cursor: 'pointer',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            border: '2px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShoppingBag size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Stationery Hub</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Upload new stationery items with photos, set prices, toggle stock & fulfill orders.
            </p>
          </div>
          <ArrowRight size={20} color="#10B981" />
        </div>
      </div>
    </Modal>
  );
}
