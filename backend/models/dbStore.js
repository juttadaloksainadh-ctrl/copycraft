import bcrypt from 'bcryptjs';

// Pre-hashed passwords for quick initial access
// Default password for all seeded accounts: "Password123!"
const DEFAULT_HASH = bcrypt.hashSync('Password123!', 10);

export const db = {
  users: [
    {
      id: 'usr_admin',
      email: 'admin@copycraft.com',
      passwordHash: DEFAULT_HASH,
      name: 'System Administrator',
      phone: '+91 98765 43210',
      role: 'admin',
      collegeId: 'clg_1',
      referralCode: 'ADMINVIP',
      deliveryPin: '910001',
      createdAt: '2026-01-10T10:00:00Z'
    },
    {
      id: 'usr_superadmin',
      email: 'superadmin@copycraft.com',
      passwordHash: DEFAULT_HASH,
      name: 'Super Admin',
      phone: '+91 99999 88888',
      role: 'super_admin',
      collegeId: 'clg_1',
      referralCode: 'SUPER100',
      deliveryPin: '910002',
      createdAt: '2026-01-01T08:00:00Z'
    },
    {
      id: 'usr_distributor_1',
      email: 'distributor@copycraft.com',
      passwordHash: DEFAULT_HASH,
      name: 'Rajesh Kumar (IIT Bombay Hub)',
      phone: '+91 98111 22233',
      role: 'distributor',
      collegeId: 'clg_1',
      referralCode: 'DIST100',
      deliveryPin: '910003',
      createdAt: '2026-01-15T09:30:00Z'
    },
    {
      id: 'usr_dealer_1',
      email: 'dealer@copycraft.com',
      passwordHash: DEFAULT_HASH,
      name: 'Suresh Print Hub (Hostel 12)',
      phone: '+91 97222 33344',
      role: 'dealer',
      collegeId: 'clg_1',
      distributorId: 'usr_distributor_1',
      referralCode: 'DEALER1',
      deliveryPin: '910004',
      createdAt: '2026-01-20T11:15:00Z'
    },
    {
      id: 'usr_customer_1',
      email: 'customer@copycraft.com',
      passwordHash: DEFAULT_HASH,
      name: 'Ananya Sharma',
      phone: '+91 96333 44455',
      role: 'customer',
      collegeId: 'clg_1',
      roomDetails: 'Hostel 4, Room 302',
      referralCode: 'ANANYA20',
      deliveryPin: '482901',
      walletBalance: 150,
      createdAt: '2026-02-01T14:20:00Z'
    }
  ],

  colleges: [
    {
      id: 'clg_1',
      name: 'IIT Bombay',
      code: 'IITB',
      city: 'Mumbai',
      activeDealers: 4,
      totalOrders: 1420,
      deliveryLocations: ['Hostel 1 to 16', 'Main Academic Building', 'Som Science Dept', 'Library Complex']
    },
    {
      id: 'clg_2',
      name: 'BITS Pilani',
      code: 'BITS',
      city: 'Pilani',
      activeDealers: 3,
      totalOrders: 980,
      deliveryLocations: ['Vyas Bhavan', 'Ram Bhavan', 'FD1 Complex', 'LTC']
    },
    {
      id: 'clg_3',
      name: 'Delhi University (North Campus)',
      code: 'DU',
      city: 'New Delhi',
      activeDealers: 6,
      totalOrders: 2150,
      deliveryLocations: ['SRCC', 'St Stephens', 'Hindu College', 'Arts Faculty']
    }
  ],

  orders: [
    {
      id: 'ORD-2026-8901',
      customerId: 'usr_customer_1',
      customerName: 'Ananya Sharma',
      customerPhone: '+91 96333 44455',
      collegeId: 'clg_1',
      deliveryLocation: 'Hostel 4, Room 302',
      dealerId: 'usr_dealer_1',
      dealerName: 'Suresh Print Hub (Hostel 12)',
      distributorId: 'usr_distributor_1',
      distributorName: 'Rajesh Kumar (IIT Bombay Hub)',
      distributorPhone: '+91 98111 22233',
      files: [
        {
          id: 'file_101',
          name: 'Computer_Networks_Unit4_Notes.pdf',
          size: 2450000,
          pageCount: 18,
          printMode: 'bw',
          sideMode: 'double',
          paperSize: 'A4',
          binding: 'spiral',
          lamination: 'none',
          coverSheet: 'transparent'
        }
      ],
      pricing: {
        printCost: 22.95,
        addonCost: 47.00,
        subtotal: 69.95,
        deliveryFee: 0.00,
        couponDiscount: 10.00,
        referralDiscount: 0,
        gstAmount: 0.00,
        finalPrice: 59.95
      },
      paymentStatus: 'PAID', // 'PENDING' | 'PAID' | 'FAILED'
      paymentMethod: 'UPI',
      orderStatus: 'OUT_FOR_DELIVERY', // 'CREATED' | 'ASSIGNED' | 'PRINTING' | 'PRINTED' | 'PACKAGING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
      // Delivery verification uses customer's permanent deliveryPin
      timeline: [
        { status: 'CREATED', time: '2026-08-06T09:15:00Z', note: 'Order placed successfully via UPI' },
        { status: 'ASSIGNED', time: '2026-08-06T09:20:00Z', note: 'Assigned to Suresh Print Hub' },
        { status: 'PRINTING', time: '2026-08-06T09:35:00Z', note: 'Documents printing in progress' },
        { status: 'PACKAGING', time: '2026-08-06T09:50:00Z', note: 'Spiral bound and transparent cover attached' },
        { status: 'OUT_FOR_DELIVERY', time: '2026-08-06T10:05:00Z', note: 'Delivery executive dispatched to Hostel 4' }
      ],
      createdAt: '2026-08-06T09:15:00Z'
    },
    {
      id: 'ORD-2026-8902',
      customerId: 'usr_customer_1',
      customerName: 'Ananya Sharma',
      customerPhone: '+91 96333 44455',
      collegeId: 'clg_1',
      deliveryLocation: 'Main Academic Building, Room 101',
      dealerId: 'usr_dealer_1',
      dealerName: 'Suresh Print Hub (Hostel 12)',
      distributorId: 'usr_distributor_1',
      distributorName: 'Rajesh Kumar (IIT Bombay Hub)',
      distributorPhone: '+91 98111 22233',
      files: [
        {
          id: 'file_102',
          name: 'Project_Presentation_Final.pptx',
          size: 5120000,
          pageCount: 24,
          printMode: 'color',
          sideMode: 'single',
          paperSize: 'A4',
          binding: 'staple',
          lamination: 'front',
          coverSheet: 'none'
        }
      ],
      pricing: {
        printCost: 144.00,
        addonCost: 20.00,
        subtotal: 164.00,
        deliveryFee: 0.00,
        couponDiscount: 20.00,
        referralDiscount: 0,
        gstAmount: 0.00,
        finalPrice: 144.00
      },
      paymentStatus: 'PAID',
      paymentMethod: 'RAZORPAY_CARDS',
      orderStatus: 'DELIVERED',
      // Delivery verification uses customer's permanent deliveryPin
      timeline: [
        { status: 'CREATED', time: '2026-08-05T14:10:00Z', note: 'Order placed successfully' },
        { status: 'ASSIGNED', time: '2026-08-05T14:12:00Z', note: 'Auto assigned' },
        { status: 'PRINTING', time: '2026-08-05T14:25:00Z', note: 'Colour printing finished' },
        { status: 'DELIVERED', time: '2026-08-05T15:00:00Z', note: 'Delivered and verified via delivery PIN' }
      ],
      createdAt: '2026-08-05T14:10:00Z'
    }
  ],

  inventory: [
    {
      id: 'inv_1',
      dealerId: 'usr_dealer_1',
      itemName: 'A4 75GSM Bond Paper (Ream)',
      category: 'Paper',
      currentStock: 14,
      thresholdAlert: 20,
      unit: 'reams',
      status: 'LOW_STOCK'
    },
    {
      id: 'inv_2',
      dealerId: 'usr_dealer_1',
      itemName: 'Black Toner Cartridge HP-85A',
      category: 'Ink',
      currentStock: 3,
      thresholdAlert: 2,
      unit: 'cartridges',
      status: 'ADEQUATE'
    },
    {
      id: 'inv_3',
      dealerId: 'usr_dealer_1',
      itemName: 'Cyan/Magenta/Yellow Color Drum Kit',
      category: 'Ink',
      currentStock: 1,
      thresholdAlert: 3,
      unit: 'units',
      status: 'CRITICAL'
    },
    {
      id: 'inv_4',
      dealerId: 'usr_dealer_1',
      itemName: '12mm Plastic Spiral Coils',
      category: 'Binding',
      currentStock: 250,
      thresholdAlert: 50,
      unit: 'pieces',
      status: 'ADEQUATE'
    }
  ],

  coupons: [
    {
      id: 'cpn_1',
      code: 'WELCOME10',
      discountPercentage: 10,
      maxDiscount: 100,
      minOrderValue: 50,
      expiryDate: '2026-12-31',
      active: true
    },
    {
      id: 'cpn_2',
      code: 'EXAM50',
      discountPercentage: 20,
      maxDiscount: 50,
      minOrderValue: 100,
      expiryDate: '2026-11-30',
      active: true
    },
    {
      id: 'cpn_3',
      code: 'FREEDEL',
      discountPercentage: 100, // free delivery
      maxDiscount: 20,
      minOrderValue: 0,
      expiryDate: '2026-12-31',
      active: true
    }
  ],

  supportTickets: [
    {
      id: 'TCK-104',
      customerId: 'usr_customer_1',
      subject: 'Paper quality query for thesis binding',
      status: 'OPEN',
      priority: 'MEDIUM',
      messages: [
        { sender: 'Ananya Sharma', text: 'Hi, can I request 80gsm paper for my final thesis?', time: '2026-08-06T08:00:00Z' }
      ],
      createdAt: '2026-08-06T08:00:00Z'
    }
  ],

  auditLogs: [
    {
      id: 'log_1',
      userId: 'usr_admin',
      userName: 'System Administrator',
      action: 'PRICING_UPDATE',
      details: 'Updated B&W page base rate to ₹1.50',
      timestamp: '2026-08-06T07:30:00Z'
    },
    {
      id: 'log_2',
      userId: 'usr_dealer_1',
      userName: 'Suresh Print Hub',
      action: 'ORDER_STATUS_CHANGE',
      details: 'Changed ORD-2026-8901 status to OUT_FOR_DELIVERY',
      timestamp: '2026-08-06T10:05:00Z'
    }
  ],

  notifications: [
    {
      id: 'ntf_1',
      userId: 'usr_customer_1',
      type: 'order',
      title: 'Order Confirmed',
      message: 'Your order ORD-2026-8901 has been confirmed and assigned to Suresh Print Hub.',
      read: false,
      createdAt: '2026-08-06T09:00:00Z'
    },
    {
      id: 'ntf_2',
      userId: 'usr_customer_1',
      type: 'delivery',
      title: 'Out for Delivery',
      message: 'Your order ORD-2026-8901 is out for delivery. Expected by 2 PM.',
      read: false,
      createdAt: '2026-08-06T10:05:00Z'
    },
    {
      id: 'ntf_3',
      userId: 'usr_dealer_1',
      type: 'order',
      title: 'New Print Job Assigned',
      message: 'New order ORD-2026-8901 assigned: 18 pages, B&W double-sided, A4. Deliver to Hostel 4.',
      read: false,
      createdAt: '2026-08-06T09:00:00Z'
    },
    {
      id: 'ntf_4',
      userId: 'usr_dealer_1',
      type: 'system',
      title: 'Toner Replenishment Alert',
      message: 'Black toner level is at 15%. Please replenish to avoid print delays.',
      read: true,
      createdAt: '2026-08-05T15:30:00Z'
    },
    {
      id: 'ntf_5',
      userId: 'usr_distributor_1',
      type: 'order',
      title: 'Delivery Assignment',
      message: 'Order ORD-2026-8901 from Ananya Sharma (Hostel 4, Room 302) assigned for delivery pickup.',
      read: false,
      createdAt: '2026-08-06T09:05:00Z'
    },
    {
      id: 'ntf_6',
      userId: 'usr_distributor_1',
      type: 'info',
      title: 'Dealer Contact Updated',
      message: 'Dealer Suresh Print Hub updated contact to +91 97222 33344.',
      read: true,
      createdAt: '2026-08-05T12:00:00Z'
    },
    {
      id: 'ntf_7',
      userId: 'usr_admin',
      type: 'security',
      title: 'Security Alert',
      message: 'Unauthorized login attempt detected on the Dealer portal. IP blocked and incident logged.',
      read: false,
      createdAt: '2026-08-06T11:00:00Z'
    },
    {
      id: 'ntf_8',
      userId: 'usr_admin',
      type: 'system',
      title: 'New Customer Registered',
      message: 'A new customer account was registered at IIT Bombay campus.',
      read: true,
      createdAt: '2026-08-06T08:30:00Z'
    }
  ]
};

