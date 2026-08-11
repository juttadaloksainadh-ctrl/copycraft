import express from 'express';
import { register, login, getProfile, updateProfile, getDeliveryPin, getNotifications, markNotificationsRead } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/delivery-pin', authenticateToken, getDeliveryPin);
router.get('/notifications', authenticateToken, getNotifications);
router.put('/notifications/read', authenticateToken, markNotificationsRead);

export default router;
