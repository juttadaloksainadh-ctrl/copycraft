import React from 'react';
import { CheckCircle2, Clock, Printer, Package, Truck, Key, Check } from 'lucide-react';
import Badge from '../common/Badge';

export default function OrderTracker({ order }) {
  if (!order) return null;

  const steps = [
    { status: 'CREATED', label: 'Order Placed', icon: Clock },
    { status: 'ASSIGNED', label: 'Dealer Assigned', icon: CheckCircle2 },
    { status: 'PRINTING', label: 'Printing In Progress', icon: Printer },
    { status: 'PACKAGING', label: 'Finishing & Packaging', icon: Package },
    { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
    { status: 'DELIVERED', label: 'Delivered', icon: Check }
  ];

  const statusOrder = ['CREATED', 'ASSIGNED', 'PRINTING', 'PACKAGING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentIndex = statusOrder.indexOf(order.orderStatus);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>LIVE ORDER TIMELINE</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {order.id}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Badge status={order.orderStatus} />
          {['OUT_FOR_DELIVERY'].includes(order.orderStatus) && (
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: '1px solid var(--border-focus)'
            }}>
              <Key size={16} /> Use your Delivery PIN to confirm receipt
            </div>
          )}
        </div>
      </div>

      {/* Interactive Timeline Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '1rem 0' }}>
        {/* Background Line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '5%',
          right: '5%',
          height: '4px',
          background: 'var(--border-color)',
          zIndex: 1,
          transform: 'translateY(-50%)'
        }}>
          <div style={{
            height: '100%',
            width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%`,
            background: 'var(--primary)',
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Step Nodes */}
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.status} style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: isCompleted ? 'var(--primary)' : 'var(--bg-surface)',
                color: isCompleted ? '#FFFFFF' : 'var(--text-muted)',
                border: `2px solid ${isCompleted ? 'var(--primary)' : 'var(--border-color)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isCurrent ? '0 0 0 4px var(--primary-light)' : 'none',
                transition: 'all var(--transition-fast)'
              }}>
                <Icon size={18} />
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: isCurrent ? 800 : 500,
                color: isCurrent ? 'var(--primary)' : 'var(--text-muted)',
                textAlign: 'center',
                maxWidth: '85px'
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Order Logs / History Notes */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          ACTIVITY UPDATES
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {order.timeline?.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.note}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(item.time).toLocaleTimeString()} • {new Date(item.time).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
