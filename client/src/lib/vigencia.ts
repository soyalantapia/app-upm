// Índice de Vigencia + Salud Normativa
//
// Para cada Ley nacional, computa un score que la clasifica como:
// - 'activa'    → modificada en últimos 12 meses + tiene citas + complejidad media/alta
// - 'latente'   → vigente pero sin movimiento reciente y poco citada
// - 'en-revision' → hay proyecto modificatorio/derogatorio en trámite que la menciona
// - 'derogada'  → explícitamente derogada por norma posterior
//
// Esto convierte la lista plana de 730 leyes en un mapa de "qué está vivo
// vs qué está en el museo". Filtro por vigencia es inmediatamente útil.

import type { NewsItem } from './types'
import type { CitationGraph } from './citations'
import { extractLawNumberFromId } from './citations'

export type VigenciaStatus = 'activa' | 'latente' | 'en-revision' | 'derogada'

export type VigenciaInfo = {
  status: VigenciaStatus
  score: number
  reasons: string[]
}

// Detección de derogatoria: si alguna norma reciente menciona derogar/derogada/sustituye
// + el número de esta ley, está derogada.
function isDerogada(law: NewsItem, citingItems: NewsItem[]): boolean {
  const num = extractLawNumberFromId(law.id)
  if (!num) return false
  const derogaRe = new RegExp(
    `(?:derog|deróguese|deroguese|sustitúy|sustituy|abrog).{0,80}\\bley\\s*(?:n[°º\\.]?)?\\s*${num.replace(/(\d{2})(\d{3})/, '$1\\.?$2')}\\b`,
    'i',
  )
  return citingItems.some(it => derogaRe.test((it.fullText ?? '') + ' ' + (it.title ?? '')))
}

// Detección de en-revisión: si hay un proyecto modificatorio (PL/PEC/PLP/Carpeta)
// con título que menciona esta ley + palabra modificación/sustitución/reforma.
function isEnRevision(law: NewsItem, citingItems: NewsItem[]): boolean {
  const num = extractLawNumberFromId(law.id)
  if (!num) return false
  // Filtrar a items que son proyectos en trámite (no leyes sancionadas)
  const proyectos = citingItems.filter(it => {
    const status = (it.status ?? '').toLowerCase()
    const type = it.type ?? ''
    if (status.includes('sancion') || status.includes('promulgad') || status.includes('vigente')) return false
    if (type === 'ley') return false // ya es ley
    // Proyectos de ley o carpetas en trámite
    return /proyect|carpeta|modificacion|modifica|sustituye|reforma|deroga/i.test(it.title ?? '') ||
      /proyect|carpeta/i.test(it.tipoDocumento ?? '')
  })
  if (proyectos.length === 0) return false
  const modRe = new RegExp(
    `(?:modific|sustituy|reform|deroga).{0,60}\\bley\\s*(?:n[°º\\.]?)?\\s*${num.replace(/(\d{2})(\d{3})/, '$1\\.?$2')}\\b`,
    'i',
  )
  return proyectos.some(it => modRe.test((it.title ?? '') + ' ' + (it.fullText ?? '').slice(0, 1000)))
}

export function computeVigencia(law: NewsItem, graph: CitationGraph): VigenciaInfo {
  const num = extractLawNumberFromId(law.id)
  const backlinks = num ? graph.backlinks.get(num) ?? [] : []
  const citingItems = backlinks.map(b => b.item)
  const reasons: string[] = []

  // 1. Derogada (overrides everything)
  if (isDerogada(law, citingItems)) {
    reasons.push('Derogada por norma posterior')
    return { status: 'derogada', score: 0, reasons }
  }

  // 2. En revisión
  if (isEnRevision(law, citingItems)) {
    reasons.push('Proyecto modificatorio/derogatorio en trámite')
    return { status: 'en-revision', score: 50, reasons }
  }

  // 3. Score numérico para activa vs latente
  let score = 0

  // Citaciones recientes (último año)
  const now = Date.now()
  const yearAgo = now - 365 * 24 * 60 * 60 * 1000
  const recentCites = citingItems.filter(it => {
    const d = new Date(it.date ?? '').getTime()
    return !Number.isNaN(d) && d >= yearAgo
  })
  if (recentCites.length >= 3) {
    score += 40
    reasons.push(`Citada por ${recentCites.length} normas en el último año`)
  } else if (recentCites.length >= 1) {
    score += 20
    reasons.push(`Citada por ${recentCites.length} ${recentCites.length === 1 ? 'norma' : 'normas'} reciente${recentCites.length === 1 ? '' : 's'}`)
  }

  // Total de citas
  if (citingItems.length >= 10) {
    score += 20
    reasons.push(`Alto impacto: ${citingItems.length} normas la citan`)
  } else if (citingItems.length >= 3) {
    score += 10
  }

  // Decretos reglamentarios (items que la citan Y son decretos)
  const decretosRegl = citingItems.filter(it => it.type === 'decreto')
  if (decretosRegl.length >= 2) {
    score += 20
    reasons.push(`${decretosRegl.length} decretos reglamentarios`)
  } else if (decretosRegl.length >= 1) {
    score += 10
    reasons.push('Tiene decreto reglamentario')
  }

  // Resoluciones que la implementan
  const resolImpl = citingItems.filter(it => /resoluci|resol/i.test(it.tipoDocumento ?? ''))
  if (resolImpl.length >= 3) {
    score += 10
    reasons.push(`${resolImpl.length} resoluciones la implementan`)
  }

  if (score >= 40) {
    return { status: 'activa', score, reasons }
  }
  if (score === 0) {
    reasons.push('Sin movimiento reciente en el corpus')
  }
  return { status: 'latente', score, reasons }
}

export const VIGENCIA_META: Record<VigenciaStatus, { label: string; tone: string; emoji: string }> = {
  activa: { label: 'Activa', tone: 'success', emoji: '🟢' },
  latente: { label: 'Latente', tone: 'warning', emoji: '🟡' },
  'en-revision': { label: 'En revisión', tone: 'info', emoji: '🟠' },
  derogada: { label: 'Derogada', tone: 'danger', emoji: '⚫' },
}
