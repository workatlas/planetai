import { createClient } from '@supabase/supabase-js';

// Public browser credentials only. Never place Supabase secret/service-role keys here.
const isDeployPreview = import.meta.env.VITE_NETLIFY_CONTEXT === 'deploy-preview';
const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Deploy previews must never silently fall back to production credentials.
if (isDeployPreview && (!configuredUrl || !configuredKey)) {
  throw new Error('Deploy Preview Supabase sandbox configuration is missing. Refusing to connect.');
}

const supabaseUrl = configuredUrl || 'https://lfccdqvwpfohfuhlijso.supabase.co';
const supabasePublishableKey = configuredKey || 'sb_publishable_8E4SEZMtmsWisjz6upd31Q_L2HfyR4L';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
