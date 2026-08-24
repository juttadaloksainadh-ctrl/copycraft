import { db, syncDbToR2 } from '../models/dbStore.js';
import { PRICING_DEFAULTS, applyPricingDefaults } from '../services/pricingService.js';
import { isUsingMongo, getMongoCollection } from '../config/db.js';
import bcrypt from 'bcryptjs';

export const getAdminAnalytics = (req, res) => {
  const users = db.users;
  const orders = db.orders;
  const colleges = db.colleges;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.pricing?.finalPrice || 0), 0);
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const totalDealers = users.filter(u => u.role === 'dealer').length;
  const totalDistributors = users.filter(u => u.role === 'distributor').length;

  // Build real monthly revenue chart data based on actual orders
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const revenueChartData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = monthNames[d.getMonth()];
    const mYear = d.getFullYear();
    const mMonth = d.getMonth();

    const mOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt || o.timeline?.[0]?.time || Date.now());
      return orderDate.getMonth() === mMonth && orderDate.getFullYear() === mYear;
    });

    const mRev = mOrders.reduce((sum, o) => sum + (o.pricing?.finalPrice || 0), 0);
    revenueChartData.push({
      label: `${mName}`,
      revenue: Math.round(mRev),
      orders: mOrders.length
    });
  }

  const collegePerformance = colleges.map(c => {
    const clgOrders = orders.filter(o => o.collegeId === c.id);
    const clgDealers = users.filter(u => u.role === 'dealer' && u.collegeId === c.id);
    return {
      name: c.name,
      city: c.city,
      orders: clgOrders.length,
      dealers: clgDealers.length
    };
  });

  const lowStockAlerts = db.inventory.filter(i => i.status === 'LOW_STOCK' || i.status === 'CRITICAL');

  return res.json({
    success: true,
    metrics: {
      totalRevenue: Math.round(totalRevenue),
      totalOrders: orders.length,
      totalCustomers: totalCustomers,
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
    allOrders: orders,
    lowStockAlerts,
    auditLogs: db.auditLogs.slice(0, 20)
  });
};

export const getAllUsers = (req, res) => {
  const sanitizedUsers = db.users.map(({ passwordHash, ...u }) => u);
  return res.json({ success: true, users: sanitizedUsers });
};

export const createCoupon = async (req, res) => {
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

  if (isUsingMongo()) {
    try {
      const col = getMongoCollection('coupons');
      await col.insertOne(newCoupon);
    } catch (e) {
      console.error('Mongo coupon insert error:', e.message);
    }
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'COUPON_CREATE',
    details: `Created coupon ${newCoupon.code} (${newCoupon.discountPercentage}%)`,
    timestamp: new Date().toISOString()
  });

  syncDbToR2();

  return res.status(201).json({ success: true, message: 'Coupon created successfully', coupon: newCoupon });
};

export const getCoupons = (req, res) => {
  return res.json({ success: true, coupons: db.coupons });
};

export const updatePricingDefaults = async (req, res) => {
  try {
    const { printMode, binding, lamination, paperBase, sideMode, convenienceFeeRate } = req.body;

    const updatedRates = applyPricingDefaults({
      printMode,
      binding,
      lamination,
      paperBase,
      sideMode,
      convenienceFeeRate
    });

    db.pricingDefaults = JSON.parse(JSON.stringify(updatedRates));

    if (isUsingMongo()) {
      try {
        const settingsCol = getMongoCollection('system_settings');
        await settingsCol.updateOne(
          { key: 'pricing_defaults' },
          { $set: { key: 'pricing_defaults', rates: updatedRates, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
        console.log('   💰 Global Pricing Matrix saved permanently to MongoDB');
      } catch (e) {
        console.error('Mongo pricing update error:', e.message);
      }
    }

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      userId: req.user.id,
      userName: req.user.name,
      action: 'PRICING_RULES_UPDATE',
      details: `Updated global dynamic pricing rates matrix (B&W: ₹${updatedRates.printMode?.bw}, Color: ₹${updatedRates.printMode?.color}, Spiral: ₹${updatedRates.binding?.spiral})`,
      timestamp: new Date().toISOString()
    });

    try {
      syncDbToR2();
    } catch (e) {
      console.error('R2 sync error during pricing update:', e.message);
    }

    return res.json({ success: true, message: 'Pricing rates updated successfully across all portals', pricingDefaults: updatedRates });
  } catch (err) {
    console.error('❌ updatePricingDefaults crashed:', err);
    return res.status(500).json({ success: false, message: `Pricing update error: ${err.message}` });
  }
};

export const getAuditLogs = (req, res) => {
  return res.json({ success: true, auditLogs: db.auditLogs });
};

export const createStaffAccount = async (req, res) => {
  const { name, email, password, phone, role, collegeId } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Staff name, email, password, and role are required' });
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
    collegeId: collegeId || '',
    createdAt: new Date().toISOString()
  };

  db.users.push(newStaff);

  if (isUsingMongo()) {
    try {
      const col = getMongoCollection('users');
      await col.insertOne(newStaff);
    } catch (e) {
      console.error('Mongo user insert error:', e.message);
    }
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'STAFF_CREATE',
    details: `Created new staff account for ${name} (${role}) assigned to ${collegeId || 'Central Hub'}`,
    timestamp: new Date().toISOString()
  });

  syncDbToR2();

  return res.status(201).json({ success: true, message: `${role.toUpperCase()} account created successfully`, user: { id: newStaff.id, name, email, role } });
};

export const deleteStaffAccount = async (req, res) => {
  const { id } = req.params;
  const userIndex = db.users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User account not found' });
  }

  const targetUser = db.users[userIndex];
  if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
    return res.status(403).json({ success: false, message: 'Cannot delete administrator accounts' });
  }

  db.users.splice(userIndex, 1);

  if (isUsingMongo()) {
    try {
      const col = getMongoCollection('users');
      await col.deleteOne({ id });
    } catch (e) {
      console.error('Mongo user delete error:', e.message);
    }
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'USER_DELETE',
    details: `Permanently deleted user account ${targetUser.name} (${targetUser.role})`,
    timestamp: new Date().toISOString()
  });

  syncDbToR2();

  return res.json({ success: true, message: 'User account deleted permanently' });
};

export const createCollege = async (req, res) => {
  const { name, code, city, deliveryLocations } = req.body;
  if (!name || !code || !city) {
    return res.status(400).json({ success: false, message: 'College name, code, and city are required' });
  }
  const newCollege = {
    id: `clg_${Date.now()}`,
    name,
    code: code.toUpperCase(),
    city,
    deliveryLocations: deliveryLocations || ['Campus Main Hub']
  };
  db.colleges.push(newCollege);

  if (isUsingMongo()) {
    try {
      const col = getMongoCollection('colleges');
      await col.insertOne(newCollege);
    } catch (e) {
      console.error('Mongo college insert error:', e.message);
    }
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'COLLEGE_CREATE',
    details: `Added new college ${name} (${code}) in ${city} to availability list`,
    timestamp: new Date().toISOString()
  });

  syncDbToR2();

  return res.status(201).json({ success: true, message: 'College added successfully', college: newCollege });
};

export const updateCollege = async (req, res) => {
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

  if (isUsingMongo()) {
    try {
      const col = getMongoCollection('colleges');
      await col.updateOne({ id }, { $set: { name: college.name, code: college.code, city: college.city, deliveryLocations: college.deliveryLocations } });
    } catch (e) {
      console.error('Mongo college update error:', e.message);
    }
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'COLLEGE_UPDATE',
    details: `Updated college details for ${college.name}`,
    timestamp: new Date().toISOString()
  });

  syncDbToR2();

  return res.json({ success: true, message: 'College details updated successfully', college });
};

export const deleteCollege = async (req, res) => {
  const { id } = req.params;
  const idx = db.colleges.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'College not found' });
  }
  const removed = db.colleges.splice(idx, 1)[0];

  if (isUsingMongo()) {
    try {
      const col = getMongoCollection('colleges');
      await col.deleteOne({ id });
    } catch (e) {
      console.error('Mongo college delete error:', e.message);
    }
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'COLLEGE_DELETE',
    details: `Deleted college ${removed.name} from availability list`,
    timestamp: new Date().toISOString()
  });

  syncDbToR2();

  return res.json({ success: true, message: 'College deleted successfully' });
};

