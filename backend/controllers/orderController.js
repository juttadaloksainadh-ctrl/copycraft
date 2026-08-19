import { calculateOrderPrice, PRICING_DEFAULTS } from '../services/pricingService.js';
import { extractFileMetadata } from '../services/pdfService.js';
import { analyzeDocumentAI } from '../services/aiService.js';
import { isR2Configured, uploadFile, generateFileKey } from '../services/r2Storage.js';
import { createPaymentReceipt } from '../models/paymentReceipt.js';
import { db, syncDbToR2 } from '../models/dbStore.js';
import { isUsingMongo, getMongoCollection } from '../config/db.js';

export const getPricingRatesHandler = (req, res) => {
  return res.json({ success: true, pricingRates: PRICING_DEFAULTS });
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

export const createOrder = async (req, res) => {
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
  } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one document file is required' });
  }

  const matchedCollege = db.colleges.find(c => collegeName && c.name.toLowerCase() === collegeName.toLowerCase()) ||
                         db.colleges.find(c => collegeId && c.id === collegeId) ||
                         db.colleges[0] || null;
  const finalCollegeId = matchedCollege ? matchedCollege.id : (collegeId || req.user.collegeId || '');
  const finalCollegeName = matchedCollege ? matchedCollege.name : (collegeName || 'Campus Station');

  // Find assigned dealer for this college
  const dealer = db.users.find(u => u.role === 'dealer' && u.collegeId === finalCollegeId) || db.users.find(u => u.role === 'dealer') || null;
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

  const orderId = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder = {
    id: orderId,
    customerId: req.user.id,
    customerName: req.user.name,
    customerPhone: req.user.phone,
    collegeId: finalCollegeId,
    collegeName: finalCollegeName,
    yearOfStudy: yearOfStudy || 'Student',
    branch: branch || 'General',
    deliveryLocation: deliveryLocation || req.user.roomDetails || 'Campus Hub',
    dealerId: dealer ? dealer.id : null,
    dealerName: dealer ? dealer.name : 'Pending Assignment',
    dealerPhone: dealer ? dealer.phone : '',
    distributorId: distributor ? distributor.id : null,
    distributorName: distributor ? distributor.name : 'Campus Distributor',
    distributorPhone: distributor ? distributor.phone : '',
    files,
    pricing: aggregateQuote.breakdown,
    paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
    paymentMethod,
    orderStatus: 'CREATED',
    timeline: [
      {
        status: 'CREATED',
        time: new Date().toISOString(),
        note: `Order placed via ${paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment (' + paymentMethod + ')'}`
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
    userId: req.user.id,
    userName: req.user.name,
    action: 'ORDER_CREATE',
    details: `Created order ${orderId} for ₹${aggregateQuote.breakdown.finalPrice} (${paymentMethod})`,
    timestamp: new Date().toISOString()
  });

  syncDbToR2();

  // Save payment receipt to MongoDB (async, non-blocking)
  createPaymentReceipt({
    orderId,
    customerId: req.user.id,
    customerName: req.user.name,
    customerEmail: req.user.email,
    amount: aggregateQuote.breakdown.finalPrice,
    method: paymentMethod,
    transactionId: `TXN_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    status: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
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
      ...aggregateQuote.breakdown
    }
  }).then(receipt => {
    if (receipt && !receipt._fallback) {
      console.log(`   🧾 Payment receipt saved: ${receipt.receiptId}`);
    }
  }).catch(err => {
    console.error('   ⚠️ Failed to save payment receipt:', err.message);
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

  syncDbToR2();

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

