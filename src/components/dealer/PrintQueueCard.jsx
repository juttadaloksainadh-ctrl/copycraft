import React from 'react';
import { Printer, Download, Phone, MapPin, CheckCircle, Package, Key, ArrowRight, FileText, Layers, BookOpen, Palette, Copy } from 'lucide-react';
import Badge from '../common/Badge';

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
  if (!order) return null;

  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: `4px solid ${order.orderStatus === 'OUT_FOR_DELIVERY' ? 'var(--primary)' : 'var(--border-color)'}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>ORDER ID</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{order.id}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge status={order.orderStatus} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>₹{order.pricing?.finalPrice}</span>
        </div>
      </div>

      {/* Distributor Info & Delivery Destination */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--bg-app)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ASSIGNED DISTRIBUTOR</div>
          <div style={{ fontWeight: 700 }}>{order.distributorName || 'Rajesh Kumar (IIT Bombay Hub)'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary)', marginTop: '2px' }}>
            <Phone size={13} /> {order.distributorPhone || '+91 98111 22233'}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>DELIVERY HOSTEL/ROOM</div>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <MapPin size={13} color="var(--danger)" /> {order.deliveryLocation}
          </div>
        </div>
      </div>

      {/* Files List & Full Printing Specifications */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          DOCUMENTS & PRINT SPECIFICATIONS ({order.files?.length})
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
              padding: '0.75rem',
              borderBottom: idx < order.files.length - 1 ? '1px solid var(--border-color)' : 'none',
            }}>
              {/* File name + download */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={15} color="var(--primary)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{file.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    ({file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'})
                  </span>
                </div>
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(file.name)}`}
                  download={file.name}
                  className="btn btn-sm btn-secondary"
                  title="Secure File Download"
                  style={{ gap: '0.3rem', fontSize: '0.75rem' }}
                >
                  <Download size={13} /> Download
                </a>
              </div>

              {/* Specifications Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
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

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.5rem' }}>
        {order.orderStatus === 'ASSIGNED' && (
          <button className="btn btn-sm btn-primary" onClick={() => onStatusChange(order.id, 'PRINTING')} style={{ width: '100%' }}>
            <Printer size={15} /> Start Printing
          </button>
        )}
        {order.orderStatus === 'PRINTING' && (
          <button className="btn btn-sm btn-primary" onClick={() => onStatusChange(order.id, 'PACKAGING')} style={{ width: '100%' }}>
            <Package size={15} /> Mark Printed & Packaged
          </button>
        )}
        {order.orderStatus === 'PACKAGING' && (
          <button className="btn btn-sm btn-primary" onClick={() => onStatusChange(order.id, 'OUT_FOR_DELIVERY')} style={{ width: '100%' }}>
            <ArrowRight size={15} /> Dispatch for Delivery
          </button>
        )}
        {order.orderStatus === 'OUT_FOR_DELIVERY' && (
          <button className="btn btn-sm btn-primary" onClick={() => onVerifyPinClick(order)} style={{ width: '100%', background: 'var(--success)' }}>
            <Key size={15} /> Verify Delivery PIN
          </button>
        )}
        {order.orderStatus === 'DELIVERED' && (
          <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle size={16} /> Order Completed & Delivered
          </div>
        )}
      </div>
    </div>
  );
}

