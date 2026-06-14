import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type VelmereDatabase = Record<string, never>;

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseServerClient() {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceRoleKey || anonKey;

  cachedClient = url && key
    ? createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

  return cachedClient;
}

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}
