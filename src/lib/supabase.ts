// Supabase REST configuration for the Dr. Ashraf content planner.
// The publishable key is intended for frontend use. Database access is
// controlled by Row Level Security policies in supabase/setup.sql.

const FALLBACK_SUPABASE_URL = 'https://ubypzxuykhbonquvucxl.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_fBUzuVQ6hAiBEnt_FU4b_g_jVo6yg3m';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL;

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
);
