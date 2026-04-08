import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me', // TODO: Replace with actual key in .env before deployment
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me', // TODO: Replace with actual key in .env before deployment
  groqApiKey: process.env.GROQ_API_KEY || '', // ⚠️ SECURITY: NEVER EXPOSE THIS TO FRONTEND
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177',
  isProduction: process.env.NODE_ENV === 'production',
  // Supabase Configuration
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '', // Supports both server and Vite env naming
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || '', // Supports both server and Vite env naming
  // Razorpay Configuration
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayPlanId: process.env.RAZORPAY_PLAN_ID || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'vestiga_razorpay_secret_123456',
};
