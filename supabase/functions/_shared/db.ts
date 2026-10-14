import { createClient } from 'npm:@supabase/supabase-js@2';

// SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY Supabase передаёт в функции сам.
export const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false },
});
