import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  // Criar cliente Supabase no servidor para processar a sessão
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorar erros em Server Components
          }
        },
      },
    }
  )

  if (code) {
    // Se houver código, trocar por sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Sucesso - redirecionar para o dashboard
      const response = NextResponse.redirect(new URL(next, request.url))
      return response
    }
  } else {
    // Se não houver código, verificar se já existe uma sessão válida
    // Isso acontece quando redirecionamos após login bem-sucedido
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Callback] Erro ao ler sessão:', sessionError.message)
    }
    
    if (session) {
      // Já tem sessão válida, redirecionar
      const response = NextResponse.redirect(new URL(next, request.url))
      return response
    }
  }

  // Se houver erro ou não houver sessão, redirecionar para login
  return NextResponse.redirect(new URL('/login', request.url))
}
