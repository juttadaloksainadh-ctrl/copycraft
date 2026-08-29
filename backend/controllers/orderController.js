import { calculateOrderPrice, getPricingRates, PRICING_DEFAULTS } from '../services/pricingService.js';
import { extractFileMetadata } from '../services/pdfService.js';
import { analyzeDocumentAI } from '../services/aiService.js';
import { isR2Configured, uploadFile, generateFileKey } from '../services/r2Storage.js';
import { createPaymentReceipt } from '../models/paymentReceipt.js';
import { db, syncDbToR2 } from '../models/dbStore.js';
import { isUsingMongo, getMongoCollection } from '../config/db.js';

export const getPricingRatesHandler = (req, res) => {
  return res.json({ success: true, pricingRates: getPricingRates() });
};

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
    // Generate a temporary batch ID for grouping files before order creation
    const batchId = `batch_${Date.now()}`;

    for (const file of req.files) {
      const metadata = await extractFileMetadata(file.buffer, file.originalname, file.mimetype);
      const aiAnalysis = analyzeDocumentAI(file.originalname, metadata.fileSize, metadata.pageCount);

      const fileId = `file_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      let r2Key = null;
      let r2Url = null;

      // Upload to Cloudflare R2 if configured
      if (isR2Configured()) {
        try {
          const key = generateFileKey(batchId, fileId, file.originalname);
          const r2Result = await uploadFile(file.buffer, key, file.mimetype, {
            originalName: file.originalname,
            uploadedBy: req.user?.id || 'unknown',
          });
          r2Key = r2Result.key;
          r2Url = r2Result.url;
          console.log(`   ☁️ Uploaded to R2: ${r2Key}`);
        } catch (r2Error) {
          console.error(`   ⚠️ R2 upload failed for ${file.originalname}:`, r2Error.message);
          // Continue without R2 — file metadata is still returned
        }
      }

      processedFiles.push({
        id: fileId,
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
        r2Key,
        r2Url,
        ai: aiAnalysis
      });
    }

    return res.json({
      success: true,
      message: `Files parsed and analyzed by AI successfully${isR2Configured() ? ' (stored in Cloudflare R2)' : ''}`,
      files: processedFiles,
      storageMode: isR2Configured() ? 'cloudflare_r2' : 'memory'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper to compute aggregate quote across all files in an order
 */
export function calculateOrderAggregateQuote(files, couponCode, referralDiscount = 0) {
  if (!files || files.length === 0) {
    return {
      printCost: 0,
      addonCost: 0,
      subtotal: 0,
      deliveryFee: 0,
      couponDiscount: 0,
      referralDiscount: 0,
      taxableAmount: 0,
      gstAmount: 0,
      convenienceFee: 0,
      finalPrice: 0
    };
  }

  let totalPrintCost = 0;
  let totalAddonCost = 0;
  let totalPageCount = 0;

  files.forEach(f => {
    const fileQuote = calculateOrderPrice({
      pageCount: f.pageCount || 1,
      quantity: f.quantity || 1,
      paperSize: f.paperSize || 'A4',
      printMode: f.printMode || 'bw',
      sideMode: f.sideMode || 'single',
      binding: f.binding || 'none',
      lamination: f.lamination || 'none',
      coverSheet: f.coverSheet || 'none',
      couponCode: null,
      referralDiscount: 0
    });

    totalPrintCost += fileQuote.breakdown.printCost;
    totalAddonCost += fileQuote.breakdown.addonCost;
    totalPageCount += (f.pageCount || 1) * (f.quantity || 1);
  });

  const subtotalBeforeDelivery = totalPrintCost + totalAddonCost;
  let couponDiscount = 0;
  if (couponCode) {
    const codeUpper = couponCode.toUpperCase();
    const matchedDbCoupon = db.coupons?.find(c => c.code === codeUpper && c.active);
    if (matchedDbCoupon) {
      if (subtotalBeforeDelivery >= (matchedDbCoupon.minOrderValue || 0)) {
        const rawDiscount = (subtotalBeforeDelivery * matchedDbCoupon.discountPercentage) / 100;
        couponDiscount = Math.min(matchedDbCoupon.maxDiscount || Infinity, Math.round(rawDiscount));
      }
    } else if (codeUpper === 'WELCOME10') {
      couponDiscount = Math.round(subtotalBeforeDelivery * 0.10);
    } else if (codeUpper === 'EXAM50') {
      couponDiscount = Math.min(50, subtotalBeforeDelivery * 0.20);
    } else if (codeUpper === 'STUDENT20') {
      couponDiscount = Math.round(subtotalBeforeDelivery * 0.20);
    }
  }

  const netBeforeTax = Math.max(0, subtotalBeforeDelivery - couponDiscount - Number(referralDiscount || 0));
  const activeRates = getPricingRates();
  const feeRate = activeRates.convenienceFeeRate !== undefined ? activeRates.convenienceFeeRate : 0.026;
  const convenienceFee = Math.round(netBeforeTax * feeRate * 100) / 100;
  const finalPrice = Math.round((netBeforeTax + convenienceFee) * 100) / 100;

  return {
    printCost: totalPrintCost,
    addonCost: totalAddonCost,
    subtotal: subtotalBeforeDelivery,
    deliveryFee: 0,
    couponDiscount,
    referralDiscount: Number(referralDiscount || 0),
    taxableAmount: netBeforeTax,
    gstAmount: 0,
    convenienceFee,
    finalPrice
  };
}

/**
 * Core order creation logic used by both COD and Razorpay payment verification
 */
export async function createOrderRecord({ user, orderData, paymentInfo = {} }) {
  const {
    files,
    collegeId,
    deliveryLocation,
    paymentMethod = 'COD',
    couponCode = null,
    referralDiscount = 0,
    collegeName = '',
    yearOfStudy = '',
    branch = ''
  } = orderData;

  if (!files || files.length === 0) {
    throw new Error('At least one document file is required');
  }

  const matchedCollege = db.colleges.find(c => collegeName && c.name.toLowerCase() === collegeName.toLowerCase()) ||
                         db.colleges.find(c => collegeId && c.id === collegeId) ||
                         db.colleges[0] || null;
  const finalCollegeId = matchedCollege ? matchedCollege.id : (collegeId || user.collegeId || '');
  const finalCollegeName = matchedCollege ? matchedCollege.name : (collegeName || 'Campus Station');

  // Find assigned dealer for this college (matching either collegeId or collegeIds list)
  const dealer = db.users.find(u =>
    u.role === 'dealer' && (
      u.collegeId === finalCollegeId ||
      (Array.isArray(u.collegeIds) && u.collegeIds.includes(finalCollegeId))
    )
  ) || db.users.find(u => u.role === 'dealer') || null;

  const distributor = db.users.find(u =>
    u.role === 'distributor' && (
      u.collegeId === finalCollegeId ||
      (Array.isArray(u.collegeIds) && u.collegeIds.includes(finalCollegeId))
    )
  ) || db.users.find(u => u.role === 'distributor') || null;

  // Calculate pricing aggregate for all files accurately
  const aggregateBreakdown = calculateOrderAggregateQuote(files, couponCode, referralDiscount);

  const orderId = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const paymentStatus = paymentInfo.paymentStatus || (paymentMethod === 'COD' ? 'PENDING' : 'PAID');
  const transactionId = paymentInfo.transactionId || paymentInfo.razorpayPaymentId || `TXN_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const newOrder = {
    id: orderId,
    customerId: user.id,
    customerName: user.name,
    customerPhone: user.phone,
    customerEmail: user.email || '',
    deliveryPin: user.deliveryPin || '',
    collegeId: finalCollegeId,
    collegeName: finalCollegeName,
    yearOfStudy: yearOfStudy || 'Student',
    branch: branch || 'General',
    deliveryLocation: deliveryLocation || user.roomDetails || 'Campus Hub',
    dealerId: dealer ? dealer.id : null,
    dealerName: dealer ? dealer.name : 'Pending Assignment',
    dealerPhone: dealer ? dealer.phone : '',
    distributorId: distributor ? distributor.id : null,
    distributorName: distributor ? distributor.name : 'Campus Distributor',
    distributorPhone: distributor ? distributor.phone : '',
    files,
    pricing: aggregateBreakdown,
    paymentStatus,
    paymentMethod,
    paymentGateway: paymentInfo.gateway || (paymentMethod === 'COD' ? 'CASH' : 'RAZORPAY'),
    razorpayOrderId: paymentInfo.razorpayOrderId || null,
    razorpayPaymentId: paymentInfo.razorpayPaymentId || null,
    razorpaySignature: paymentInfo.razorpaySignature || null,
    orderStatus: 'CREATED',
    timeline: [
      {
        status: 'CREATED',
        time: new Date().toISOString(),
        note: `Order placed via ${paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Razorpay Online Payment (' + paymentMethod + ')'}`
      }
    ],
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);

  if (isUsingMongo()) {
    try {
      const col = getMongoCollection('orders');
      await col.insertOne(newOrder);
    } catch (e) {
      console.error('Mongo order insert error:', e.message);
    }
  }

  // Log action
  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: user.id,
    userName: user.name,
    action: 'ORDER_CREATE',
    details: `Created order ${orderId} for ₹${aggregateBreakdown.finalPrice} (${paymentMethod})`,
    timestamp: new Date().toISOString()
  });

  syncDbToR2();

  // Save payment receipt to MongoDB (async, non-blocking)
  let savedReceipt = null;
  try {
    savedReceipt = await createPaymentReceipt({
      orderId,
      customerId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      amount: aggregateBreakdown.finalPrice,
      method: paymentMethod,
      gateway: paymentInfo.gateway || (paymentMethod === 'COD' ? 'CASH' : 'RAZORPAY'),
      transactionId,
      razorpayOrderId: paymentInfo.razorpayOrderId || null,
      razorpayPaymentId: paymentInfo.razorpayPaymentId || null,
      status: paymentStatus,
      receiptData: {
        items: files.map(f => ({
          fileName: f.name,
          pageCount: f.pageCount || 1,
          printMode: f.printMode || 'bw',
          binding: f.binding || 'none',
          cost: calculateOrderPrice({
            pageCount: f.pageCount || 1,
            printMode: f.printMode || 'bw',
            binding: f.binding || 'none',
          }).breakdown.finalPrice
        })),
        ...aggregateBreakdown
      }
    });

    if (savedReceipt && !savedReceipt._fallback) {
      console.log(`   🧾 Payment receipt saved: ${savedReceipt.receiptId}`);
    }
  } catch (err) {
    console.error('   ⚠️ Failed to save payment receipt:', err.message);
  }

  return { order: newOrder, receipt: savedReceipt };
}

export const createOrder = async (req, res) => {
  try {
    const { order, receipt } = await createOrderRecord({
      user: req.user,
      orderData: req.body,
      paymentInfo: {
        gateway: req.body.paymentMethod === 'COD' ? 'CASH' : 'RAZORPAY',
        paymentStatus: req.body.paymentMethod === 'COD' ? 'PENDING' : 'PAID'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully!',
      order,
      receipt
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to create order' });
  }
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

  syncDbToR2();

  return res.json({ success: true, message: 'Order cancelled successfully', order });
};

export const getCollegesList = (req, res) => {
  return res.json({ success: true, colleges: db.colleges });
};

export const getActiveStaffList = async (req, res) => {
  const userCollegeId = req.user?.collegeId;

  let allUsers = db.users;
  let allColleges = db.colleges;

  if (isUsingMongo()) {
    try {
      const usersCol = getMongoCollection('users');
      const collegesCol = getMongoCollection('colleges');
      if (usersCol) {
        const mUsers = await usersCol.find({ role: { $in: ['distributor', 'dealer'] } }).toArray();
        if (mUsers && mUsers.length > 0) allUsers = mUsers;
      }
      if (collegesCol) {
        const mColleges = await collegesCol.find({}).toArray();
        if (mColleges && mColleges.length > 0) allColleges = mColleges;
      }
    } catch (_) {}
  }

  // Customers must see their respective distributor details
  if (req.user?.role === 'customer') {
    let distributors = allUsers.filter(u => {
      if (u.role !== 'distributor') return false;
      if (!userCollegeId) return true;
      if (u.collegeId === userCollegeId) return true;
      if (Array.isArray(u.collegeIds) && u.collegeIds.includes(userCollegeId)) return true;
      return false;
    });

    if (distributors.length === 0) {
      distributors = allUsers.filter(u => u.role === 'distributor');
    }

    const assignedDistributors = distributors.map(u => {
      const college = allColleges.find(c => c.id === u.collegeId || (Array.isArray(u.collegeIds) && u.collegeIds.includes(c.id)));
      return {
        id: u.id,
        name: u.name,
        role: 'distributor',
        collegeId: u.collegeId || (u.collegeIds && u.collegeIds[0]) || '',
        collegeName: college ? college.name : (req.user?.collegeName || 'Campus Distribution Hub'),
        phone: u.phone,
        status: 'active'
      };
    });

    return res.json({ success: true, staff: assignedDistributors });
  }

  // Admin/Staff view
  const staff = allUsers
    .filter(u => u.role === 'dealer' || u.role === 'distributor')
    .map(u => {
      const college = allColleges.find(c => c.id === u.collegeId);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        collegeId: u.collegeId,
        collegeName: college ? college.name : '—',
        phone: u.phone,
        status: 'active'
      };
    });

  return res.json({ success: true, staff });
};
