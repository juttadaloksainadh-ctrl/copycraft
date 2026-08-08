import { verifyToken } from '../config/jwt.js';
import { db } from '../models/dbStore.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }

  const user = db.users.find(u => u.id === decoded.id);
  if (!user) {
    return res.status(403).json({ success: false, message: 'User not found' });
  }

  req.user = user;
  next();
};
