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
    console.log('[API Users] getUser failed, trying getSession. Error:', authError?.message)
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()
    if (session?.user) {
      user = session.user
      console.log('[API Users] getSession success. User ID:', user.id)
    } else {
      console.log('[API Users] getSession failed. Error:', sessionError?.message)
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
  const ctx = await getAdminContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { data, error } = await ctx.supabaseAdmin
    .from('users')
    .select('id, name, email, phone, role, is_active, created_at')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data || [] })
}

export async function POST(request: Request) {
  const ctx = await getAdminContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { name, email, password, roleId } = await request.json()
  if (!name || !email || !password || !roleId) {
    return NextResponse.json({ error: 'Nome, email, senha e cargo são obrigatórios' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres' }, { status: 400 })
  }

  const { data: authUser, error: authError } = await ctx.supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message || 'Erro ao criar usuário' }, { status: 500 })
  }

  const { data: role } = await ctx.supabaseAdmin
    .from('roles')
    .select('id, name')
    .eq('id', roleId)
    .single()

  await ctx.supabaseAdmin.from('users').insert({
    id: authUser.user.id,
    company_id: ctx.companyId,
    name,
    email,
    role: role?.name || 'custom',
    is_active: true,
  })

  await ctx.supabaseAdmin.from('user_roles').insert({
    user_id: authUser.user.id,
    role_id: roleId,
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const ctx = await getAdminContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { userId, isActive, roleId, password } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
  }

  if (typeof isActive === 'boolean') {
    await ctx.supabaseAdmin
      .from('users')
      .update({ is_active: isActive })
      .eq('id', userId)
  }

  if (roleId) {
    await ctx.supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    await ctx.supabaseAdmin.from('user_roles').insert({
      user_id: userId,
      role_id: roleId,
    })
  }

  if (password) {
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres' }, { status: 400 })
    }
    await ctx.supabaseAdmin.auth.admin.updateUserById(userId, { password })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const ctx = await getAdminContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
  }

  await ctx.supabaseAdmin.auth.admin.deleteUser(userId)
  await ctx.supabaseAdmin.from('users').delete().eq('id', userId)

  return NextResponse.json({ success: true })
}
