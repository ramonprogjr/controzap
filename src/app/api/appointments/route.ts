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
  const month = searchParams.get('month') // formato: 2026-05

  let query = ctx.supabaseAdmin
    .from('appointments')
    .select(`
      id, detected_date, detected_time, location, status, ai_confidence, notes,
      lead_id, seller_id,
      leads(name, phone),
      users(name)
    `)
    .eq('company_id', ctx.companyId)
    .order('detected_date', { ascending: true })
    .order('detected_time', { ascending: true })

  if (month) {
    const [year, m] = month.split('-')
    const start = `${year}-${m}-01`
    const lastDay = new Date(parseInt(year), parseInt(m), 0).getDate()
    const end = `${year}-${m}-${lastDay}`
    query = query.gte('detected_date', start).lte('detected_date', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ appointments: data || [] })
}

export async function POST(request: NextRequest) {
  const ctx = await getContext(request)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { clientName, clientPhone, detected_date, detected_time, location, notes, seller_id } = body

  if (!clientName || !detected_date) {
    return NextResponse.json({ error: 'Nome do cliente e data são obrigatórios' }, { status: 400 })
  }

  // Criar ou buscar lead
  let leadId: string
  const { data: existingLead } = await ctx.supabaseAdmin
    .from('leads').select('id').eq('phone', clientPhone || '').eq('company_id', ctx.companyId).single()

  if (existingLead) {
    leadId = existingLead.id
  } else {
    const { data: newLead, error: leadError } = await ctx.supabaseAdmin
      .from('leads').insert({
        company_id: ctx.companyId,
        name: clientName,
        phone: clientPhone || '',
        status: 'contacted',
        first_contact: new Date().toISOString(),
      }).select('id').single()
    if (leadError || !newLead) return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
    leadId = newLead.id
  }

  const { data, error } = await ctx.supabaseAdmin
    .from('appointments')
    .insert({
      company_id: ctx.companyId,
      lead_id: leadId,
      seller_id: seller_id || ctx.userId,
      detected_date,
      detected_time: detected_time || null,
      location: location || null,
      notes: notes || null,
      status: 'pending',
      ai_confidence: 1.0,
    })
    .select(`id, detected_date, detected_time, location, status, notes, leads(name, phone), users(name)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, appointment: data })
}

export async function PATCH(request: NextRequest) {
  const ctx = await getContext(request)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 })

  const { error } = await ctx.supabaseAdmin
    .from('appointments').update({ status }).eq('id', id).eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const ctx = await getContext(request)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { error } = await ctx.supabaseAdmin
    .from('appointments').delete().eq('id', id).eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
