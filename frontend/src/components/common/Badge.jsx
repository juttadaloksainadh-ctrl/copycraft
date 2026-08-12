import React from 'react';

export default function Badge({ status, type = 'status' }) {
  const statusConfig = {
    CREATED: { label: 'Order Placed', class: 'badge-primary' },
    ASSIGNED: { label: 'Assigned', class: 'badge-accent' },
    PRINTING: { label: 'Printing', class: 'badge-warning' },
    PRINTED: { label: 'Printed', class: 'badge-primary' },
    PACKAGING: { label: 'Packaging', class: 'badge-warning' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', class: 'badge-primary' },
    DELIVERED: { label: 'Delivered', class: 'badge-success' },
    CANCELLED: { label: 'Cancelled', class: 'badge-danger' },
    PAID: { label: 'Paid', class: 'badge-success' },
    PENDING: { label: 'Pending', class: 'badge-warning' },
    LOW_STOCK: { label: 'Low Stock', class: 'badge-warning' },
    CRITICAL: { label: 'Critical', class: 'badge-danger' },
    ADEQUATE: { label: 'In Stock', class: 'badge-success' }
  };

  const config = statusConfig[status] || { label: status, class: 'badge-primary' };

  return (
    <span className={`badge ${config.class}`}>
      {config.label}
    </span>
  );
}
