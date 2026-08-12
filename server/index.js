import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase, closeDatabase } from './config/db.js';
import { initR2 } from './services/r2Storage.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import dealerRoutes from './routes/dealerRoutes.js';
import distributorRoutes from './routes/distributorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ---- CORS ----
// CORS_ORIGIN can be a single URL or a comma-separated list, e.g.:
//   CORS_ORIGIN=https://copycraft-nine.vercel.app,http://localhost:3000
// This lets the same backend serve your local dev frontend AND your
// deployed Vercel frontend without blocking either one.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, health checks) which have no Origin header
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
    console.warn(`   → Allowed origins: ${allowedOrigins.join(', ')}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: `${process.env.MAX_FILE_SIZE_MB || 50}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${process.env.MAX_FILE_SIZE_MB || 50}mb` }));

// Request logger
app.use((req, res, next) => {
  if (process.env.LOG_LEVEL === 'debug') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dealer', dealerRoutes);
app.use('/api/distributor', distributorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'CopyCraft SaaS Engine',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.url} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Initialize database, R2 storage, and start server
async function startServer() {
  try {
    const dbResult = await initDatabase();
    console.log(`📋 Database initialized in ${dbResult.mode} mode`);

    // Initialize Cloudflare R2 object storage
    const r2Ready = initR2();

    app.listen(PORT, () => {
      console.log(`🚀 CopyCraft Backend Server running on http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 JWT Expiry: ${process.env.JWT_EXPIRES_IN || '7d'}`);
      console.log(`🌐 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
      console.log(`📁 File Storage: ${r2Ready ? 'Cloudflare R2' : 'In-Memory (configure R2 for cloud storage)'}`);
      console.log(`💳 Payment Receipts: ${dbResult.mode === 'mongodb' ? 'MongoDB' : 'In-Memory (connect MongoDB for persistence)'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});

startServer();
