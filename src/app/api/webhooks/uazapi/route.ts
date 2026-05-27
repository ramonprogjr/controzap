import { NextRequest, NextResponse } from 'next/server'

/**
 * Webhook descontinuado — mensagens WhatsApp devem usar a Edge Function Supabase.
 * URL correta: {NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-webhook
 */
export async function POST(_request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return NextResponse.json(
    {
      error: 'Endpoint descontinuado. Configure o webhook da UAZAPI na Edge Function do Supabase.',
      webhook_url: `${supabaseUrl}/functions/v1/process-webhook`,
    },
    { status: 410 }
  )
}

export async function GET() {
  return NextResponse.json({ status: 'ok', deprecated: true })
}
