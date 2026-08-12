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
