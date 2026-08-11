import bcrypt from 'bcryptjs';
import { generateToken } from '../config/jwt.js';
import { db } from '../models/dbStore.js';
import { createUserProfile, getUserProfile, updateUserProfile } from '../models/userProfile.js';

// Helper to log intrusion alerts to Admin audit log
function reportSecurityAlert(portalName, email, reason, details = '') {
  db.auditLogs.unshift({
    id: `alert_${Date.now()}`,
    userId: 'system',
    userName: 'Security Sentinel',
    action: 'INTRUSION_ALERT',
    details: `Intrusion warning: Failed login attempt to ${portalName} portal for email "${email}". Reason: ${reason}. ${details}`,
    timestamp: new Date().toISOString(),
    isAlert: true
  });
}

/**
 * Generate a unique 6-digit delivery PIN.
 * Ensures no two users share the same PIN.
 */
function generateUniqueDeliveryPin() {
  const existingPins = new Set(db.users.map(u => u.deliveryPin).filter(Boolean));
  let pin;
  let attempts = 0;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
    if (attempts > 10000) {
      // Extremely unlikely fallback — extend to 7 digits
      pin = Math.floor(1000000 + Math.random() * 9000000).toString();
    }
  } while (existingPins.has(pin));
  return pin;
}

/**
 * POST /api/auth/register
 * Single-step customer registration. No OTP required.
 * Generates a unique 6-digit delivery PIN for the customer.
 */
export const register = (req, res) => {
  const { name, phone, email, password, collegeId = 'clg_1', roomDetails } = req.body;

  if (!name || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, phone, email and password are all required' });
  }

  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email address is already registered' });
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const salt = bcrypt.genSaltSync(saltRounds);
  const passwordHash = bcrypt.hashSync(password, salt);
  const referralCode = name.slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900);
  const deliveryPin = generateUniqueDeliveryPin();

  const newUser = {
    id: `usr_${Date.now()}`,
    email,
    passwordHash,
    name,
    phone,
    role: 'customer',
    collegeId,
    roomDetails: roomDetails || 'Campus Building',
    referralCode,
    deliveryPin,
    walletBalance: 50,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: newUser.id,
    userName: newUser.name,
    action: 'USER_REGISTER',
    details: `Customer registered with delivery PIN ${deliveryPin}`,
    timestamp: new Date().toISOString()
  });

  // Create extended profile in MongoDB (async, non-blocking)
  createUserProfile(newUser.id, {
    preferences: { theme: 'system', language: 'en' },
    addresses: roomDetails ? [{ label: 'Default', hostel: roomDetails, room: '', landmark: '', isDefault: true }] : [],
  }).then(profile => {
    if (profile && !profile._fallback) {
      console.log(`   👤 User profile created in MongoDB for ${newUser.name}`);
    }
  }).catch(err => {
    console.error('   ⚠️ Failed to create user profile:', err.message);
  });

  const token = generateToken({ id: newUser.id, role: newUser.role, email: newUser.email });
  const { passwordHash: _, ...userWithoutPassword } = newUser;

  return res.status(201).json({
    success: true,
    message: 'User registered successfully!',
    token,
    user: userWithoutPassword,
    deliveryPin
  });
};

/**
 * POST /api/auth/login
 * Unified login for all portals (customer, dealer, distributor, admin).
 * Just email + password. No OTP step.
 */
export const login = (req, res) => {
  const { email, password, portal = 'customer' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  // Intrusion Check 1: User does not exist
  if (!user) {
    if (portal !== 'customer') {
      reportSecurityAlert(portal, email, 'NON_EXISTENT_USER');
    }
    return res.status(401).json({
      success: false,
      message: 'Warning: Invalid credentials. Unauthorized access attempts are monitored and recorded.'
    });
  }

  // Intrusion Check 2: Password mismatch
  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    if (portal !== 'customer') {
      reportSecurityAlert(portal, email, 'PASSWORD_MISMATCH');
    }
    return res.status(401).json({
      success: false,
      message: 'Warning: Invalid credentials. Unauthorized access attempts are monitored and recorded.'
    });
  }

  // Intrusion Check 3: Portal Role verification
  const portalRoles = {
    customer: ['customer'],
    dealer: ['dealer'],
    distributor: ['distributor'],
    admin: ['admin', 'super_admin']
  };

  const allowedRoles = portalRoles[portal] || [];
  if (!allowedRoles.includes(user.role)) {
    reportSecurityAlert(portal, email, 'ROLE_MISMATCH', `Attempted portal: ${portal}, User role: ${user.role}`);
    return res.status(403).json({
      success: false,
      message: 'Security Alert: You do not have permissions to access this staff portal. Incident reported to administrator.'
    });
  }

  // Ensure user has a unique delivery PIN
  if (!user.deliveryPin) {
    user.deliveryPin = generateUniqueDeliveryPin();
  }

  // All portals: direct login with token
  const token = generateToken({ id: user.id, role: user.role, email: user.email });
  const { passwordHash: _, ...userWithoutPassword } = user;

  return res.json({
    success: true,
    message: 'Logged in successfully',
    token,
    user: userWithoutPassword
  });
};

/**
 * GET /api/auth/delivery-pin
 * Returns the authenticated customer's delivery verification PIN.
 */
export const getDeliveryPin = (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!user.deliveryPin) {
    user.deliveryPin = generateUniqueDeliveryPin();
  }

  return res.json({
    success: true,
    deliveryPin: user.deliveryPin,
    message: 'Share this PIN with the delivery person to confirm receipt of your order.'
  });
};

export const getProfile = async (req, res) => {
  const user = db.users.find(u => u.id === req.user.id) || req.user;
  if (!user.deliveryPin) {
    user.deliveryPin = generateUniqueDeliveryPin();
  }

  const { passwordHash, ...userWithoutPassword } = user;

  // Merge with extended profile from MongoDB
  try {
    const extendedProfile = await getUserProfile(req.user.id);
    if (extendedProfile) {
      userWithoutPassword.avatarUrl = extendedProfile.avatarUrl || '';
      userWithoutPassword.preferences = extendedProfile.preferences || {};
      userWithoutPassword.addresses = extendedProfile.addresses || [];
      userWithoutPassword.walletHistory = (extendedProfile.walletHistory || []).slice(0, 20);
    }
  } catch (err) {
    // Profile fetch failed — return base user data
    console.error('Profile merge error:', err.message);
  }

  return res.json({ success: true, user: userWithoutPassword });
};

export const updateProfile = async (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const { name, phone, roomDetails, collegeId, avatarUrl, preferences, addresses } = req.body;

  // Update base user fields in the main store
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (roomDetails) user.roomDetails = roomDetails;
  if (collegeId) user.collegeId = collegeId;

  // Update extended profile fields in MongoDB
  const mongoUpdates = {};
  if (avatarUrl !== undefined) mongoUpdates.avatarUrl = avatarUrl;
  if (preferences) mongoUpdates.preferences = preferences;
  if (addresses) mongoUpdates.addresses = addresses;

  if (Object.keys(mongoUpdates).length > 0) {
    try {
      await updateUserProfile(req.user.id, mongoUpdates);
      console.log(`   👤 Extended profile updated in MongoDB for ${user.name}`);
    } catch (err) {
      console.error('   ⚠️ Failed to update MongoDB profile:', err.message);
    }
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return res.json({ success: true, message: 'Profile updated', user: userWithoutPassword });
};

// GET /api/auth/notifications
export const getNotifications = (req, res) => {
  const userId = req.user.id;
  const userNotifs = db.notifications.filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);
  const unreadCount = userNotifs.filter(n => !n.read).length;
  return res.json({ success: true, notifications: userNotifs, unreadCount });
};

// PUT /api/auth/notifications/read
export const markNotificationsRead = (req, res) => {
  const userId = req.user.id;
  const { ids } = req.body; // array of notification ids, or empty to mark all
  db.notifications.forEach(n => {
    if (n.userId === userId && (!ids || ids.includes(n.id))) {
      n.read = true;
    }
  });
  return res.json({ success: true, message: 'Notifications marked as read' });
};

// POST /api/auth/notifications (create notification - used internally)
export const createNotification = ({ userId, type, title, message }) => {
  const notif = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(notif);
  return notif;
};
