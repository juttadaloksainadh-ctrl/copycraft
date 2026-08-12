import React from 'react';
import { Sparkles, AlertTriangle, Info, Check, ArrowRight } from 'lucide-react';
import Modal from '../common/Modal';

export default function AiSuggestionsModal({ isOpen, onClose, suggestions = [], onApplySuggestion }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CopyCraft AI Document Insights" maxWidth="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
          <Sparkles size={20} color="var(--primary)" />
          <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
            Smart recommendations powered by CopyCraft Vision AI.
          </div>
        </div>

        {suggestions.length > 0 ? (
          suggestions.map((s, idx) => (
            <div key={idx} className="card" style={{ padding: '1rem', borderLeft: `4px solid ${s.severity === 'warning' ? 'var(--warning)' : 'var(--primary)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                {s.severity === 'warning' ? <AlertTriangle size={18} color="var(--warning)" /> : <Info size={18} color="var(--primary)" />}
                <span>{s.title}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                {s.message}
              </p>

              {s.action && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => { onApplySuggestion(s); onClose(); }}
                  style={{ gap: '0.4rem' }}
                >
                  <span>Apply Recommendation</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            No document quality warnings detected. File is 100% print ready!
          </div>
        )}
      </div>
    </Modal>
  );
}
