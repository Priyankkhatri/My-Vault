import { createClient } from '@supabase/supabase-js';

// ⚠️ SECURITY WARNING: NEVER EXPOSE YOUR SERVICE_ROLE_KEY IN THE FRONTEND.
// ⚠️ ONLY USE THE ANON_KEY OR ENVIRONMENT VARIABLES.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''; // TODO: Replace with actual key in .env before deployment
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''; // TODO: Replace with actual key in .env before deployment

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars are missing. Authentication may fail.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
