/** Manter em sync com scripts/supabase-public-defaults.mjs */
const SUPABASE_URL = "https://ncvwocdinqudlgivnmpz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdndvY2RpbnF1ZGxnaXZubXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTkzMDEsImV4cCI6MjA5NDUzNTMwMX0.u3iDJC9YmjWzLMI5CUGk3-MjZR9QhyxTADQtLaCaNIo";

export function getPublicSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || SUPABASE_URL;
}

export function getPublicSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || SUPABASE_ANON_KEY;
}
