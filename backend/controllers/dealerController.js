import { db } from '../models/dbStore.js';

export const getDealerQueue = (req, res) => {
  // Dealers see orders assigned to them or unassigned in ANY of their assigned colleges
  const userCollegeIds = Array.isArray(req.user.collegeIds) && req.user.collegeIds.length > 0
    ? req.user.collegeIds
    : (req.user.collegeId ? [req.user.collegeId] : []);

  const dealerOrders = db.orders.filter(o => 
    o.dealerId === req.user.id || 
    (userCollegeIds.includes(o.collegeId) && o.orderStatus !== 'CANCELLED')
  );

  const inventoryItems = db.inventory.filter(i => i.dealerId === req.user.id || !i.dealerId);

  // Resolve all assigned colleges for this dealer
  const assignedColleges = db.colleges.filter(c => userCollegeIds.includes(c.id));
  const collegeNames = assignedColleges.map(c => c.name).join(' • ');
  const collegeCities = [...new Set(assignedColleges.map(c => c.city))].join(', ');

  return res.json({
    success: true,
    orders: dealerOrders,
    inventory: inventoryItems,
    collegeName: collegeNames || (assignedColleges[0]?.name ?? null),
    collegeCity: collegeCities || (assignedColleges[0]?.city ?? null),
    assignedColleges: assignedColleges.map(c => ({ id: c.id, name: c.name, city: c.city }))
  });
};

export const updateOrderStatus = (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const order = db.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const validStatuses = ['ASSIGNED', 'PRINTING', 'PRINTED', 'PACKAGING', 'OUT_FOR_DELIVERY', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid order status. Use distributor portal to verify delivery PIN and mark as DELIVERED.' });
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
