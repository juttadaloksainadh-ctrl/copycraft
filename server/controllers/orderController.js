import { calculateOrderPrice } from '../services/pricingService.js';
import { extractFileMetadata } from '../services/pdfService.js';
import { analyzeDocumentAI } from '../services/aiService.js';
import { db } from '../models/dbStore.js';

export const calculateQuote = (req, res) => {
  const options = req.body;
  const quote = calculateOrderPrice(options);
  return res.json({ success: true, quote });
};

export const uploadAndAnalyzeFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const processedFiles = [];

    for (const file of req.files) {
      const metadata = await extractFileMetadata(file.buffer, file.originalname, file.mimetype);
      const aiAnalysis = analyzeDocumentAI(file.originalname, metadata.fileSize, metadata.pageCount);

      processedFiles.push({
        id: `file_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: file.originalname,
        size: metadata.fileSize,
        mimeType: file.mimetype,
        pageCount: metadata.pageCount,
        printMode: 'bw',
        sideMode: metadata.pageCount >= 4 ? 'double' : 'single',
        paperSize: 'A4',
        binding: 'none',
        lamination: 'none',
        coverSheet: 'none',
        ai: aiAnalysis
      });
    }

    return res.json({
      success: true,
      message: 'Files parsed and analyzed by AI successfully',
      files: processedFiles
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrder = (req, res) => {
  const {
    files,
    collegeId,
    deliveryLocation,
    paymentMethod = 'COD',
    couponCode = null,
    referralDiscount = 0,
    collegeName = 'IIT Bombay',
    yearOfStudy = '3rd Year',
    branch = 'Computer Science'
  } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one document file is required' });
  }

  const matchedCollege = db.colleges.find(c => c.name.toLowerCase() === collegeName.toLowerCase());
  const finalCollegeId = matchedCollege ? matchedCollege.id : (collegeId || req.user.collegeId || 'clg_1');

  // Find assigned dealer for this college
  const dealer = db.users.find(u => u.role === 'dealer' && u.collegeId === finalCollegeId) || db.users.find(u => u.role === 'dealer');
  const distributor = db.users.find(u => u.role === 'distributor' && u.collegeId === finalCollegeId) || db.users.find(u => u.role === 'distributor') || null;

  // Calculate pricing aggregate for all files
  let totalPrintCost = 0;
  let totalAddonCost = 0;
  let totalPageCount = 0;

  files.forEach(f => {
    const fileQuote = calculateOrderPrice({
      pageCount: f.pageCount || 1,
      quantity: f.quantity || 1,
      paperSize: f.paperSize || 'A4',
      printMode: f.printMode || 'bw',
      sideMode: f.sideMode || 'double',
      binding: f.binding || 'none',
      lamination: f.lamination || 'none',
      coverSheet: f.coverSheet || 'none',
      couponCode,
      referralDiscount
    });

    totalPrintCost += fileQuote.breakdown.printCost;
    totalAddonCost += fileQuote.breakdown.addonCost;
    totalPageCount += (f.pageCount || 1) * (f.quantity || 1);
  });

  const aggregateQuote = calculateOrderPrice({
    pageCount: totalPageCount,
    quantity: 1,
    couponCode,
    referralDiscount
  });

  // Generate 4-digit OTP for delivery verification
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const orderId = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder = {
    id: orderId,
    customerId: req.user.id,
    customerName: req.user.name,
    customerPhone: req.user.phone,
    collegeId: finalCollegeId,
    collegeName,
    yearOfStudy,
    branch,
    deliveryLocation: deliveryLocation || req.user.roomDetails || 'Campus Hub',
    dealerId: dealer ? dealer.id : 'usr_dealer_1',
    dealerName: dealer ? dealer.name : 'Central Campus Dealer',
    dealerPhone: dealer ? dealer.phone : '+91 97222 33344', // store dealer phone for distributor coordinating
    distributorId: distributor ? distributor.id : 'usr_distributor_1',
    distributorName: distributor ? distributor.name : 'Rajesh Kumar (IIT Bombay Hub)',
    distributorPhone: distributor ? distributor.phone : '+91 98111 22233',
    files,
    pricing: aggregateQuote.breakdown,
    paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
    paymentMethod,
    orderStatus: 'CREATED',
    otp,
    timeline: [
      {
        status: 'CREATED',
        time: new Date().toISOString(),
        note: `Order placed via ${paymentMethod}. OTP generated: ${otp}`
      }
    ],
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);

  // Log action
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: req.user.id,
    userName: req.user.name,
    action: 'ORDER_CREATE',
    details: `Created order ${orderId} for ₹${aggregateQuote.breakdown.finalPrice}`,
    timestamp: new Date().toISOString()
  });

  return res.status(201).json({
    success: true,
    message: 'Order created successfully!',
    order: newOrder
  });
};

export const getCustomerOrders = (req, res) => {
  const customerOrders = db.orders.filter(o => o.customerId === req.user.id);
  return res.json({ success: true, orders: customerOrders });
};

export const getOrderById = (req, res) => {
  const { id } = req.params;
  const order = db.orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Security check: Customer can only view their own order unless staff
  if (req.user.role === 'customer' && order.customerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized access to order files' });
  }

  return res.json({ success: true, order });
};

export const cancelOrder = (req, res) => {
  const { id } = req.params;
  const order = db.orders.find(o => o.id === id);

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (['DELIVERED', 'CANCELLED', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)) {
    return res.status(400).json({ success: false, message: `Cannot cancel order in status '${order.orderStatus}'` });
  }

  order.orderStatus = 'CANCELLED';
  order.timeline.push({
    status: 'CANCELLED',
    time: new Date().toISOString(),
    note: 'Order cancelled by customer'
  });

  return res.json({ success: true, message: 'Order cancelled successfully', order });
};

export const getCollegesList = (req, res) => {
  return res.json({ success: true, colleges: db.colleges });
};

export const getActiveStaffList = (req, res) => {
  const staff = db.users
    .filter(u => u.role === 'dealer' || u.role === 'distributor')
    .map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      collegeId: u.collegeId,
      phone: u.phone,
      status: 'active'
    }));
  return res.json({ success: true, staff });
};
