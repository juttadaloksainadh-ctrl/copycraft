import React from 'react';
import { Printer, Download, Phone, MapPin, CheckCircle, Package, Key, ArrowRight } from 'lucide-react';
import Badge from '../common/Badge';

export default function PrintQueueCard({ order, onStatusChange, onVerifyOtpClick }) {
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

      {/* Files List & Printing Specs */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          DOCUMENTS ({order.files?.length})
        </div>
        {order.files?.map((file, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{file.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {file.pageCount} Pages • {file.printMode === 'color' ? 'Full Colour' : 'B&W'} • {file.sideMode === 'double' ? 'Duplex' : 'Single'} • Binding: {file.binding}
              </div>
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
        ))}
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
          <button className="btn btn-sm btn-primary" onClick={() => onVerifyOtpClick(order)} style={{ width: '100%', background: 'var(--success)' }}>
            <Key size={15} /> Verify Delivery OTP
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
