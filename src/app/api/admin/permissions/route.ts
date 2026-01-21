import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'



export async function GET() {
  const cookieStore = await cookies()

  // 1. Client for Authentication (uses cookies)
  // Use ANON key to properly respect the Auth cookie without forcing admin privileges prematurely
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { },
      },
    }
  )

  // 2. Client for System Data (NO cookies, pure Service Role access)
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] }, // No cookies to ensure no user context is attached
        setAll() { },
      },
    }
  )

  // Verify authentication
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

  if (authError || !user) {
    console.error('[API Permissions] Auth Failed:', authError?.message || 'No user found')
    // Debug: Print cookie names to see if session exists
    // console.log('[API Permissions] Cookies present:', cookieStore.getAll().map(c => c.name))
    return NextResponse.json({ error: 'Não autenticado', details: authError?.message }, { status: 401 })
  }

  // Fetch permissions using System Admin Client (Bypass RLS)
  const { data, error } = await supabaseAdmin
    .from('permissions')
    .select('id, key, description, created_at')
    .order('key', { ascending: true })

  if (error) {
    console.error('[API Permissions] Error fetching:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ permissions: data || [] })
}


