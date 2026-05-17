import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Admin client — bypasses RLS (server-side use only)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Anon client — respects RLS (for JWT-scoped queries)
export const supabaseAnon = createClient(
  config.supabase.url,
  config.supabase.anonKey
);
