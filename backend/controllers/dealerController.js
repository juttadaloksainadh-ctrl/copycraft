import { db } from '../models/dbStore.js';

export const getDealerQueue = (req, res) => {
  // Dealers see orders assigned to them or unassigned in their college
  const dealerOrders = db.orders.filter(o => 
    o.dealerId === req.user.id || 
    (o.collegeId === req.user.collegeId && o.orderStatus !== 'CANCELLED')
  );

  const inventoryItems = db.inventory.filter(i => i.dealerId === req.user.id || !i.dealerId);

  return res.json({
    success: true,
    orders: dealerOrders,
    inventory: inventoryItems
  });
};

export const updateOrderStatus = (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const order = db.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const validStatuses = ['ASSIGNED', 'PRINTING', 'PRINTED', 'PACKAGING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid order status' });
  }

  order.orderStatus = status;
  order.timeline.push({
    status,
    time: new Date().toISOString(),
    note: note || `Order updated to ${status} by ${req.user.name}`
  });

  // Log action
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'ORDER_STATUS_UPDATE',
    details: `Updated ${order.id} status to ${status}`,
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, message: `Status updated to ${status}`, order });
};

export const verifyDeliveryPin = (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;

  const order = db.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  // Look up the customer's permanent delivery PIN
  const customer = db.users.find(u => u.id === order.customerId);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer record not found' });

  if (customer.deliveryPin !== pin) {
    return res.status(400).json({ success: false, message: 'Invalid delivery PIN. Please ask the customer for their 6-digit delivery PIN.' });
  }

  order.orderStatus = 'DELIVERED';
  order.paymentStatus = 'PAID';
  order.timeline.push({
    status: 'DELIVERED',
    time: new Date().toISOString(),
    note: `Delivered and verified via delivery PIN by ${req.user.name}`
  });

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'DELIVERY_PIN_VERIFIED',
    details: `Verified delivery PIN for order ${order.id} (customer: ${customer.name})`,
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, message: 'Delivery PIN verified! Order successfully delivered.', order });
};

export const updateInventoryItem = (req, res) => {
  const { id } = req.params;
  const { currentStock, status } = req.body;

  const item = db.inventory.find(i => i.id === id);
  if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found' });

  if (currentStock !== undefined) item.currentStock = currentStock;
  if (status) item.status = status;
  if (item.currentStock <= item.thresholdAlert) {
    item.status = item.currentStock <= 2 ? 'CRITICAL' : 'LOW_STOCK';
  } else {
    item.status = 'ADEQUATE';
  }

  return res.json({ success: true, message: 'Inventory item updated', item });
};
