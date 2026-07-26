import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Set both in .env.local (and in your hosting provider\'s environment variables) — ' +
    'the app cannot start without them.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,          // Persist session across browser reloads
    autoRefreshToken: true,        // Auto-refresh JWT before expiry
    storageKey: 'pala-pitta-auth', // Unique key to avoid conflicts
    detectSessionInUrl: true,      // Handle OAuth redirects automatically
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'pala-pitta-ruchulu/1.0',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Throttle realtime events to avoid flooding
    },
  },
});
