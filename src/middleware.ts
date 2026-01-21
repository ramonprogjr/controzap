import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const allCookies = request.cookies.getAll()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const extractAccessToken = () => {
    const authCookie = allCookies.find(
      (cookie) =>
        cookie.name.endsWith('auth-token') &&
        (cookie.name.startsWith('sb-') || cookie.name.includes('supabase'))
    )
    if (!authCookie?.value) return null

    let rawValue = authCookie.value
    try {
      rawValue = decodeURIComponent(rawValue)
    } catch {
      // Se falhar, usar o valor original
    }

    try {
      const parsed = JSON.parse(rawValue)
      return typeof parsed?.access_token === 'string' ? parsed.access_token : null
    } catch {
      return null
    }
  }


  // IMPORTANTE: O Supabase SSR processa cookies automaticamente ao chamar getSession/getUser
  // Primeiro tentar getUser que valida o token JWT diretamente
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Se getUser falhar, tentar getSession como fallback
  let session = null
  if (userError || !user) {
    const { data: { session: sessionData }, error: sessionError } = await supabase.auth.getSession()
    session = sessionData
    if (sessionError) {
      console.error('[Middleware] Erro ao ler sessão:', sessionError.message)
    }
    // Se temos sessão mas não user, usar user da sessão
    if (!user && session?.user) {
      // user já está null, então vamos usar session.user
    }
  } else {
    // Se temos user, buscar sessão para verificar email_confirmed_at
    const { data: { session: sessionData } } = await supabase.auth.getSession()
    session = sessionData
  }

  // Usar user da sessão se não tivermos user direto
  let finalUser = user || session?.user || null

  // Fallback: tentar extrair o access_token do cookie manualmente
  if (!finalUser) {
    const accessToken = extractAccessToken()
    if (accessToken) {
      const { data: { user: tokenUser } } = await supabase.auth.getUser(accessToken)
      if (tokenUser) {
        finalUser = tokenUser
      }
    }
  }

  // Log para debug apenas em rotas importantes
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname === '/login') {
    console.log('🔷 [Middleware] Path:', request.nextUrl.pathname)
    console.log('🔷 [Middleware] Session:', session ? `✅ Existe - User ID: ${session.user.id}` : '❌ Não existe')
    console.log('🔷 [Middleware] User:', finalUser ? `✅ ID: ${finalUser.id}, Email: ${finalUser.email}` : '❌ Não autenticado')
    if (userError) {
      console.log('🔷 [Middleware] UserError:', userError.message)
    }

    // Listar cookies para debug
    const supabaseCookies = allCookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
    if (supabaseCookies.length > 0) {
      console.log('🔷 [Middleware] Cookies encontrados:', supabaseCookies.length)
      supabaseCookies.forEach(c => {
        console.log(`  - ${c.name}: ${c.value.substring(0, 50)}...`)
      })
    }
  }

  // Proteger rotas do dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!finalUser) {
      console.log('🔴 [Middleware] Acesso negado ao dashboard - redirecionando para login')
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirect_to', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    console.log('[Middleware] ✅ Acesso autorizado ao dashboard')
  }

  // Não redirecionar automaticamente da página de login
  // Deixar o cliente fazer o redirecionamento após login bem-sucedido

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
