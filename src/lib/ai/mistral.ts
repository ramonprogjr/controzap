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

export class MistralClient {
  private apiKey: string

  constructor() {
    this.apiKey = MISTRAL_API_KEY
  }

  async analyzeIntent(message: string): Promise<MessageIntent> {
    const prompt = `Analise a seguinte mensagem de WhatsApp e identifique a intenção do cliente. Responda APENAS com JSON válido no formato:
{
  "intent": "greeting" | "appointment" | "question" | "complaint" | "other",
  "confidence": 0.0-1.0,
  "extractedData": {
    "date": "YYYY-MM-DD" se mencionar data,
    "time": "HH:MM" se mencionar horário,
    "location": "texto" se mencionar local
  }
}

Mensagem: "${message}"`

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
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
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
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

  async generateGreetingResponse(leadName?: string): Promise<string> {
    const prompt = `Gere uma mensagem de boas-vindas profissional e amigável para WhatsApp comercial. Seja breve (máximo 2 frases). ${leadName ? `O nome do cliente é ${leadName}.` : ''}`

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
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
