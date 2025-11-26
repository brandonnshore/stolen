import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dntnjlodfcojzgovikic.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (import.meta.env.DEV) console.log('[Supabase] Initializing client with URL:', supabaseUrl);
if (import.meta.env.DEV) console.log('[Supabase] Anon key present:', supabaseAnonKey ? 'YES' : 'NO');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

if (import.meta.env.DEV) console.log('[Supabase] Client created successfully');
