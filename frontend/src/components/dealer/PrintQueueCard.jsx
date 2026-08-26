import React, { useState } from 'react';
import { Printer, Download, Phone, MapPin, CheckCircle, Package, Key, ArrowRight, FileText, Layers, BookOpen, Palette, Copy, Loader2 } from 'lucide-react';
import Badge from '../common/Badge';
import { getFileDownloadUrl } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

// Human-readable labels for print spec values
const SPEC_LABELS = {
  printMode: { bw: 'Black & White', color: 'Full Colour' },
  sideMode: { single: 'Single-Sided', double: 'Double-Sided (Duplex)' },
  binding: { none: 'No Binding', staple: 'Staple', spiral: 'Spiral Binding', softcover: 'Soft Cover', hardcover: 'Hard Cover' },
  lamination: { none: 'No Lamination', front: 'Front Only', both: 'Front & Back', full: 'Full Lamination' },
  coverSheet: { none: 'No Cover', transparent: 'Transparent Cover', cardboard: 'Cardboard Cover' },
  paperSize: { A4: 'A4', A3: 'A3', Letter: 'Letter', Legal: 'Legal' }
};

function SpecTag({ label, value, highlight = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '0.35rem 0.6rem',
      borderRadius: 'var(--radius-sm)',
      background: highlight ? 'var(--primary-light)' : 'var(--bg-app)',
      border: `1px solid ${highlight ? 'var(--border-focus)' : 'var(--border-color)'}`,
      minWidth: '0'
    }}>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: highlight ? 'var(--primary)' : 'var(--text-main)' }}>
        {value}
      </span>
    </div>
  );
}

export default function PrintQueueCard({ order, onStatusChange, onVerifyPinClick }) {
  const { addToast } = useToast();
  const [downloadingFileId, setDownloadingFileId] = useState(null);

  if (!order) return null;

  const handleDownload = async (file) => {
    setDownloadingFileId(file.id);
    try {
      const res = await getFileDownloadUrl(order.id, file.id);
      if (res.success && res.downloadUrl) {
        // Trigger browser download
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = res.fileName || file.name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast(`Downloading ${file.name}...`, 'success');
      } else {
        // Fallback: direct download link if available
        if (file.r2Url) {
          window.open(file.r2Url, '_blank');
        } else {
          addToast(res.message || 'File download initiated', 'info');
        }
      }
    } catch (err) {
      addToast('Error downloading file', 'error');
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: `4px solid ${order.orderStatus === 'OUT_FOR_DELIVERY' ? 'var(--primary)' : 'var(--border-color)'}` }}>
      {/* Header — Order ID */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ORDER ID</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{order.id}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge status={order.orderStatus} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>₹{order.pricing?.finalPrice}</span>
        </div>
      </div>

      {/* Sub-box: Distributor Details & Delivery Hostel/Room */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--bg-app)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>DISTRIBUTOR DETAILS</div>
          <div style={{ fontWeight: 700, marginTop: '2px' }}>{order.distributorName || 'Assigned Distributor'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary)', marginTop: '2px', fontSize: '0.8rem', fontWeight: 600 }}>
            <Phone size={13} /> {order.distributorPhone || 'N/A'}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>DELIVERY LOCATION</div>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
            <MapPin size={13} color="var(--danger)" /> {order.deliveryLocation || 'Campus Hostel'}
          </div>
        </div>
      </div>

      {/* Main Box: Order Details & Print Specifications */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', background: 'var(--bg-card)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          ORDER DETAILS & DOCUMENTS ({order.files?.length})
        </div>
        {order.files?.map((file, idx) => {
          const printMode = file.printMode || 'bw';
          const sideMode = file.sideMode || 'single';
          const binding = file.binding || 'none';
          const lamination = file.lamination || 'none';
          const coverSheet = file.coverSheet || 'none';
          const paperSize = file.paperSize || 'A4';
          const quantity = file.quantity || 1;

          return (
            <div key={idx} style={{
              padding: '0.6rem 0',
              borderBottom: idx < order.files.length - 1 ? '1px solid var(--border-color)' : 'none',
            }}>
              {/* File name + download button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '0' }}>
                  <FileText size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                    ({file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(file)}
                  disabled={downloadingFileId === file.id}
                  className="btn btn-sm btn-secondary"
                  title="Download customer document for printing"
                  style={{ gap: '0.3rem', fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                >
                  {downloadingFileId === file.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  {downloadingFileId === file.id ? 'Fetching...' : 'Download PDF'}
                </button>
              </div>

              {/* Specifications Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: '0.4rem'
              }}>
                <SpecTag label="Paper" value={SPEC_LABELS.paperSize[paperSize] || paperSize} highlight={paperSize !== 'A4'} />
                <SpecTag label="Print" value={SPEC_LABELS.printMode[printMode] || printMode} highlight={printMode === 'color'} />
                <SpecTag label="Sides" value={SPEC_LABELS.sideMode[sideMode] || sideMode} />
                <SpecTag label="Copies" value={`${quantity} ${quantity > 1 ? 'copies' : 'copy'}`} highlight={quantity > 1} />
                <SpecTag label="Binding" value={SPEC_LABELS.binding[binding] || binding} highlight={binding !== 'none'} />
                <SpecTag label="Lamination" value={SPEC_LABELS.lamination[lamination] || lamination} highlight={lamination !== 'none'} />
                {coverSheet !== 'none' && (
                  <SpecTag label="Cover" value={SPEC_LABELS.coverSheet[coverSheet] || coverSheet} highlight={true} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Area: Printing Completed Button */}
      <div style={{ marginTop: 'auto', paddingTop: '0.25rem' }}>
        {(order.orderStatus === 'ASSIGNED' || order.orderStatus === 'CREATED' || order.orderStatus === 'PRINTING') && (
          <button
            className="btn btn-lg btn-primary"
            onClick={() => onStatusChange(order.id, 'PRINTED')}
            style={{
              width: '100%',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              padding: '0.75rem',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <CheckCircle size={18} /> Printing Completed
          </button>
        )}

        {order.orderStatus === 'PRINTED' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{
              padding: '0.6rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '0.88rem',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              border: '1px solid var(--border-focus)'
            }}>
              <CheckCircle size={16} /> Printing Completed
            </div>
            <button
              className="btn btn-md btn-primary"
              onClick={() => onStatusChange(order.id, 'OUT_FOR_DELIVERY')}
              style={{ width: '100%', gap: '0.4rem' }}
            >
              <ArrowRight size={16} /> Dispatch for Delivery
            </button>
          </div>
        )}

        {order.orderStatus === 'PACKAGING' && (
          <button
            className="btn btn-md btn-primary"
            onClick={() => onStatusChange(order.id, 'OUT_FOR_DELIVERY')}
            style={{ width: '100%', gap: '0.4rem' }}
          >
            <ArrowRight size={16} /> Dispatch for Delivery
          </button>
        )}

        {order.orderStatus === 'OUT_FOR_DELIVERY' && (
          <button
            className="btn btn-md btn-primary"
            onClick={() => onVerifyPinClick(order)}
            style={{ width: '100%', background: 'var(--success)', borderColor: 'var(--success)', gap: '0.4rem' }}
          >
            <Key size={16} /> Verify Delivery PIN
          </button>
        )}

        {order.orderStatus === 'DELIVERED' && (
          <div style={{
            color: 'var(--success)',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem',
            padding: '0.6rem',
            background: 'rgba(16, 185, 129, 0.12)',
            borderRadius: 'var(--radius-md)'
          }}>
            <CheckCircle size={16} /> Order Completed & Delivered
          </div>
        )}
      </div>
    </div>
  );
}
