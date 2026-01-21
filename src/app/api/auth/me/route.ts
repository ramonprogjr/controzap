import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const cookieStore = await cookies()

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() { },
      },
    }
  )

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() { },
      },
    }
  )

  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null

  const { data: { user }, error: authError } = bearerToken
    ? await supabaseAuth.auth.getUser(bearerToken)
    : await supabaseAuth.auth.getUser()

  let finalUser = user

  if (authError || !finalUser) {
    if (bearerToken) {
      const { data: { user: tokenUser } } = await supabaseAuth.auth.getUser(bearerToken)
      finalUser = tokenUser || null
    } else {
      const { data: { session } } = await supabaseAuth.auth.getSession()
      finalUser = session?.user || null
    }
  }

  if (!finalUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, company_id, name, email, role, is_active')
    .eq('id', finalUser.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 403 })
  }

  if (userData.is_active === false) {
    return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
  }

  const { data: roleRows } = await supabaseAdmin
    .from('user_roles')
    .select('role_id, roles(name, role_permissions(permissions(key)))')
    .eq('user_id', finalUser.id)

  const roleNames = (roleRows || [])
    .map((row: any) => row.roles?.name)
    .filter(Boolean)

  const permissions = (roleRows || [])
    .flatMap((row: any) =>
      (row.roles?.role_permissions || [])
        .map((rp: any) => rp.permissions?.key)
        .filter(Boolean)
    )

  const primaryRole = userData.role || roleNames[0] || null

  return NextResponse.json({
    user: {
      id: userData.id,
      company_id: userData.company_id,
      name: userData.name,
      email: userData.email,
      role: primaryRole,
      is_active: userData.is_active,
    },
    roles: roleNames,
    permissions,
  })
}
