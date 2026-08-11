import bcrypt from 'bcryptjs';
import { generateToken } from '../config/jwt.js';
import { db } from '../models/dbStore.js';
import { createUserProfile, getUserProfile, updateUserProfile } from '../models/userProfile.js';

// Memory store for active OTP verification sessions
const registrationSessions = new Map();
const loginSessions = new Map();

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

// Phase 1: Customer Registration OTP Request
export const requestRegistrationOtp = (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and Phone number are required' });
  }

  // Generate 4 digit registration OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const sessionId = `reg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  registrationSessions.set(sessionId, { name, phone, otp });
  console.log(`[SMS-MOCK] Verification OTP sent to ${phone}: ${otp}`);

  return res.json({
    success: true,
    message: `OTP sent to ${phone} (Simulated OTP: ${otp})`,
    sessionId
  });
};

// Phase 2: Complete Customer Registration
export const register = (req, res) => {
  const { sessionId, otp, email, password, collegeId = 'clg_1', roomDetails } = req.body;

  if (!sessionId || !otp || !email || !password) {
    return res.status(400).json({ success: false, message: 'All registration parameters are required' });
  }

  const session = registrationSessions.get(sessionId);
  if (!session) {
    return res.status(400).json({ success: false, message: 'Registration session expired or invalid' });
  }

  if (session.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code. Registration rejected.' });
  }

  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email address is already registered' });
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const salt = bcrypt.genSaltSync(saltRounds);
  const passwordHash = bcrypt.hashSync(password, salt);
  const referralCode = session.name.slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900);

  const newUser = {
    id: `usr_${Date.now()}`,
    email,
    passwordHash,
    name: session.name,
    phone: session.phone,
    role: 'customer',
    collegeId,
    roomDetails: roomDetails || 'Campus Building',
    referralCode,
    walletBalance: 50,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  registrationSessions.delete(sessionId);

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: newUser.id,
    userName: newUser.name,
    action: 'USER_REGISTER',
    details: `Customer registered using OTP verification on ${session.phone}`,
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
    user: userWithoutPassword
  });
};

// Login API supporting Portal security enforcement & staff OTP step-up
export const login = (req, res) => {
  const { email, password, portal = 'customer', phone } = req.body;

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

  // Staff (Dealer / Distributor) OTP Enforcement Check
  if (['dealer', 'distributor'].includes(user.role)) {
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for staff multi-factor verification.'
      });
    }

    if (user.phone !== phone) {
      reportSecurityAlert(portal, email, 'PHONE_NUMBER_MISMATCH', `Provided: ${phone}, Registered: ${user.phone}`);
      return res.status(403).json({
        success: false,
        message: 'Security Alert: Verification phone number does not match registered profile. Handshake refused.'
      });
    }

    // Generate simulated OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const sessionId = `staff_${Date.now()}`;
    loginSessions.set(sessionId, { userId: user.id, otp });

    console.log(`[MOCK-SMS] Staff Login OTP for ${user.name}: ${otp}`);

    return res.json({
      success: true,
      otpRequired: true,
      sessionId,
      message: `Verification code sent to ${phone} (Simulated OTP: ${otp})`
    });
  }

  // Customers & Admins bypass login OTP
  const token = generateToken({ id: user.id, role: user.role, email: user.email });
  const { passwordHash: _, ...userWithoutPassword } = user;

  return res.json({
    success: true,
    message: 'Logged in successfully',
    token,
    user: userWithoutPassword
  });
};

// Staff Login OTP Verification Completion
export const verifyStaffLoginOtp = (req, res) => {
  const { sessionId, otp } = req.body;
  if (!sessionId || !otp) {
    return res.status(400).json({ success: false, message: 'Session ID and OTP are required' });
  }

  const session = loginSessions.get(sessionId);
  if (!session) {
    return res.status(400).json({ success: false, message: 'Verification session expired' });
  }

  if (session.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code. Authentication refused.' });
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User record not found' });
  }

  loginSessions.delete(sessionId);
  const token = generateToken({ id: user.id, role: user.role, email: user.email });
  const { passwordHash: _, ...userWithoutPassword } = user;

  return res.json({
    success: true,
    message: 'Staff verification successful. Access granted.',
    token,
    user: userWithoutPassword
  });
};

export const getProfile = async (req, res) => {
  const { passwordHash, ...userWithoutPassword } = req.user;

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

