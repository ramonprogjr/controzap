import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  const body = await request.json()
  const {
    userId,
    companyName,
    razaoSocial,
    nomeFantasia,
    cnpj,
    companyEmail,
    companyPhone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    municipio,
    uf,
    adminName,
    adminEmail,
    adminPhone,
  } = body || {}

  if (!userId || !companyName || !adminName || !adminEmail) {
    return NextResponse.json(
      { error: 'Dados obrigatórios ausentes' },
      { status: 400 }
    )
  }

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() { },
      },
    }
  )

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (authError || !authUser?.user) {
    return NextResponse.json(
      { error: 'Usuário do Auth não encontrado' },
      { status: 400 }
    )
  }

  const resolvedEmail = authUser.user.email || adminEmail
  const resolvedCompanyName = companyName || nomeFantasia || razaoSocial

  const { data: existingProfile } = await supabaseAdmin
    .from('users')
    .select('id, company_id')
    .eq('id', authUser.user.id)
    .single()

  if (existingProfile?.company_id) {
    return NextResponse.json(
      { error: 'Usuário já cadastrado' },
      { status: 409 }
    )
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: resolvedCompanyName,
      cnpj: cnpj || null,
      phone: companyPhone || adminPhone || null,
      website: null,
      segment: null,
      settings: {
        razao_social: razaoSocial || null,
        nome_fantasia: nomeFantasia || null,
        email: companyEmail || null,
        endereco: {
          cep: cep || null,
          logradouro: logradouro || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          municipio: municipio || null,
          uf: uf || null,
        },
      },
      subscription_status: 'trial',
    })
    .select('id')
    .single()

  if (companyError || !company) {
    return NextResponse.json(
      { error: companyError?.message || 'Erro ao criar empresa' },
      { status: 500 }
    )
  }

  const { error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authUser.user.id,
      company_id: company.id,
      name: adminName,
      email: resolvedEmail,
      phone: adminPhone || null,
      role: 'admin',
      is_active: true,
    })

  if (userError) {
    return NextResponse.json(
      { error: userError.message || 'Erro ao criar usuário' },
      { status: 500 }
    )
  }

  let { data: adminRole } = await supabaseAdmin
    .from('roles')
    .select('id')
    .ilike('name', 'admin')
    .is('company_id', null)
    .single()

  if (!adminRole?.id) {
    const { data: createdRole } = await supabaseAdmin
      .from('roles')
      .insert({
        company_id: null,
        name: 'Admin',
        description: 'Acesso total ao sistema',
        is_system: true,
      })
      .select('id')
      .single()
    adminRole = createdRole || null
  }

  if (adminRole?.id) {
    await supabaseAdmin.from('user_roles').insert({
      user_id: authUser.user.id,
      role_id: adminRole.id,
    })
  }

  return NextResponse.json({
    success: true,
    companyId: company.id,
    userId: authUser.user.id,
  })
}
