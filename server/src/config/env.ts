import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me', // TODO: Replace with actual key in .env before deployment
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me', // TODO: Replace with actual key in .env before deployment
  groqApiKey: process.env.GROQ_API_KEY || '', // ⚠️ SECURITY: NEVER EXPOSE THIS TO FRONTEND
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  // Supabase Configuration
  supabaseUrl: process.env.VITE_SUPABASE_URL || '', // TODO: Replace with actual key in .env before deployment
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '', // TODO: Replace with actual key in .env before deployment
};
