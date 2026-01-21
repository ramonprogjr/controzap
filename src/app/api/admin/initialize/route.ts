import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
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

    try {
        // 1. Criar permissões base
        const basePermissions = [
            { key: 'instances.read', description: 'Listar e visualizar instâncias' },
            { key: 'instances.manage', description: 'Criar, conectar, atualizar e excluir instâncias' },
            { key: 'instances.delete', description: 'Excluir instâncias' },
            { key: 'vendors.manage', description: 'Criar e editar vendedores' },
            { key: 'conversations.read', description: 'Ver conversas' },
            { key: 'conversations.send', description: 'Enviar mensagens pelo painel' },
            { key: 'conversations.delete', description: 'Arquivar ou excluir conversas' },
            { key: 'leads.read', description: 'Ver leads' },
            { key: 'leads.manage', description: 'Atualizar leads' },
            { key: 'leads.delete', description: 'Remover leads do sistema' },
            { key: 'leads.export', description: 'Exportar relatórios de leads' },
            { key: 'billing.read', description: 'Visualizar faturas e plano' },
            { key: 'settings.manage', description: 'Gerenciar configurações' },
        ]

        console.log('[Initialize] Criando permissões...')
        const { data: permissions, error: permError } = await supabase
            .from('permissions')
            .upsert(basePermissions, { onConflict: 'key', ignoreDuplicates: false })
            .select()

        if (permError) {
            console.error('[Initialize] Erro ao criar permissões:', permError)
            return NextResponse.json({ error: permError.message }, { status: 500 })
        }

        console.log('[Initialize] Permissões criadas:', permissions?.length)

        // 2. Criar cargos de sistema (globais, company_id = null)
        const systemRoles = [
            { company_id: null, name: 'Admin', description: 'Acesso total ao sistema', is_system: true },
            { company_id: null, name: 'Supervisor', description: 'Acesso a conversas e leads', is_system: true },
            { company_id: null, name: 'Vendedor', description: 'Acesso apenas a conversas atribuídas', is_system: true },
            { company_id: null, name: 'Leitor', description: 'Somente leitura', is_system: true },
        ]

        console.log('[Initialize] Criando cargos de sistema...')
        for (const role of systemRoles) {
            const { data: existingRole } = await supabase
                .from('roles')
                .select('id')
                .eq('name', role.name)
                .is('company_id', null)
                .single()

            if (!existingRole) {
                await supabase.from('roles').insert(role).select()
            }
        }

        // 3. Atribuir permissões aos cargos
        console.log('[Initialize] Atribuindo permissões aos cargos...')

        // Admin - todas as permissões
        const { data: adminRole } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'Admin')
            .is('company_id', null)
            .single()

        if (adminRole && permissions) {
            const adminPerms = permissions.map(p => ({
                role_id: adminRole.id,
                permission_id: p.id,
            }))
            await supabase.from('role_permissions').upsert(adminPerms, {
                onConflict: 'role_id,permission_id',
                ignoreDuplicates: true
            })
        }

        // Supervisor - conversas e leads
        const { data: supervisorRole } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'Supervisor')
            .is('company_id', null)
            .single()

        if (supervisorRole && permissions) {
            const supervisorPermKeys = ['instances.read', 'conversations.read', 'conversations.send', 'leads.read', 'leads.manage']
            const supervisorPerms = permissions
                .filter(p => supervisorPermKeys.includes(p.key))
                .map(p => ({
                    role_id: supervisorRole.id,
                    permission_id: p.id,
                }))
            await supabase.from('role_permissions').upsert(supervisorPerms, {
                onConflict: 'role_id,permission_id',
                ignoreDuplicates: true
            })
        }

        // Vendedor - apenas conversas
        const { data: vendedorRole } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'Vendedor')
            .is('company_id', null)
            .single()

        if (vendedorRole && permissions) {
            const vendedorPermKeys = ['conversations.read', 'conversations.send']
            const vendedorPerms = permissions
                .filter(p => vendedorPermKeys.includes(p.key))
                .map(p => ({
                    role_id: vendedorRole.id,
                    permission_id: p.id,
                }))
            await supabase.from('role_permissions').upsert(vendedorPerms, {
                onConflict: 'role_id,permission_id',
                ignoreDuplicates: true
            })
        }

        // Leitor - apenas leitura
        const { data: leitorRole } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'Leitor')
            .is('company_id', null)
            .single()

        if (leitorRole && permissions) {
            const leitorPermKeys = ['conversations.read', 'leads.read']
            const leitorPerms = permissions
                .filter(p => leitorPermKeys.includes(p.key))
                .map(p => ({
                    role_id: leitorRole.id,
                    permission_id: p.id,
                }))
            await supabase.from('role_permissions').upsert(leitorPerms, {
                onConflict: 'role_id,permission_id',
                ignoreDuplicates: true
            })
        }

        console.log('[Initialize] ✅ Inicialização completa!')

        return NextResponse.json({
            success: true,
            message: 'Permissões e cargos inicializados com sucesso',
            permissions: permissions?.length || 0
        })

    } catch (error: any) {
        console.error('[Initialize] Erro:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
