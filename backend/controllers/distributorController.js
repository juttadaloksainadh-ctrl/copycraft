import { db } from '../models/dbStore.js';
import { isUsingMongo, getMongoCollection } from '../config/db.js';

async function findCustomerForOrder(order) {
  let customer = null;

  // 1. Query MongoDB if active
  if (isUsingMongo()) {
    try {
      const usersCol = getMongoCollection('users');
      if (order.customerId) {
        customer = await usersCol.findOne({ id: order.customerId });
      }
      if (!customer && order.customerPhone) {
        customer = await usersCol.findOne({ phone: order.customerPhone });
      }
      if (!customer && order.customerEmail) {
        customer = await usersCol.findOne({ email: { $regex: new RegExp(`^${order.customerEmail}$`, 'i') } });
      }
    } catch (err) {
      console.error('Mongo customer lookup error in distributorController:', err.message);
    }
  }

  // 2. Query in-memory db.users
  if (!customer) {
    customer = db.users.find(u => u.id === order.customerId) ||
               db.users.find(u => u.phone && u.phone === order.customerPhone) ||
               db.users.find(u => u.email && u.email.toLowerCase() === order.customerEmail?.toLowerCase());
  }

  // 3. Fallback: Construct customer profile from order metadata & PIN
  if (!customer && (order.customerId || order.customerPhone || order.customerEmail || order.deliveryPin)) {
    customer = {
      id: order.customerId || 'usr_guest',
      name: order.customerName || 'Customer',
      phone: order.customerPhone || '',
      email: order.customerEmail || '',
      deliveryPin: order.deliveryPin || ''
    };
  }

  return customer;
}

export const getDistributorDashboard = async (req, res) => {
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

  // Fetch dealers (from MongoDB or db.users)
  let dealers = [];
  if (isUsingMongo()) {
    try {
      const usersCol = getMongoCollection('users');
      const mongoDealers = await usersCol.find({ role: 'dealer' }).toArray();
      dealers = mongoDealers.filter(u => {
        if (isGlobalView) return true;
        if (u.collegeId && collegeIdSet.has(u.collegeId)) return true;
        if (Array.isArray(u.collegeIds) && u.collegeIds.some(cid => collegeIdSet.has(cid))) return true;
        return false;
      });
    } catch (_) {}
  }
  if (dealers.length === 0) {
    dealers = db.users.filter(u => {
      if (u.role !== 'dealer') return false;
      if (isGlobalView) return true;
      if (u.collegeId && collegeIdSet.has(u.collegeId)) return true;
      if (Array.isArray(u.collegeIds) && u.collegeIds.some(cid => collegeIdSet.has(cid))) return true;
      return false;
    });
  }

  // Fetch orders (from MongoDB or db.orders)
  let orders = [];
  if (isUsingMongo()) {
    try {
      const ordersCol = getMongoCollection('orders');
      const mongoOrders = await ordersCol.find({}).sort({ createdAt: -1 }).toArray();
      orders = isGlobalView
        ? mongoOrders
        : mongoOrders.filter(o => o.collegeId && collegeIdSet.has(o.collegeId));
    } catch (_) {}
  }
  if (orders.length === 0) {
    orders = isGlobalView
      ? db.orders
      : db.orders.filter(o => o.collegeId && collegeIdSet.has(o.collegeId));
  }

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

export const assignDealerToOrder = async (req, res) => {
  const { orderId, dealerId } = req.body;
  const user = req.user;

  let order = db.orders.find(o => o.id === orderId);
  let dealer = db.users.find(u => u.id === dealerId && u.role === 'dealer');

  if (isUsingMongo()) {
    try {
      const ordersCol = getMongoCollection('orders');
      const usersCol = getMongoCollection('users');
      if (!order) order = await ordersCol.findOne({ id: orderId });
      if (!dealer) dealer = await usersCol.findOne({ id: dealerId, role: 'dealer' });
    } catch (_) {}
  }

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
  order.timeline = order.timeline || [];
  order.timeline.push({
    status: 'ASSIGNED',
    time: new Date().toISOString(),
    note: `Assigned to dealer ${dealer.name} by Distributor ${user.name}`
  });

  if (isUsingMongo()) {
    try {
      const ordersCol = getMongoCollection('orders');
      await ordersCol.updateOne(
        { id: order.id },
        {
          $set: {
            dealerId: dealer.id,
            dealerName: dealer.name,
            orderStatus: 'ASSIGNED',
            timeline: order.timeline
          }
        }
      );
    } catch (_) {}
  }

  return res.json({ success: true, message: `Order assigned to ${dealer.name}`, order });
};

/**
 * POST /api/distributor/orders/:id/verify-delivery-pin
 * The distributor verifies the customer's 6-digit delivery PIN on handoff.
 */
export const verifyDeliveryPin = async (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;

  if (!pin || String(pin).trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Please enter the 6-digit delivery PIN' });
  }

  let order = db.orders.find(o => o.id === id);

  if (!order && isUsingMongo()) {
    try {
      const ordersCol = getMongoCollection('orders');
      order = await ordersCol.findOne({ id });
    } catch (_) {}
  }

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

  // Look up customer (handles MongoDB & in-memory & fallback)
  const customer = await findCustomerForOrder(order);

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
  order.paymentStatus = 'PAID'; // COD: cash collected on delivery; Online: pre-paid
  order.deliveredAt = deliveredAt;
  order.timeline = order.timeline || [];
  order.timeline.push({
    status: 'DELIVERED',
    time: deliveredAt,
    note: `Delivered and PIN verified by delivery coordinator ${req.user.name}. Payment: ${isCOD ? 'Cash collected on delivery (COD)' : `Online (${order.paymentMethod}) — pre-paid`}.`
  });

  // Update in MongoDB if active
  if (isUsingMongo()) {
    try {
      const ordersCol = getMongoCollection('orders');
      await ordersCol.updateOne(
        { id: order.id },
        {
          $set: {
            orderStatus: 'DELIVERED',
            paymentStatus: 'PAID',
            deliveredAt,
            timeline: order.timeline
          }
        }
      );
    } catch (e) {
      console.error('Mongo order update error:', e.message);
    }
  }

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
export const markOrderPrinted = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  let order = db.orders.find(o => o.id === id);

  if (!order && isUsingMongo()) {
    try {
      const ordersCol = getMongoCollection('orders');
      order = await ordersCol.findOne({ id });
    } catch (_) {}
  }

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
  order.timeline = order.timeline || [];
  order.timeline.push({
    status: 'PRINTED',
    time: new Date().toISOString(),
    note: `Order marked as PRINTED by Distributor ${user.name}`
  });

  if (isUsingMongo()) {
    try {
      const ordersCol = getMongoCollection('orders');
      await ordersCol.updateOne(
        { id: order.id },
        {
          $set: {
            orderStatus: 'PRINTED',
            timeline: order.timeline
          }
        }
      );
    } catch (_) {}
  }

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
