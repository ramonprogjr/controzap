import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

async function getContext(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  let user = null
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  if (cookieUser) user = cookieUser

  if (!user) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user: tokenUser } } = await supabase.auth.getUser(authHeader.substring(7))
      if (tokenUser) user = tokenUser
    }
  }

  if (!user) return null

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: userData } = await supabaseAdmin
    .from('users').select('company_id, role').eq('id', user.id).single()

  if (!userData?.company_id) return null
  return { supabaseAdmin, companyId: userData.company_id, userId: user.id, role: userData.role }
}

export async function GET(request: NextRequest) {
  const ctx = await getContext(request)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await ctx.supabaseAdmin
    .from('sellers')
    .select('*')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sellers: data || [] })
}

export async function POST(request: NextRequest) {
  const ctx = await getContext(request)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { name, email, phone, status } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const { data, error } = await ctx.supabaseAdmin
    .from('sellers')
    .insert({
      company_id: ctx.companyId,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      status: status === 'inactive' ? 'inactive' : 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, seller: data })
}

export async function PATCH(request: NextRequest) {
  const ctx = await getContext(request)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, name, email, phone, status } = await request.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const update: any = { updated_at: new Date().toISOString() }
  if (name !== undefined) update.name = name
  if (email !== undefined) update.email = email || null
  if (phone !== undefined) update.phone = phone || null
  if (status !== undefined) update.status = status

  const { error } = await ctx.supabaseAdmin
    .from('sellers').update(update).eq('id', id).eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const ctx = await getContext(request)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { error } = await ctx.supabaseAdmin
    .from('sellers').delete().eq('id', id).eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
