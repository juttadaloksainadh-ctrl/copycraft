import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { generateToken } from '../config/jwt.js';
import { db } from '../models/dbStore.js';
import { createUserProfile, getUserProfile, updateUserProfile } from '../models/userProfile.js';
import { getMongoCollection, isUsingMongo } from '../config/db.js';

// In-memory OTP store: { email -> { otp, expiresAt } }
const otpStore = new Map();

// Create nodemailer transporter
function getMailTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
}

async function sendOtpEmail(email, otp, name) {
  const transporter = getMailTransporter();
  if (!transporter) {
    // Dev mode: log OTP to console
    console.log(`\n📧 [DEV MODE] OTP for ${email}: ${otp} (valid 10 mins)\n`);
    return true;
  }
  try {
    await transporter.sendMail({
      from: `"CopyCraft" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'CopyCraft — Your Password Reset OTP',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:2rem;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:1.6rem">CopyCraft</h1>
            <p style="margin:0.4rem 0 0;color:#c7d2fe;font-size:0.9rem">Password Reset OTP</p>
          </div>
          <div style="padding:2rem">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Your one-time password (OTP) to reset your CopyCraft account password is:</p>
            <div style="text-align:center;margin:1.5rem 0">
              <span style="font-size:2.5rem;font-weight:900;letter-spacing:12px;color:#818cf8;background:#1e1b4b;padding:0.75rem 1.5rem;border-radius:12px;display:inline-block">${otp}</span>
            </div>
            <p style="color:#94a3b8;font-size:0.85rem">⏰ This OTP is valid for <strong>10 minutes</strong> only. Do not share it with anyone.</p>
            <p style="color:#94a3b8;font-size:0.85rem">If you did not request this, please ignore this email.</p>
          </div>
          <div style="padding:1rem 2rem;border-top:1px solid #1e293b;text-align:center;font-size:0.75rem;color:#475569">
            © 2026 CopyCraft · Print | Delivery | Trust
          </div>
        </div>
      `
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

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

function generateUniqueDeliveryPin() {
  const existingPins = new Set(db.users.map(u => u.deliveryPin).filter(Boolean));
  let pin;
  let attempts = 0;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
    if (attempts > 10000) {
      pin = Math.floor(1000000 + Math.random() * 9000000).toString();
    }
  } while (existingPins.has(pin));
  return pin;
}

async function findUserByEmail(email) {
  if (isUsingMongo()) {
    const usersCol = getMongoCollection('users');
    return usersCol.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
  }
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

async function findUserById(id) {
  if (isUsingMongo()) {
    const usersCol = getMongoCollection('users');
    return usersCol.findOne({ id });
  }
  return db.users.find(u => u.id === id);
}

export const register = async (req, res) => {
  const { name, phone, email, password, collegeId = '', roomDetails } = req.body;

  if (!name || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, phone, email and password are all required' });
  }

  const existingUser = await findUserByEmail(email);
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

  if (isUsingMongo()) {
    const usersCol = getMongoCollection('users');
    await usersCol.insertOne(newUser);
  } else {
    db.users.push(newUser);
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: newUser.id,
    userName: newUser.name,
    action: 'USER_REGISTER',
    details: `Customer registered with delivery PIN ${deliveryPin}`,
    timestamp: new Date().toISOString()
  });

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

export const login = async (req, res) => {
  const { email, password, portal = 'customer' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = await findUserByEmail(email);

  if (!user) {
    if (portal !== 'customer') {
      reportSecurityAlert(portal, email, 'NON_EXISTENT_USER');
    }
    return res.status(401).json({
      success: false,
      message: 'Warning: Invalid credentials. Unauthorized access attempts are monitored and recorded.'
    });
  }

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

  const portalRoles = {
    customer: ['customer'],
    dealer: ['dealer', 'stationery_dealer'],
    stationery_dealer: ['stationery_dealer', 'dealer'],
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

  // Check crossover permissions
  if (portal === 'stationery_dealer' && user.role === 'dealer' && user.dealerType !== 'stationery') {
    return res.status(403).json({
      success: false,
      message: 'Security Alert: You are registered as a Print Dealer. Please access the Printing Hub instead.'
    });
  }
  if (portal === 'dealer' && (user.role === 'stationery_dealer' || user.dealerType === 'stationery')) {
    return res.status(403).json({
      success: false,
      message: 'Security Alert: You are registered as a Stationery Dealer. Please access the Stationery Hub instead.'
    });
  }

  if (!user.deliveryPin) {
    user.deliveryPin = generateUniqueDeliveryPin();
    if (isUsingMongo()) {
      const usersCol = getMongoCollection('users');
      await usersCol.updateOne({ id: user.id }, { $set: { deliveryPin: user.deliveryPin } });
    }
  }

  const token = generateToken({ id: user.id, role: user.role, email: user.email });
  const { passwordHash: _, ...userWithoutPassword } = user;

  return res.json({
    success: true,
    message: 'Logged in successfully',
    token,
    user: userWithoutPassword
  });
};

export const getDeliveryPin = async (req, res) => {
  const user = await findUserById(req.user.id) || req.user;

  if (!user.deliveryPin) {
    user.deliveryPin = generateUniqueDeliveryPin();
    if (isUsingMongo()) {
      const usersCol = getMongoCollection('users');
      await usersCol.updateOne({ id: user.id }, { $set: { deliveryPin: user.deliveryPin } });
    }
  }

  return res.json({
    success: true,
    deliveryPin: user.deliveryPin,
    message: 'Share this PIN with the delivery person to confirm receipt of your order.'
  });
};

export const getProfile = async (req, res) => {
  const user = await findUserById(req.user.id) || req.user;
  if (!user.deliveryPin) {
    user.deliveryPin = generateUniqueDeliveryPin();
  }

  const { passwordHash, ...userWithoutPassword } = user;

  try {
    const extendedProfile = await getUserProfile(req.user.id);
    if (extendedProfile) {
      userWithoutPassword.avatarUrl = extendedProfile.avatarUrl || '';
      userWithoutPassword.preferences = extendedProfile.preferences || {};
      userWithoutPassword.addresses = extendedProfile.addresses || [];
      userWithoutPassword.walletHistory = (extendedProfile.walletHistory || []).slice(0, 20);
    }
  } catch (err) {
    console.error('Profile merge error:', err.message);
  }

  return res.json({ success: true, user: userWithoutPassword });
};

export const updateProfile = async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const { name, phone, roomDetails, collegeId, avatarUrl, preferences, addresses } = req.body;

  const baseUpdates = {};
  if (name) { user.name = name; baseUpdates.name = name; }
  if (phone) { user.phone = phone; baseUpdates.phone = phone; }
  if (roomDetails) { user.roomDetails = roomDetails; baseUpdates.roomDetails = roomDetails; }
  if (collegeId) { user.collegeId = collegeId; baseUpdates.collegeId = collegeId; }

  if (isUsingMongo() && Object.keys(baseUpdates).length > 0) {
    const usersCol = getMongoCollection('users');
    await usersCol.updateOne({ id: user.id }, { $set: baseUpdates });
  }

  const mongoUpdates = {};
  if (avatarUrl !== undefined) mongoUpdates.avatarUrl = avatarUrl;
  if (preferences) mongoUpdates.preferences = preferences;
  if (addresses) mongoUpdates.addresses = addresses;

  if (Object.keys(mongoUpdates).length > 0) {
    try {
      await updateUserProfile(req.user.id, mongoUpdates);
    } catch (err) {
      console.error('⚠️ Failed to update profile:', err.message);
    }
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return res.json({ success: true, message: 'Profile updated', user: userWithoutPassword });
};

export const getNotifications = (req, res) => {
  const userId = req.user.id;
  const userNotifs = db.notifications.filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);
  const unreadCount = userNotifs.filter(n => !n.read).length;
  return res.json({ success: true, notifications: userNotifs, unreadCount });
};

export const markNotificationsRead = (req, res) => {
  const userId = req.user.id;
  const { ids } = req.body;
  db.notifications.forEach(n => {
    if (n.userId === userId && (!ids || ids.includes(n.id))) {
      n.read = true;
    }
  });
  return res.json({ success: true, message: 'Notifications marked as read' });
};

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

// ─── Change Password (requires current password) ────────────────────────────
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }

  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const newHash = bcrypt.hashSync(newPassword, saltRounds);
  user.passwordHash = newHash;

  if (isUsingMongo()) {
    const usersCol = getMongoCollection('users');
    await usersCol.updateOne({ id: user.id }, { $set: { passwordHash: newHash } });
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: user.id,
    userName: user.name,
    action: 'PASSWORD_CHANGED',
    details: 'User changed their password via profile settings.',
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, message: 'Password changed successfully!' });
};

// ─── Forgot Password — Send OTP ─────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  const user = await findUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists
    return res.json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
  }

  // Only customers can use forgot password
  if (user.role !== 'customer') {
    return res.json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(email.toLowerCase(), { otp, expiresAt, userId: user.id });

  await sendOtpEmail(email, otp, user.name);

  return res.json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
};

// ─── Verify OTP ─────────────────────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required.' });

  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP was requested for this email, or it has expired.' });
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
  }

  // OTP is valid — issue a short-lived reset token
  const user = await findUserByEmail(email);
  const resetToken = generateToken({ id: user.id, role: user.role, email: user.email, otpVerified: true }, '15m');

  // Mark OTP as used
  otpStore.delete(email.toLowerCase());

  return res.json({ success: true, message: 'OTP verified successfully.', resetToken, user: { name: user.name, email: user.email } });
};

// ─── Reset Password (after OTP verification) ────────────────────────────────
export const resetPassword = async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) return res.status(400).json({ success: false, message: 'New password is required.' });
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  // req.user is set by authenticateToken middleware — must have otpVerified flag
  if (!req.user.otpVerified) {
    return res.status(403).json({ success: false, message: 'OTP verification required before resetting password.' });
  }

  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const newHash = bcrypt.hashSync(newPassword, saltRounds);
  user.passwordHash = newHash;

  if (isUsingMongo()) {
    const usersCol = getMongoCollection('users');
    await usersCol.updateOne({ id: user.id }, { $set: { passwordHash: newHash } });
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    userId: user.id,
    userName: user.name,
    action: 'PASSWORD_RESET',
    details: 'User reset their password via OTP verification.',
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, message: 'Password reset successfully! You can now log in with your new password.' });
};
