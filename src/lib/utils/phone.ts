/** Normaliza telefone WhatsApp BR para apenas dígitos com código 55 */
export function normalizePhone(input: string): string {
  const digits = String(input || '').replace(/\D/g, '')
  if (!digits) return ''

  if (digits.length >= 12 && digits.startsWith('55')) {
    return digits
  }

  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`
  }

  return digits
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a)
  const nb = normalizePhone(b)
  if (!na || !nb) return false
  if (na === nb) return true
  // 5511999999999 vs 11999999999
  if (na.endsWith(nb) || nb.endsWith(na)) return true
  return false
}
