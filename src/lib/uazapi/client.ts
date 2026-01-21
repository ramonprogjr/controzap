const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = process.env.UAZAPI_GLOBAL_TOKEN!

export interface UazapiMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: {
    conversation?: string
    extendedTextMessage?: {
      text: string
    }
    audioMessage?: {
      url: string
      mimetype: string
    }
    imageMessage?: {
      url: string
      mimetype: string
    }
    videoMessage?: {
      url: string
      mimetype: string
    }
  }
  messageTimestamp: number
  pushName?: string
}

export interface UazapiInstance {
  instance: string
  token: string
  qrcode?: {
    code: string
    base64: string
  }
  status: 'connected' | 'disconnected' | 'connecting'
}

export class UazapiClient {
  private baseUrl: string
  private globalToken: string

  constructor() {
    this.baseUrl = UAZAPI_BASE_URL
    this.globalToken = UAZAPI_GLOBAL_TOKEN
  }

  async createInstance(instanceName: string): Promise<UazapiInstance> {
    const response = await fetch(`${this.baseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.globalToken,
      },
      body: JSON.stringify({
        instance: instanceName,
        token: `${instanceName}_token_${Date.now()}`,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create instance: ${response.statusText}`)
    }

    return response.json()
  }

  async getQRCode(instanceName: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': this.globalToken,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get QR code: ${response.statusText}`)
    }

    const data = await response.json()
    return data.qrcode?.base64 || ''
  }

  async sendMessage(instanceName: string, to: string, message: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.globalToken,
      },
      body: JSON.stringify({
        number: to,
        text: message,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`)
    }
  }

  async getInstanceStatus(instanceName: string): Promise<UazapiInstance['status']> {
    const response = await fetch(`${this.baseUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': this.globalToken,
      },
    })

    if (!response.ok) {
      return 'disconnected'
    }

    const data = await response.json()
    return data.state === 'open' ? 'connected' : 'disconnected'
  }
}

export const uazapiClient = new UazapiClient()
