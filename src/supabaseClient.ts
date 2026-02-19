import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Creates a non-persisting Supabase client.
 * Useful for auth operations that shouldn't affect the main app session (e.g. inviting users).
 */
export const createTempClient = () => createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
})
