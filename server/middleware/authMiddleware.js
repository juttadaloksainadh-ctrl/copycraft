import { verifyToken } from '../config/jwt.js';
import { getDb, getMongoCollection, isUsingMongo } from '../config/db.js';

/**
 * Authenticate the Bearer token from the Authorization header.
 * Works with both in-memory store (dev/demo) and MongoDB (production).
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
    let user = null;

    if (isUsingMongo()) {
      // MongoDB mode — look up by the id stored in the token
      const usersCol = getMongoCollection('users');
      // Support both string `id` field and MongoDB ObjectId `_id`
      user = await usersCol.findOne({ id: decoded.id });
      if (!user) {
        // Fallback: try matching _id if id field isn't present
        const { ObjectId } = await import('mongodb');
        try {
          user = await usersCol.findOne({ _id: new ObjectId(decoded.id) });
        } catch (_) {
          // decoded.id is not a valid ObjectId — leave user as null
        }
      }
    } else {
      // In-memory mode
      const { db } = getDb();
      user = db.users.find(u => u.id === decoded.id);
    }

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
