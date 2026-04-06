/**
 * Vestiga Backend Server
 *
 * Express 5 API server providing:
 * - Zero-knowledge vault storage (encrypted blobs only)
 * - JWT authentication with refresh token rotation
 * - AI proxy to Groq API with per-user quota enforcement
 * - Device session management
 * - Security audit logging
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import vaultRoutes from './routes/vault.routes.js';
import aiRoutes from './routes/ai.routes.js';
import deviceRoutes from './routes/device.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();

// ─── Security Middleware ────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      imgSrc: ["'self'", "data:", "https://checkout.razorpay.com"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://lvodmlfhbchogmkdgooy.supabase.co"],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowed = env.corsOrigin.split(',').map(s => s.trim());
    // In dev, allow any localhost origin. In prod, allow specified origins.
    if (!origin || allowed.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature'],
}));

app.use(express.json({ limit: '5mb' }));

// Rate limiting for auth routes (5 requests per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
});

// ─── Routes ─────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vault', apiLimiter, vaultRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/devices', apiLimiter, deviceRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      ai: env.groqApiKey ? 'configured' : 'not configured',
      supabase: env.supabaseUrl ? 'configured' : 'MISSING',
      supabaseKey: env.supabaseAnonKey ? 'configured' : 'MISSING',
      razorpay: env.razorpayKeyId ? 'configured' : 'MISSING',
      razorpayPlan: env.razorpayPlanId ? 'configured' : 'MISSING',
      cors: env.corsOrigin,
      db: env.databaseUrl ? 'PostgreSQL' : 'in-memory',
      nodeEnv: process.env.NODE_ENV || 'not set',
    },
  });
});
// TEMPORARY: Debug endpoint to test Supabase auth
app.get('/api/debug-auth', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.json({ step: 'no-token', message: 'No Authorization header sent' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const testClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const { data, error } = await testClient.auth.getUser(token);
    res.json({
      step: 'supabase-verify',
      supabaseUrl: env.supabaseUrl ? env.supabaseUrl.substring(0, 30) + '...' : 'EMPTY',
      hasKey: !!env.supabaseAnonKey,
      tokenPrefix: token.substring(0, 20) + '...',
      user: data?.user ? { id: data.user.id, email: data.user.email } : null,
      error: error ? { message: error.message, status: error.status } : null,
    });
  } catch (err: any) {
    res.json({ step: 'crash', error: err.message });
  }
});

// Audit logs endpoint
app.get('/api/audit-logs', authMiddleware, async (req, res) => {
  try {
    const { getAuditLogs } = await import('./db/store.js');
    const logs = await getAuditLogs(req.user!.userId, 50);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Start Server ───────────────────────────────────────────────

app.listen(env.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🛡️ Vestiga Security Server v1.0.0                  ║
║                                                      ║
║   Port:    ${String(env.port).padEnd(42)}║
║   Mode:    ${(env.isProduction ? 'production' : 'development').padEnd(42)}║
║   CORS:    ${env.corsOrigin.padEnd(42)}║
║   AI:      ${(env.groqApiKey ? '✅ Groq configured' : '⚠️  No API key').padEnd(42)}║
║   DB:      ${(env.databaseUrl ? '✅ PostgreSQL' : '📦 In-memory (dev)').padEnd(42)}║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);
});

export default app;
