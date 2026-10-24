import { db, syncDbToR2 } from '../models/dbStore.js';
import { isUsingMongo, getMongoCollection } from '../config/db.js';

// Seed initial stationery items if empty
const INITIAL_STATIONERY = [
  {
    id: 'stat_1',
    dealerId: 'usr_dealer_stat_1',
    dealerName: 'Campus Stationery Hub',
    collegeId: 'clg_1',
    collegeName: 'IIT Madras',
    name: 'Classmate Octane Gel Pen Set (Pack of 5)',
    category: 'Pens & Markers',
    price: 50,
    imageUrl: 'https://images.unsplash.com/photo-1585336261026-6757688719d3?w=500&auto=format&fit=crop&q=60',
    inStock: true,
    stockQuantity: 100,
    description: 'Smooth writing 0.5mm waterproof gel pens suitable for exams & notes.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stat_2',
    dealerId: 'usr_dealer_stat_1',
    dealerName: 'Campus Stationery Hub',
    collegeId: 'clg_1',
    collegeName: 'IIT Madras',
    name: 'Classmate A4 Spiral Notebook (200 Pages, Unruled)',
    category: 'Notebooks',
    price: 95,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60',
    inStock: true,
    stockQuantity: 50,
    description: 'High opacity 70gsm white paper spiral notebook with protective poly cover.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stat_3',
    dealerId: 'usr_dealer_stat_1',
    dealerName: 'Campus Stationery Hub',
    collegeId: 'clg_1',
    collegeName: 'IIT Madras',
    name: 'Casio FX-991EX Scientific Calculator',
    category: 'Tech Accessories',
    price: 1350,
    imageUrl: 'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48a?w=500&auto=format&fit=crop&q=60',
    inStock: true,
    stockQuantity: 20,
    description: 'ClassWiz series scientific calculator with 552 functions & high-resolution display.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stat_4',
    dealerId: 'usr_dealer_stat_1',
    dealerName: 'Campus Stationery Hub',
    collegeId: 'clg_1',
    collegeName: 'IIT Madras',
    name: 'White Cotton Lab Coat (Full Sleeve, Sizes M/L/XL)',
    category: 'Lab & Art Supplies',
    price: 390,
    imageUrl: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=500&auto=format&fit=crop&q=60',
    inStock: true,
    stockQuantity: 30,
    description: '100% breathable cotton white coat for chemistry & biology practical sessions.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stat_5',
    dealerId: 'usr_dealer_stat_1',
    dealerName: 'Campus Stationery Hub',
    collegeId: 'clg_1',
    collegeName: 'IIT Madras',
    name: 'A4 Transparent Clip File Folder (Pack of 10)',
    category: 'Files & Folders',
    price: 120,
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60',
    inStock: true,
    stockQuantity: 80,
    description: 'Heavy duty polypropylene document project files for assignments & reports.',
    createdAt: new Date().toISOString()
  }
];

if (!db.stationeryItems) {
  db.stationeryItems = INITIAL_STATIONERY;
}
if (!db.stationeryOrders) {
  db.stationeryOrders = [];
}

/**
 * GET /api/stationery/items
 * Get all available stationery products. Optional collegeId filter.
 */
export const getStationeryItems = async (req, res) => {
  try {
    let items = [];
    if (isUsingMongo()) {
      try {
        const col = getMongoCollection('stationery_items');
        items = await col.find({}).sort({ createdAt: -1 }).toArray();
      } catch (e) {
        console.error('Mongo stationery items fetch error:', e.message);
      }
    }
    if (!items || items.length === 0) {
      if (!db.stationeryItems || db.stationeryItems.length === 0) {
        db.stationeryItems = INITIAL_STATIONERY;
      }
      items = db.stationeryItems;
    }

    const { collegeId, category } = req.query;
    let filtered = items;

    if (collegeId) {
      filtered = filtered.filter(i => !i.collegeId || i.collegeId === collegeId);
    }
    if (category && category !== 'All') {
      filtered = filtered.filter(i => i.category === category);
    }

    return res.json({ success: true, items: filtered });
  } catch (error) {
    console.error('getStationeryItems error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stationery items' });
  }
};

/**
 * POST /api/stationery/items
 * Dealer uploads a new stationery product.
 */
export const createStationeryItem = async (req, res) => {
  try {
    const { name, category, price, imageUrl, inStock, stockQuantity, description } = req.body;
    const user = req.user;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Product name and price are required' });
    }

    const newItem = {
      id: `stat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      dealerId: user.id,
      dealerName: user.name || 'Stationery Hub',
      collegeId: user.collegeId || '',
      collegeName: user.collegeName || '',
      name: String(name).trim(),
      category: category || 'Notebooks & Paper',
      price: Number(price),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60',
      inStock: inStock !== undefined ? Boolean(inStock) : true,
      stockQuantity: Number(stockQuantity || 100),
      description: description || '',
      createdAt: new Date().toISOString()
    };

    db.stationeryItems.unshift(newItem);

    if (isUsingMongo()) {
      try {
        const col = getMongoCollection('stationery_items');
        await col.insertOne(newItem);
      } catch (e) {
        console.error('Mongo insert stationery item error:', e.message);
      }
    }

    syncDbToR2();

    return res.status(201).json({
      success: true,
      message: 'Stationery product uploaded successfully! ✏️',
      item: newItem
    });
  } catch (error) {
    console.error('createStationeryItem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload product' });
  }
};

/**
 * PUT /api/stationery/items/:id
 * Dealer updates stock availability, price, or item details.
 */
export const updateStationeryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { inStock, price, stockQuantity, name, category, description } = req.body;

    let item = db.stationeryItems.find(i => i.id === id);

    if (isUsingMongo()) {
      try {
        const col = getMongoCollection('stationery_items');
        const mongoItem = await col.findOne({ id });
        if (mongoItem) item = mongoItem;
      } catch (_) {}
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (inStock !== undefined) item.inStock = Boolean(inStock);
    if (price !== undefined) item.price = Number(price);
    if (stockQuantity !== undefined) item.stockQuantity = Number(stockQuantity);
    if (name) item.name = name;
    if (category) item.category = category;
    if (description !== undefined) item.description = description;

    // Save in-memory
    const memIdx = db.stationeryItems.findIndex(i => i.id === id);
    if (memIdx !== -1) {
      db.stationeryItems[memIdx] = { ...db.stationeryItems[memIdx], ...item };
    }

    // Save in Mongo
    if (isUsingMongo()) {
      try {
        const col = getMongoCollection('stationery_items');
        await col.updateOne({ id }, { $set: item });
      } catch (e) {
        console.error('Mongo update error:', e.message);
      }
    }

    syncDbToR2();

    return res.json({
      success: true,
      message: 'Product updated successfully',
      item
    });
  } catch (error) {
    console.error('updateStationeryItem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

/**
 * DELETE /api/stationery/items/:id
 */
export const deleteStationeryItem = async (req, res) => {
  try {
    const { id } = req.params;
    db.stationeryItems = db.stationeryItems.filter(i => i.id !== id);

    if (isUsingMongo()) {
      try {
        const col = getMongoCollection('stationery_items');
        await col.deleteOne({ id });
      } catch (_) {}
    }

    syncDbToR2();
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

/**
 * POST /api/stationery/orders
 * Customer places a stationery order.
 */
export const createStationeryOrder = async (req, res) => {
  try {
    const { items, deliveryLocation, paymentMethod, collegeName, collegeId, yearOfStudy, branch } = req.body;
    const user = req.user;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in stationery order' });
    }

    const orderId = `STAT-${Date.now().toString().slice(-6)}`;
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);

    // 1. Resolve College from db.colleges or active MongoDB collection
    let allColleges = db.colleges || [];
    let allUsers = db.users || [];

    if (isUsingMongo()) {
      try {
        const collegesCol = getMongoCollection('colleges');
        const usersCol = getMongoCollection('users');
        if (collegesCol) {
          const mColleges = await collegesCol.find({}).toArray();
          if (mColleges && mColleges.length > 0) allColleges = mColleges;
        }
        if (usersCol) {
          const mUsers = await usersCol.find({ role: { $in: ['distributor', 'dealer', 'stationery_dealer'] } }).toArray();
          if (mUsers && mUsers.length > 0) allUsers = mUsers;
        }
      } catch (_) {}
    }

    const targetCollegeId = collegeId || user?.collegeId || '';
    const matchedCollege = allColleges.find(c => collegeName && c.name.toLowerCase() === collegeName.toLowerCase()) ||
                           allColleges.find(c => targetCollegeId && c.id === targetCollegeId) ||
                           (items[0]?.collegeId ? allColleges.find(c => c.id === items[0].collegeId) : null) ||
                           null;

    const finalCollegeId = matchedCollege ? matchedCollege.id : targetCollegeId;
    const finalCollegeName = matchedCollege ? matchedCollege.name : (collegeName || user?.collegeName || 'Campus Hub');

    // 2. Resolve Designated Distributor (Unambiguous only; never guess)
    let designatedDistributor = null;
    if (finalCollegeId) {
      const matchingDistributors = allUsers.filter(u =>
        u.role === 'distributor' && (
          u.collegeId === finalCollegeId ||
          (Array.isArray(u.collegeIds) && u.collegeIds.includes(finalCollegeId))
        )
      );
      if (matchingDistributors.length === 1) {
        designatedDistributor = matchingDistributors[0];
      }
      // If 0 or > 1 (ambiguous): remains null, never guess.
    }

    // 3. Resolve Designated Dealer (Unambiguous only; never guess)
    let designatedDealer = null;
    if (finalCollegeId) {
      // Step A: Check if the ordered product item belongs to a specific dealer assigned to this college
      let productDealerId = items[0]?.dealerId;
      if (!productDealerId) {
        const firstItem = (db.stationeryItems || []).find(it => it.id === items[0]?.id);
        if (firstItem?.dealerId) productDealerId = firstItem.dealerId;
      }

      if (productDealerId) {
        const prodDealer = allUsers.find(u =>
          u.id === productDealerId &&
          (u.role === 'dealer' || u.role === 'stationery_dealer') &&
          (u.collegeId === finalCollegeId || (Array.isArray(u.collegeIds) && u.collegeIds.includes(finalCollegeId)))
        );
        if (prodDealer) {
          designatedDealer = prodDealer;
        }
      }

      // Step B: Dedicated stationery dealer assigned to this college
      if (!designatedDealer) {
        const dedicatedStationeryDealers = allUsers.filter(u =>
          (u.role === 'stationery_dealer' || u.dealerType === 'stationery') &&
          (u.collegeId === finalCollegeId || (Array.isArray(u.collegeIds) && u.collegeIds.includes(finalCollegeId)))
        );

        if (dedicatedStationeryDealers.length === 1) {
          designatedDealer = dedicatedStationeryDealers[0];
        } else if (dedicatedStationeryDealers.length === 0) {
          // Step C: Single general dealer assigned to this college (if not explicitly print-only)
          const generalDealers = allUsers.filter(u =>
            u.role === 'dealer' &&
            u.dealerType !== 'print' &&
            (u.collegeId === finalCollegeId || (Array.isArray(u.collegeIds) && u.collegeIds.includes(finalCollegeId)))
          );

          if (generalDealers.length === 1) {
            designatedDealer = generalDealers[0];
          }
          // If 0 or > 1 (ambiguous): remains null, never guess.
        }
        // If dedicatedStationeryDealers.length > 1 (ambiguous): remains null, never guess.
      }
    }

    const newOrder = {
      id: orderId,
      orderType: 'STATIONERY',
      customerId: user.id,
      customerName: user.name,
      customerPhone: user.phone,
      customerEmail: user.email || '',
      deliveryPin: user.deliveryPin || '',
      collegeId: finalCollegeId,
      collegeName: finalCollegeName,
      yearOfStudy: yearOfStudy || 'Student',
      branch: branch || 'General',
      deliveryLocation: deliveryLocation || user.roomDetails || 'Campus Hostel',
      dealerId: designatedDealer ? designatedDealer.id : null,
      dealerName: designatedDealer ? designatedDealer.name : 'Pending Assignment',
      dealerPhone: designatedDealer ? designatedDealer.phone : '',
      distributorId: designatedDistributor ? designatedDistributor.id : null,
      distributorName: designatedDistributor ? designatedDistributor.name : 'Campus Distributor',
      distributorPhone: designatedDistributor ? designatedDistributor.phone : '',
      items,
      totalAmount,
      pricing: { finalPrice: totalAmount },
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
      orderStatus: 'PENDING',
      timeline: [
        {
          status: 'PENDING',
          time: new Date().toISOString(),
          note: `Stationery order placed via ${paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}`
        }
      ],
      createdAt: new Date().toISOString()
    };

    db.stationeryOrders.unshift(newOrder);
    db.orders.unshift(newOrder); // Also present in general orders feed for customer dashboard & tracking

    if (isUsingMongo()) {
      try {
        const col = getMongoCollection('stationery_orders');
        await col.insertOne(newOrder);
        const ordCol = getMongoCollection('orders');
        await ordCol.insertOne(newOrder);
      } catch (e) {
        console.error('Mongo order insert error:', e.message);
      }
    }

    syncDbToR2();

    return res.status(201).json({
      success: true,
      message: `Stationery Order #${orderId} placed successfully! 🎉`,
      order: newOrder
    });
  } catch (error) {
    console.error('createStationeryOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to place order' });
  }
};

/**
 * GET /api/stationery/dealer/orders
 * Dealer gets stationery orders assigned to their store or unassigned in their assigned colleges.
 * Restricted strictly to the authenticated dealer; unrelated dealers cannot access orders from other colleges.
 */
export const getDealerStationeryOrders = async (req, res) => {
  try {
    const user = req.user;
    const isSuperUser = ['admin', 'super_admin'].includes(user?.role);
    const userCollegeIds = Array.isArray(user?.collegeIds) && user.collegeIds.length > 0
      ? user.collegeIds
      : (user?.collegeId ? [user.collegeId] : []);

    let orders = [];

    if (isUsingMongo()) {
      try {
        const col = getMongoCollection('stationery_orders');
        // Admin sees all. Dealer sees orders explicitly assigned to them OR unassigned orders for their colleges.
        const query = isSuperUser
          ? {}
          : {
              $or: [
                { dealerId: user.id },
                { collegeId: { $in: userCollegeIds }, dealerId: null }
              ]
            };
        orders = await col.find(query).sort({ createdAt: -1 }).toArray();
      } catch (_) {}
    }

    if (!orders || orders.length === 0) {
      const source = (db.stationeryOrders && db.stationeryOrders.length > 0)
        ? db.stationeryOrders
        : db.orders.filter(o => o.orderType === 'STATIONERY');

      orders = source.filter(o => {
        if (isSuperUser) return true;
        // Dealer sees orders assigned to them, OR unassigned stationery orders for their assigned colleges
        return o.dealerId === user.id ||
               (!o.dealerId && userCollegeIds.includes(o.collegeId));
      });
    }

    return res.json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch dealer orders' });
  }
};

/**
 * PUT /api/stationery/dealer/orders/:id/status
 * Dealer updates stationery order status (e.g., PENDING -> OUT_FOR_DELIVERY -> DELIVERED).
 * Enforces handler-level authorization. Unrelated dealers cannot update.
 */
export const updateStationeryOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;

    let order = db.stationeryOrders.find(o => o.id === id) || db.orders.find(o => o.id === id);

    if (isUsingMongo()) {
      try {
        const col = getMongoCollection('stationery_orders');
        const mongoOrder = await col.findOne({ id });
        if (mongoOrder) order = mongoOrder;
      } catch (_) {}
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Handler-level authorization check: Only admin, assigned dealer, or college dealer for unassigned order
    const isSuperUser = ['admin', 'super_admin'].includes(user?.role);
    const userCollegeIds = Array.isArray(user?.collegeIds) && user.collegeIds.length > 0
      ? user.collegeIds
      : (user?.collegeId ? [user.collegeId] : []);

    const isAuthorizedDealer = order.dealerId === user.id ||
      (!order.dealerId && userCollegeIds.includes(order.collegeId));

    if (!isSuperUser && !isAuthorizedDealer) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You are not the designated dealer for this stationery order.'
      });
    }

    // If order was unassigned, claim it for this authorized dealer
    if (!order.dealerId) {
      order.dealerId = user.id;
      order.dealerName = user.name;
      order.dealerPhone = user.phone || '';
    }

    order.orderStatus = status;
    order.timeline = order.timeline || [];
    order.timeline.push({
      status,
      time: new Date().toISOString(),
      note: `Status updated to ${status} by Stationery Dealer ${user.name}`
    });

    if (status === 'DELIVERED') {
      order.paymentStatus = 'PAID';
      order.deliveredAt = new Date().toISOString();
    }

    // Synchronize both in-memory arrays
    const statIdx = db.stationeryOrders.findIndex(o => o.id === id);
    if (statIdx !== -1) {
      db.stationeryOrders[statIdx] = { ...db.stationeryOrders[statIdx], ...order };
    }
    const ordIdx = db.orders.findIndex(o => o.id === id);
    if (ordIdx !== -1) {
      db.orders[ordIdx] = { ...db.orders[ordIdx], ...order };
    }

    // Synchronize both MongoDB collections
    if (isUsingMongo()) {
      try {
        const col = getMongoCollection('stationery_orders');
        const ordCol = getMongoCollection('orders');
        await col.updateOne({ id }, { $set: order });
        await ordCol.updateOne({ id }, { $set: order });
      } catch (e) {
        console.error('Mongo order update error:', e.message);
      }
    }

    syncDbToR2();

    return res.json({
      success: true,
      message: `Stationery Order #${id} updated to ${status}`,
      order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};
