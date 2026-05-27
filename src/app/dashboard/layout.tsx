import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { DashboardMain } from '@/components/dashboard/DashboardMain'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) {
    console.error('[Dashboard Layout] ❌ Erro ao buscar usuário:', error.message)
  }

  if (!user) {
    redirect('/login')
  }

  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('is_active, company_id')
    .eq('id', user.id)
    .single()

  if (userDataError || !userData) {
    redirect('/login?error=profile_not_found')
  }

  if (userData.is_active === false) {
    redirect('/login?error=inactive')
  }

  console.log('[Dashboard Layout] ✅ Usuário autenticado:', user.email, 'ID:', user.id)

  return (
    <div className="min-h-screen bg-[var(--background)] flex transition-colors duration-500 overflow-x-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-500/5 pointer-events-none" />
      <Sidebar />
      <DashboardMain>
        {children}
      </DashboardMain>
    </div>
  )
}
