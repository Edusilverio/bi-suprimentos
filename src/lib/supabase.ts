import { createClient } from '@supabase/supabase-js'
import { config } from '@/config/env'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  config.supabaseUrl,
  config.supabaseKey,
  { db: { schema: ((import.meta.env.VITE_SUPABASE_SCHEMA as string | undefined) || "public") as "public" } }
)
