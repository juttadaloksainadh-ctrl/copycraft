import { verifyToken } from '../config/jwt.js';
import { getDb } from '../config/db.js';

/**
 * Authenticate the Bearer token from the Authorization header.
 * Uses the Cloudflare R2 / dbStore backend.
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }

  try {
    const { db } = getDb();
    const user = db.users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('authMiddleware error:', err.message);
    return res.status(500).json({ success: false, message: 'Authentication error' });
  }
};
