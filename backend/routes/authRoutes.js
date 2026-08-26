import express from 'express';
import {
  register, login, getProfile, updateProfile, getDeliveryPin,
  getNotifications, markNotificationsRead,
  changePassword, forgotPassword, verifyOtp, resetPassword
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/delivery-pin', authenticateToken, getDeliveryPin);
router.get('/notifications', authenticateToken, getNotifications);
router.put('/notifications/read', authenticateToken, markNotificationsRead);

// Password management
router.put('/change-password', authenticateToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', authenticateToken, resetPassword);

export default router;
