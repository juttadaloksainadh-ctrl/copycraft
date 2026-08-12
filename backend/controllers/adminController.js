import { db } from '../models/dbStore.js';
import { PRICING_DEFAULTS } from '../services/pricingService.js';
import bcrypt from 'bcryptjs';

export const getAdminAnalytics = (req, res) => {
  const users = db.users;
  const orders = db.orders;
  const colleges = db.colleges;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.pricing?.finalPrice || 0), 0);
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const totalDealers = users.filter(u => u.role === 'dealer').length;
  const totalDistributors = users.filter(u => u.role === 'distributor').length;

  const revenueChartData = [
    { label: 'Jan', revenue: 42000, orders: 410 },
    { label: 'Feb', revenue: 58000, orders: 590 },
    { label: 'Mar', revenue: 64000, orders: 670 },
    { label: 'Apr', revenue: 72000, orders: 740 },
    { label: 'May', revenue: 89000, orders: 920 },
    { label: 'Jun', revenue: 95000, orders: 1050 },
    { label: 'Jul', revenue: 112000, orders: 1240 },
    { label: 'Aug', revenue: Math.round(totalRevenue + 120000), orders: orders.length + 1300 }
  ];

  const collegePerformance = colleges.map(c => ({
    name: c.name,
    city: c.city,
    orders: orders.filter(o => o.collegeId === c.id).length + c.totalOrders,
    dealers: c.activeDealers
  }));

  const lowStockAlerts = db.inventory.filter(i => i.status === 'LOW_STOCK' || i.status === 'CRITICAL');

  return res.json({
    success: true,
    metrics: {
      totalRevenue: Math.round(totalRevenue + 556000),
      totalOrders: orders.length + 4550,
      totalCustomers: totalCustomers + 2300,
      totalDealers,
      totalDistributors,
      totalColleges: colleges.length,
      lowStockCount: lowStockAlerts.length
    },
    charts: {
      revenueChartData,
      collegePerformance
    },
    recentOrders: orders.slice(0, 10),
    lowStockAlerts,
    auditLogs: db.auditLogs.slice(0, 15)
  });
};

export const getAllUsers = (req, res) => {
  const sanitizedUsers = db.users.map(({ passwordHash, ...u }) => u);
  return res.json({ success: true, users: sanitizedUsers });
};

export const createCoupon = (req, res) => {
  const { code, discountPercentage, maxDiscount, minOrderValue, expiryDate } = req.body;

  if (!code || !discountPercentage) {
    return res.status(400).json({ success: false, message: 'Coupon code and percentage are required' });
  }

  const newCoupon = {
    id: `cpn_${Date.now()}`,
    code: code.toUpperCase(),
    discountPercentage: Number(discountPercentage),
    maxDiscount: Number(maxDiscount || 100),
    minOrderValue: Number(minOrderValue || 0),
    expiryDate: expiryDate || '2026-12-31',
    active: true
  };

  db.coupons.push(newCoupon);

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'COUPON_CREATE',
    details: `Created coupon ${newCoupon.code} (${newCoupon.discountPercentage}%)`,
    timestamp: new Date().toISOString()
  });

  return res.status(201).json({ success: true, message: 'Coupon created successfully', coupon: newCoupon });
};

export const getCoupons = (req, res) => {
  return res.json({ success: true, coupons: db.coupons });
};

export const updatePricingDefaults = (req, res) => {
  const { printMode, binding, lamination } = req.body;

  if (printMode) Object.assign(PRICING_DEFAULTS.printMode, printMode);
  if (binding) Object.assign(PRICING_DEFAULTS.binding, binding);
  if (lamination) Object.assign(PRICING_DEFAULTS.lamination, lamination);

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'PRICING_RULES_UPDATE',
    details: 'Updated global dynamic pricing rates matrix',
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, message: 'Pricing rates updated successfully', pricingDefaults: PRICING_DEFAULTS });
};

export const getAuditLogs = (req, res) => {
  return res.json({ success: true, auditLogs: db.auditLogs });
};

export const createStaffAccount = (req, res) => {
  const { name, email, password, phone, role, collegeId } = req.body;
  if (!name || !email || !password || !role || !collegeId) {
    return res.status(400).json({ success: false, message: 'All staff profile fields are required' });
  }
  const exists = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ success: false, message: 'Email account already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newStaff = {
    id: `usr_${role}_${Date.now()}`,
    email,
    passwordHash,
    name,
    phone: phone || '+91 98000 00000',
    role, // 'dealer' | 'distributor'
    collegeId,
    createdAt: new Date().toISOString()
  };

  db.users.push(newStaff);

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'STAFF_CREATE',
    details: `Created new staff account for ${name} (${role}) assigned to ${collegeId}`,
    timestamp: new Date().toISOString()
  });

  return res.status(201).json({ success: true, message: `${role.toUpperCase()} account created successfully`, user: { id: newStaff.id, name, email, role } });
};

export const deleteStaffAccount = (req, res) => {
  const { id } = req.params;
  const userIndex = db.users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'Staff user account not found' });
  }

  const targetUser = db.users[userIndex];
  if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
    return res.status(403).json({ success: false, message: 'Cannot delete administrator accounts' });
  }

  db.users.splice(userIndex, 1);

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'STAFF_DELETE',
    details: `Permanently deleted staff account ${targetUser.name} (${targetUser.role})`,
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, message: 'Staff account deleted permanently' });
};

export const createCollege = (req, res) => {
  const { name, code, city, deliveryLocations } = req.body;
  if (!name || !code || !city) {
    return res.status(400).json({ success: false, message: 'College name, code, and city are required' });
  }
  const newCollege = {
    id: `clg_${Date.now()}`,
    name,
    code: code.toUpperCase(),
    city,
    activeDealers: 0,
    totalOrders: 0,
    deliveryLocations: deliveryLocations || ['Campus Main Hub']
  };
  db.colleges.push(newCollege);
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'COLLEGE_CREATE',
    details: `Added new college ${name} (${code}) in ${city} to availability list`,
    timestamp: new Date().toISOString()
  });
  return res.status(201).json({ success: true, message: 'College added successfully', college: newCollege });
};

export const updateCollege = (req, res) => {
  const { id } = req.params;
  const { name, code, city, deliveryLocations } = req.body;
  const college = db.colleges.find(c => c.id === id);
  if (!college) {
    return res.status(404).json({ success: false, message: 'College not found' });
  }
  if (name) college.name = name;
  if (code) college.code = code.toUpperCase();
  if (city) college.city = city;
  if (deliveryLocations) college.deliveryLocations = deliveryLocations;

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'COLLEGE_UPDATE',
    details: `Updated college details for ${college.name}`,
    timestamp: new Date().toISOString()
  });
  return res.json({ success: true, message: 'College details updated successfully', college });
};

export const deleteCollege = (req, res) => {
  const { id } = req.params;
  const idx = db.colleges.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'College not found' });
  }
  const removed = db.colleges.splice(idx, 1)[0];
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'COLLEGE_DELETE',
    details: `Deleted college ${removed.name} from availability list`,
    timestamp: new Date().toISOString()
  });
  return res.json({ success: true, message: 'College deleted successfully' });
};
