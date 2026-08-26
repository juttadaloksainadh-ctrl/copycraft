import { db } from '../models/dbStore.js';

export const getDistributorDashboard = (req, res) => {
  const user = req.user;

  // Determine college IDs assigned to this distributor
  const userCollegeIds = Array.isArray(user?.collegeIds) && user.collegeIds.length > 0
    ? user.collegeIds
    : (user?.collegeId ? [user.collegeId] : []);

  const isSuperUser = ['admin', 'super_admin'].includes(user?.role);
  const isGlobalView = isSuperUser && userCollegeIds.length === 0;

  // Filter colleges assigned to distributor
  const colleges = isGlobalView
    ? db.colleges
    : db.colleges.filter(c => userCollegeIds.includes(c.id));

  const collegeIdSet = new Set(colleges.map(c => c.id));

  // Filter dealers belonging to distributor's assigned colleges
  const dealers = db.users.filter(u => {
    if (u.role !== 'dealer') return false;
    if (isGlobalView) return true;
    if (u.collegeId && collegeIdSet.has(u.collegeId)) return true;
    if (Array.isArray(u.collegeIds) && u.collegeIds.some(cid => collegeIdSet.has(cid))) return true;
    return false;
  });

  // Filter orders: ONLY orders for the colleges assigned to this distributor
  const orders = isGlobalView
    ? db.orders
    : db.orders.filter(o => o.collegeId && collegeIdSet.has(o.collegeId));

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
    recentOrders: orders
  });
};

export const assignDealerToOrder = (req, res) => {
  const { orderId, dealerId } = req.body;
  const user = req.user;

  const order = db.orders.find(o => o.id === orderId);
  const dealer = db.users.find(u => u.id === dealerId && u.role === 'dealer');

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!dealer) return res.status(404).json({ success: false, message: 'Dealer not found' });

  // Security Check: ensure order belongs to distributor's assigned colleges
  const userCollegeIds = Array.isArray(user?.collegeIds) && user.collegeIds.length > 0
    ? user.collegeIds
    : (user?.collegeId ? [user.collegeId] : []);
  const isSuperUser = ['admin', 'super_admin'].includes(user?.role);

  if (!isSuperUser && userCollegeIds.length > 0 && !userCollegeIds.includes(order.collegeId)) {
    return res.status(403).json({ success: false, message: 'You are not authorized to manage orders for this college' });
  }

  order.dealerId = dealer.id;
  order.dealerName = dealer.name;
  order.orderStatus = 'ASSIGNED';
  order.timeline.push({
    status: 'ASSIGNED',
    time: new Date().toISOString(),
    note: `Assigned to dealer ${dealer.name} by Distributor ${user.name}`
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

  if (!pin || String(pin).trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Please enter the 6-digit delivery PIN' });
  }

  const order = db.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  // Security Check: ensure order belongs to distributor's assigned colleges
  const userCollegeIds = Array.isArray(req.user?.collegeIds) && req.user.collegeIds.length > 0
    ? req.user.collegeIds
    : (req.user?.collegeId ? [req.user.collegeId] : []);
  const isSuperUser = ['admin', 'super_admin'].includes(req.user?.role);

  if (!isSuperUser && userCollegeIds.length > 0 && !userCollegeIds.includes(order.collegeId)) {
    return res.status(403).json({ success: false, message: 'You are not authorized to deliver orders for this college' });
  }

  if (order.orderStatus === 'DELIVERED') {
    return res.status(400).json({ success: false, message: 'Order has already been delivered.' });
  }

  // Look up the customer's permanent 6-digit delivery PIN
  let customer = db.users.find(u => u.id === order.customerId);
  if (!customer && order.customerPhone) {
    customer = db.users.find(u => u.phone === order.customerPhone);
  }
  if (!customer && order.customerEmail) {
    customer = db.users.find(u => u.email === order.customerEmail);
  }

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer record not found for this order' });
  }

  const customerPin = String(customer.deliveryPin || order.deliveryPin || '').trim();
  const enteredPin = String(pin).trim();

  if (!customerPin || customerPin !== enteredPin) {
    return res.status(400).json({
      success: false,
      message: 'Invalid delivery PIN. The entered PIN does not match the customer\'s verification PIN.'
    });
  }

  // PIN matched — mark order as DELIVERED and stamp exact delivery time
  const deliveredAt = new Date().toISOString();
  const isCOD = order.paymentMethod === 'COD' || !order.paymentMethod;

  order.orderStatus = 'DELIVERED';
  order.paymentStatus = 'PAID'; // COD: cash collected on delivery; Online: already paid
  order.deliveredAt = deliveredAt; // ← 48h file cleanup timer starts from this moment
  order.timeline.push({
    status: 'DELIVERED',
    time: deliveredAt,
    note: `Delivered and PIN verified by delivery coordinator ${req.user.name}. Payment: ${isCOD ? 'Cash collected on delivery (COD)' : `Online (${order.paymentMethod}) — pre-paid`}.`
  });

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'DELIVERY_PIN_VERIFIED',
    details: `Delivery coordinator verified PIN for order ${order.id} (customer: ${customer.name}). Status marked DELIVERED.`,
    timestamp: deliveredAt
  });

  return res.json({
    success: true,
    message: `Delivery PIN verified! Order #${order.id} delivered successfully.`,
    order,
    paymentMethod: order.paymentMethod || 'COD',
    paymentStatus: order.paymentStatus
  });
};

/**
 * POST /api/distributor/orders/:id/mark-printed
 * The distributor marks an order as PRINTED.
 */
export const markOrderPrinted = (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const order = db.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  // Security Check: ensure order belongs to distributor's assigned colleges
  const userCollegeIds = Array.isArray(user?.collegeIds) && user.collegeIds.length > 0
    ? user.collegeIds
    : (user?.collegeId ? [user.collegeId] : []);
  const isSuperUser = ['admin', 'super_admin'].includes(user?.role);

  if (!isSuperUser && userCollegeIds.length > 0 && !userCollegeIds.includes(order.collegeId)) {
    return res.status(403).json({ success: false, message: 'You are not authorized to update orders for this college' });
  }

  order.orderStatus = 'PRINTED';
  order.timeline.push({
    status: 'PRINTED',
    time: new Date().toISOString(),
    note: `Order marked as PRINTED by Distributor ${user.name}`
  });

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: user.id,
    userName: user.name,
    action: 'ORDER_MARKED_PRINTED',
    details: `Distributor ${user.name} marked order ${order.id} as PRINTED.`,
    timestamp: new Date().toISOString()
  });

  return res.json({
    success: true,
    message: `Order #${order.id} marked as PRINTED!`,
    order
  });
};

