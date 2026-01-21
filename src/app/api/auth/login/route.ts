import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let response = NextResponse.next()
  
  try {
    const { email, password } = await request.json()

    // Criar cliente Supabase que salva cookies na resposta
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            // Criar nova resposta para salvar cookies
            response = NextResponse.next()
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Fazer login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Forçar getSession para garantir que os cookies sejam salvos
    const { data: sessionData } = await supabase.auth.getSession()

    // Criar resposta JSON com os dados do usuário
    const jsonResponse = NextResponse.json({ 
      success: true, 
      user: data.user,
      session: sessionData?.session || data.session || null,
      access_token: data.session?.access_token || sessionData?.session?.access_token || null,
    })

    // Copiar cookies da resposta do Supabase para a resposta JSON
    response.cookies.getAll().forEach(cookie => {
      jsonResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path || '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    })

    return jsonResponse
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
