// Detección de inversión presupuestaria y contrataciones derivadas del fullText.
// Va más allá del extract-context.montos · busca contextos específicos:
//   · "asignación presupuestaria", "partida presupuestaria"
//   · "inversión de USD X millones", "inversión de ARS X"
//   · "contratación de bienes y servicios"
//   · "licitación pública", "licitación privada"
//   · "concurso de precios"

import type { NewsItem } from './types'

export type BudgetReference = {
  type: 'asignacion' | 'inversion' | 'partida' | 'fondo' | 'subsidio' | 'beneficio'
  amount: string
  currency: 'ARS' | 'USD' | 'BRL' | 'UYU' | 'unknown'
  context: string // párrafo donde aparece
}

export type ContractReference = {
  type: 'licitacion-publica' | 'licitacion-privada' | 'contratacion-directa' | 'concurso-precios'
  context: string
  detail?: string
}

export type BudgetReport = {
  budgetRefs: BudgetReference[]
  contractRefs: ContractReference[]
  totalAmountUSD?: number      // estimación de total en USD si todas las refs son convertibles
  hasFiscalImpact: boolean
}

// Patrones para detectar montos en contexto presupuestario
const BUDGET_PATTERNS: { type: BudgetReference['type']; pattern: RegExp }[] = [
  {
    type: 'asignacion',
    pattern: /(?:asignaci[óo]n\s+presupuestar[ií]a|asignaci[óo]n\s+de|fondo|crédito\s+presupuestari[oa])\s+(?:de\s+|por\s+)?([USD$ARS\d.,\s]+(?:millones?|mil)?\s*(?:de\s+pesos|d[óo]lares)?)/gi,
  },
  {
    type: 'inversion',
    pattern: /(?:inversi[óo]n|aporte)\s+(?:de\s+|por\s+)?([USD$ARS\d.,\s]+(?:millones?|mil)?\s*(?:de\s+pesos|d[óo]lares)?)/gi,
  },
  {
    type: 'partida',
    pattern: /(?:partida)\s+(?:presupuestaria\s+)?(?:de\s+|por\s+)?([USD$ARS\d.,\s]+(?:millones?|mil)?\s*(?:de\s+pesos|d[óo]lares)?)/gi,
  },
  {
    type: 'subsidio',
    pattern: /(?:subsidio|transferencia|sumas?)\s+(?:de\s+|por\s+)?([USD$ARS\d.,\s]+(?:millones?|mil)?\s*(?:de\s+pesos|d[óo]lares)?)/gi,
  },
  {
    type: 'beneficio',
    pattern: /(?:beneficio|exenci[óo]n|reducci[óo]n)\s+(?:fiscal|tributari[ao])\s+(?:de\s+|por\s+)?([USD$ARS\d.,\s]+(?:millones?|mil)?\s*(?:de\s+pesos|d[óo]lares)?)/gi,
  },
]

const CONTRACT_PATTERNS: { type: ContractReference['type']; pattern: RegExp }[] = [
  { type: 'licitacion-publica', pattern: /licitaci[óo]n\s+p[úu]blica\s+(?:N[°º]\s*\d+\s*[\/-]\s*\d+)?/gi },
  { type: 'licitacion-privada', pattern: /licitaci[óo]n\s+privada\s+(?:N[°º]\s*\d+\s*[\/-]\s*\d+)?/gi },
  { type: 'contratacion-directa', pattern: /contrataci[óo]n\s+directa\s+(?:N[°º]\s*\d+\s*[\/-]\s*\d+)?/gi },
  { type: 'concurso-precios', pattern: /concurso\s+de\s+precios\s+(?:N[°º]\s*\d+\s*[\/-]\s*\d+)?/gi },
]

function detectCurrency(text: string): BudgetReference['currency'] {
  if (/U\$S|USD|d[óo]lares/.test(text)) return 'USD'
  if (/BRL|R\$|reais/.test(text)) return 'BRL'
  if (/UYU|peso\s+urugua/.test(text)) return 'UYU'
  if (/ARS|pesos|\$/.test(text)) return 'ARS'
  return 'unknown'
}

export function detectBudget(item: NewsItem): BudgetReport {
  const text = item.fullText ?? item.excerpt ?? ''
  if (!text) return { budgetRefs: [], contractRefs: [], hasFiscalImpact: false }

  const budgetRefs: BudgetReference[] = []
  const seenAmounts = new Set<string>()
  for (const { type, pattern } of BUDGET_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null && budgetRefs.length < 8) {
      const amount = m[1].trim().replace(/\s+/g, ' ')
      if (amount.length < 4 || amount.length > 50) continue
      const key = `${type}|${amount}`
      if (seenAmounts.has(key)) continue
      seenAmounts.add(key)
      // Sacar contexto · 60 chars antes y después
      const ctxStart = Math.max(0, m.index - 60)
      const ctxEnd = Math.min(text.length, m.index + m[0].length + 60)
      const context = text.slice(ctxStart, ctxEnd).replace(/\s+/g, ' ').trim()
      budgetRefs.push({ type, amount, currency: detectCurrency(m[0]), context })
    }
  }

  const contractRefs: ContractReference[] = []
  const seenContracts = new Set<string>()
  for (const { type, pattern } of CONTRACT_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null && contractRefs.length < 6) {
      const detail = m[0].trim()
      if (seenContracts.has(detail.toLowerCase())) continue
      seenContracts.add(detail.toLowerCase())
      const ctxStart = Math.max(0, m.index - 60)
      const ctxEnd = Math.min(text.length, m.index + m[0].length + 80)
      const context = text.slice(ctxStart, ctxEnd).replace(/\s+/g, ' ').trim()
      contractRefs.push({ type, detail, context })
    }
  }

  return {
    budgetRefs,
    contractRefs,
    hasFiscalImpact: budgetRefs.length > 0 || contractRefs.length > 0,
  }
}

export const BUDGET_TYPE_META: Record<BudgetReference['type'], { label: string; emoji: string }> = {
  asignacion: { label: 'Asignación', emoji: '💰' },
  inversion: { label: 'Inversión', emoji: '📈' },
  partida: { label: 'Partida', emoji: '📋' },
  fondo: { label: 'Fondo', emoji: '🏦' },
  subsidio: { label: 'Subsidio', emoji: '🤝' },
  beneficio: { label: 'Beneficio fiscal', emoji: '💵' },
}

export const CONTRACT_TYPE_META: Record<ContractReference['type'], { label: string; color: string }> = {
  'licitacion-publica': { label: 'Licitación pública', color: 'bg-success-bg/40 text-success-fg ring-success-bg' },
  'licitacion-privada': { label: 'Licitación privada', color: 'bg-upm-50 text-upm-700 ring-upm-100' },
  'contratacion-directa': { label: 'Contratación directa', color: 'bg-warning-bg/40 text-warning-fg ring-warning-bg' },
  'concurso-precios': { label: 'Concurso de precios', color: 'bg-info-bg/40 text-info-fg ring-info-bg' },
}
