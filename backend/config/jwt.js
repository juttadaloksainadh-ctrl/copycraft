import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Fail loudly in production instead of silently signing tokens with a
// guessable default. This also makes a missing env var on your host
// (Render/Railway) obvious immediately at startup instead of showing up
// later as a mysterious "invalid token" error.
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production. ' +
      'Set it in your hosting provider\'s environment variables.'
    );
  }
  console.warn(
    '⚠️  JWT_SECRET is not set. Using an insecure development-only default. ' +
    'Set JWT_SECRET in your .env before deploying.'
  );
}

const SECRET = JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-production';

export const generateToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    return null;
  }
};
