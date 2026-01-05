import { createClient } from '@supabase/supabase-js';

// Using the credentials provided by the user
// Fallback to environment variables if present, otherwise use provided constants
const supabaseUrl = process.env.SUPABASE_URL || 'https://jwcvbgfuktoqqzkqsnec.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_IjcTEWTTEDxcPH1Ow-0s0A__JcXe2xc';

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.warn("Supabase URL is missing or using placeholder. Ensure configuration is correct.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
