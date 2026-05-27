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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const sellerId = searchParams.get('seller_id')

  let query = ctx.supabaseAdmin
    .from('leads')
    .select(`
      id, name, phone, status, score, first_contact, last_contact, seller_id, instance_id,
      users(name)
    `)
    .eq('company_id', ctx.companyId)
    .order('first_contact', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (sellerId && sellerId !== 'all') {
    if (sellerId === 'none') {
      query = query.is('seller_id', null)
    } else {
      query = query.eq('seller_id', sellerId)
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data || [] })
}

export async function PATCH(request: NextRequest) {
  const ctx = await getContext(request)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { id, name, phone, status, seller_id, score } = body
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const update: any = {}
  if (name !== undefined) update.name = name
  if (phone !== undefined) update.phone = phone
  if (status !== undefined) update.status = status
  if (seller_id !== undefined) update.seller_id = seller_id || null
  if (score !== undefined) update.score = score
  update.updated_at = new Date().toISOString()

  const { error } = await ctx.supabaseAdmin
    .from('leads').update(update).eq('id', id).eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const ctx = await getContext(request)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { error } = await ctx.supabaseAdmin
    .from('leads').delete().eq('id', id).eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
