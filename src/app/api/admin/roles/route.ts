import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

async function getAdminContext() {
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

  const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser()

  let user = authUser

  if (authError || !user) {
    console.log('[API Roles] getUser failed, trying getSession. Error:', authError?.message)
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
    if (session?.user) {
      user = session.user
      console.log('[API Roles] getSession success. User ID:', user.id)
    } else {
      console.log('[API Roles] getSession failed. Error:', sessionError?.message)
    }
  }

  if (!user) return null

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() { },
      },
    }
  )

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('id, company_id, role, is_active')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id || userData.is_active === false) return null
  if ((userData.role || '').toLowerCase() !== 'admin') return null

  return { supabaseAdmin, companyId: userData.company_id }
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { },
      },
    }
  )

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2. Get User Company
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    return NextResponse.json({ error: 'Usuário sem empresa vinculada' }, { status: 403 })
  }

  const companyId = userData.company_id

  // 3. Fetch Roles
  const { data, error } = await supabase
    .from('roles')
    .select(`
      id,
      name,
      description,
      is_system,
      company_id,
      role_permissions(
        permission_id,
        permissions(key)
      )
    `)
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .order('is_system', { ascending: false })

  if (error) {
    console.error('[API Roles] Error fetching:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const roles = (data || []).map((role: any) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    is_system: role.is_system,
    company_id: role.company_id,
    permissions: (role.role_permissions || [])
      .map((rp: any) => rp.permissions?.key)
      .filter(Boolean),
  }))

  return NextResponse.json({ roles })
}

export async function POST(request: Request) {
  const ctx = await getAdminContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { name, description, permissions } = await request.json()
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma permissão' }, { status: 400 })
  }

  const { data: role, error } = await ctx.supabaseAdmin
    .from('roles')
    .insert({
      company_id: ctx.companyId,
      name: name.trim(),
      description: description || null,
      is_system: false,
    })
    .select('id')
    .single()

  if (error || !role) {
    return NextResponse.json({ error: error?.message || 'Erro ao criar cargo' }, { status: 500 })
  }

  if (Array.isArray(permissions) && permissions.length > 0) {
    const { data: perms } = await ctx.supabaseAdmin
      .from('permissions')
      .select('id, key')
      .in('key', permissions)

    if (perms?.length) {
      await ctx.supabaseAdmin.from('role_permissions').insert(
        perms.map((perm) => ({
          role_id: role.id,
          permission_id: perm.id,
        }))
      )
    }
  }

  return NextResponse.json({ success: true, roleId: role.id })
}

export async function PUT(request: Request) {
  const ctx = await getAdminContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { roleId, name, description, permissions } = await request.json()
  if (!roleId) {
    return NextResponse.json({ error: 'roleId é obrigatório' }, { status: 400 })
  }

  const { data: role } = await ctx.supabaseAdmin
    .from('roles')
    .select('id, is_system')
    .eq('id', roleId)
    .single()

  if (!role || role.is_system) {
    return NextResponse.json({ error: 'Cargo de sistema não pode ser editado' }, { status: 403 })
  }

  await ctx.supabaseAdmin
    .from('roles')
    .update({
      name: name?.trim() || undefined,
      description: description ?? undefined,
    })
    .eq('id', roleId)

  if (Array.isArray(permissions)) {
    await ctx.supabaseAdmin.from('role_permissions').delete().eq('role_id', roleId)

    if (permissions.length > 0) {
      const { data: perms } = await ctx.supabaseAdmin
        .from('permissions')
        .select('id, key')
        .in('key', permissions)

      if (perms?.length) {
        await ctx.supabaseAdmin.from('role_permissions').insert(
          perms.map((perm) => ({
            role_id: roleId,
            permission_id: perm.id,
          }))
        )
      }
    } else {
      return NextResponse.json({ error: 'Selecione ao menos uma permissão' }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const ctx = await getAdminContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { roleId } = await request.json()
  if (!roleId) {
    return NextResponse.json({ error: 'roleId é obrigatório' }, { status: 400 })
  }

  const { data: role } = await ctx.supabaseAdmin
    .from('roles')
    .select('id, is_system')
    .eq('id', roleId)
    .single()

  if (!role || role.is_system) {
    return NextResponse.json({ error: 'Cargo de sistema não pode ser excluído' }, { status: 403 })
  }

  await ctx.supabaseAdmin.from('roles').delete().eq('id', roleId)
  return NextResponse.json({ success: true })
}
