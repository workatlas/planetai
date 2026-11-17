import { createClient } from '@supabase/supabase-js';

// These are public browser credentials. They are safe to expose when database
// tables are protected by RLS. Never place a Supabase secret/service-role key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lfccdqvwpfohfuhlijso.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_8E4SEZMtmsWisjz6upd31Q_L2HfyR4L';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
