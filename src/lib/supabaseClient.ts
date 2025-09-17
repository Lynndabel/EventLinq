import { createClient } from '@supabase/supabase-js'

// In Next.js, for client-side usage, use NEXT_PUBLIC_* vars.
// For server-side only, you can switch to service role if needed (not required for MVP).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // We don't throw at import time to avoid build failures on first boot.
  // Endpoints will handle missing envs gracefully.
  // console.warn('Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseAnonKey || 'anon-key')
