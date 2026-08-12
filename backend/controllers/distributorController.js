import { db } from '../models/dbStore.js';

export const getDistributorDashboard = (req, res) => {
  const colleges = db.colleges;
  const dealers = db.users.filter(u => u.role === 'dealer');
  const orders = db.orders;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.pricing?.finalPrice || 0), 0);

  const collegeStats = colleges.map(c => {
    const clgOrders = orders.filter(o => o.collegeId === c.id);
    const revenue = clgOrders.reduce((sum, o) => sum + (o.pricing?.finalPrice || 0), 0);
    return {
      ...c,
      orderCount: clgOrders.length,
      totalRevenue: Math.round(revenue)
    };
  });

  return res.json({
    success: true,
    stats: {
      totalColleges: colleges.length,
      activeDealers: dealers.length,
      totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue)
    },
    collegeStats,
    dealers: dealers.map(({ passwordHash, ...d }) => d),
    recentOrders: orders.slice(0, 10)
  });
};

export const assignDealerToOrder = (req, res) => {
  const { orderId, dealerId } = req.body;

  const order = db.orders.find(o => o.id === orderId);
  const dealer = db.users.find(u => u.id === dealerId && u.role === 'dealer');

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!dealer) return res.status(404).json({ success: false, message: 'Dealer not found' });

  order.dealerId = dealer.id;
  order.dealerName = dealer.name;
  order.orderStatus = 'ASSIGNED';
  order.timeline.push({
    status: 'ASSIGNED',
    time: new Date().toISOString(),
    note: `Assigned to dealer ${dealer.name} by Distributor`
  });

  return res.json({ success: true, message: `Order assigned to ${dealer.name}`, order });
};

/**
 * POST /api/distributor/orders/:id/verify-delivery-pin
 * The distributor verifies the customer's 6-digit delivery PIN on handoff.
 * On success:
 *   - Order is marked DELIVERED with a precise deliveredAt timestamp.
 *   - The 48h R2 file cleanup scheduler uses this timestamp to schedule deletion.
 */
export const verifyDeliveryPin = (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;

  const order = db.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (order.orderStatus === 'DELIVERED') {
    return res.status(400).json({ success: false, message: 'Order has already been delivered.' });
  }

  // Look up the customer's permanent 6-digit delivery PIN
  const customer = db.users.find(u => u.id === order.customerId);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer record not found' });

  if (customer.deliveryPin !== String(pin)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid delivery PIN. Please ask the customer for their 6-digit delivery PIN.'
    });
  }

  // PIN matched — mark order as DELIVERED and stamp exact delivery time
  const deliveredAt = new Date().toISOString();
  order.orderStatus = 'DELIVERED';
  order.paymentStatus = 'PAID';
  order.deliveredAt = deliveredAt; // ← 48h file cleanup timer starts from this moment
  order.timeline.push({
    status: 'DELIVERED',
    time: deliveredAt,
    note: `Delivered and PIN verified by distributor ${req.user.name}. Files scheduled for permanent deletion in 48h.`
  });

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'DELIVERY_PIN_VERIFIED',
    details: `Distributor verified delivery PIN for order ${order.id} (customer: ${customer.name}). Files will be auto-deleted at ${new Date(Date.now() + 48 * 3600000).toISOString()}.`,
    timestamp: deliveredAt
  });

  console.log(`   📦 Order ${order.id} DELIVERED by distributor ${req.user.name} — R2 files will be purged 48h from now (${new Date(Date.now() + 48 * 3600000).toLocaleString()})`);

  return res.json({
    success: true,
    message: 'Delivery PIN verified! Order successfully delivered. Customer files will be permanently deleted in 48 hours.',
    order,
    fileDeletionScheduledAt: new Date(Date.now() + 48 * 3600000).toISOString()
  });
};
