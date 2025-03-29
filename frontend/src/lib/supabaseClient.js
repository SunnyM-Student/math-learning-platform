import { createClient } from '@supabase/supabase-js'

// Get the URL and anon key from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Create a Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
