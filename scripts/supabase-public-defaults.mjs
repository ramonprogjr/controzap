/**
 * Valores públicos do Supabase (anon) — mesmo que vão no bundle do cliente.
 * Render/outros hosts podem omitir NEXT_PUBLIC_* no painel; o build usa estes defaults.
 */
export const SUPABASE_URL = "https://ncvwocdinqudlgivnmpz.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdndvY2RpbnF1ZGxnaXZubXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTkzMDEsImV4cCI6MjA5NDUzNTMwMX0.u3iDJC9YmjWzLMI5CUGk3-MjZR9QhyxTADQtLaCaNIo";

export function applySupabasePublicDefaults() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  }
}
