const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY!
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

export interface MessageIntent {
  intent: 'greeting' | 'appointment' | 'question' | 'complaint' | 'other'
  confidence: number
  extractedData?: {
    date?: string
    time?: string
    location?: string
  }
}

export interface SpinTaxResult {
  variations: string[]
}

export interface CompanyContext {
  name?: string | null
  segment?: string | null
  city?: string | null
  description?: string | null
}

const DEFAULT_CONTEXT: Required<CompanyContext> = {
  name: 'a empresa',
  segment: 'atendimento via WhatsApp',
  city: '',
  description: '',
}

function buildIdentity(ctx?: CompanyContext) {
  const c = { ...DEFAULT_CONTEXT, ...(ctx || {}) }
  const cityPart = c.city ? `, em ${c.city}` : ''
  const segmentPart = c.segment ? `do segmento de ${c.segment}` : ''
  const descPart = c.description ? ` ${c.description}` : ''
  return `Você é um assistente da empresa ${c.name}${cityPart} ${segmentPart}.${descPart}`.trim()
}

export class MistralClient {
  private apiKey: string

  constructor() {
    this.apiKey = MISTRAL_API_KEY
  }

  async analyzeIntent(message: string, ctx?: CompanyContext): Promise<MessageIntent> {
    const identity = buildIdentity(ctx)
    const prompt = `${identity}
Analise a mensagem de WhatsApp abaixo e identifique a intenção do cliente. Responda APENAS com JSON válido no formato:
{
  "intent": "greeting" | "appointment" | "question" | "complaint" | "other",
  "confidence": 0.0-1.0,
  "extractedData": {
    "date": "YYYY-MM-DD" se mencionar data,
    "time": "HH:MM" se mencionar horário,
    "location": "texto" se mencionar local
  }
}

Considere "greeting" para: olá, oi, bom dia, boa tarde, boa noite.
Considere "appointment" para: pedido de agendamento, reserva, orçamento com data definida, confirmação.
Considere "question" para: dúvidas sobre preços, disponibilidade, produtos, serviços, documentos.
Considere "complaint" para: reclamações, insatisfação, problemas reportados.

Mensagem: "${message}"`

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || '{}'

    try {
      return JSON.parse(content)
    } catch {
      return {
        intent: 'other',
        confidence: 0.5,
      }
    }
  }

  async generateSpinTax(originalMessage: string, count: number = 5): Promise<SpinTaxResult> {
    const prompt = `Gere ${count} variações da seguinte mensagem para evitar bloqueio de spam. Mantenha o mesmo significado e tom profissional. Responda APENAS com JSON válido:
{
  "variations": ["variação 1", "variação 2", ...]
}

Mensagem original: "${originalMessage}"`

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || '{"variations": []}'

    try {
      return JSON.parse(content)
    } catch {
      return { variations: [originalMessage] }
    }
  }

  async generateGreetingResponse(leadName?: string, ctx?: CompanyContext): Promise<string> {
    const identity = buildIdentity(ctx)
    const prompt = `${identity}
Gere uma mensagem de boas-vindas profissional e acolhedora para WhatsApp. Seja breve (máximo 2 frases) e mencione que estão prontos para ajudar. ${leadName ? `O nome do cliente é ${leadName}.` : ''}`

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      }),
    })

    if (!response.ok) {
      return 'Olá! Obrigado pelo contato. Como posso ajudar?'
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'Olá! Obrigado pelo contato. Como posso ajudar?'
  }
}

export const mistralClient = new MistralClient()

export function extractCompanyContext(company: any): CompanyContext {
  const settings = company?.settings || {}
  const endereco = settings?.endereco || {}
  return {
    name: company?.name || settings?.nome_fantasia || settings?.razao_social || null,
    segment: company?.segment || settings?.segment || null,
    city: endereco?.municipio || settings?.city || null,
    description: settings?.ai_description || null,
  }
}
