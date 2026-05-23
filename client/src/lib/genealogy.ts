// Genealogía artículo-por-artículo.
//
// Una norma típicamente declara: "Sustitúyese el artículo 12 de la Ley N° 24.076
// por el siguiente: ..." o "Incorpórase como artículo 5° bis de la Ley 19.587 ...".
// Este módulo extrae ESAS modificaciones específicas a nivel artículo para que
// podamos mostrar:
//   • "Esta ley modifica los artículos X, Y, Z de la Ley A" (outbound)
//   • "Los artículos 5, 12, 19 de esta ley fueron modificados por ..." (inbound)

import type { NewsItem } from './types'

export type ArticleModification = {
  accion: 'sustituye' | 'incorpora' | 'deroga' | 'modifica'
  articuloDestino: string      // ej "12", "5° bis"
  leyDestino: string            // número limpio: "24076"
  // Si la norma origen también explicita su propio artículo, lo capturamos
  articuloOrigen?: string
}

const VERBOS = {
  sustituye: /(?:sustit[úu]y[ae]se|sustit[úu]ye|sustit[úu]y[ae]nse|reempl[áa]z[ae]se|reempl[áa]za)/i,
  incorpora: /(?:incorp[óo]r[ae]se|incorp[óo]r[ae]nse|agr[ée]g[ae]se|añ[áa]d[ae]se|agreg[áa]se|aggreg[áa]se)/i,
  deroga: /(?:der[óo]g[au]ese|der[óo]ga|abr[óo]g[au]ese|abr[óo]ga|d[eé]j[ae]se\s+sin\s+efecto)/i,
  modifica: /(?:modif[íi]c[au]ese|modif[íi]ca)/i,
} as const

// Pattern: VERBO ... ART. NUMERO ... ley NUMERO
const ART_RE = /(?:art[íi]culo|art\.?)\s+(\d{1,4}(?:\s*[°º]\s*)?(?:\s*(?:bis|ter|quater|quinquies))?)/i
const LEY_RE = /ley(?:\s+nacional)?\s*(?:n[°º\.]?)?\s*(\d{1,2}[\.\s]?\d{3,4})/i

const MODS_CACHE = new Map<string, ArticleModification[]>()
const MAX_MODS_CACHE = 3000

export function extractArticleModifications(item: NewsItem): ArticleModification[] {
  const cached = MODS_CACHE.get(item.id)
  if (cached) return cached

  const text = item.fullText ?? item.excerpt ?? ''
  if (!text) return []

  const out: ArticleModification[] = []
  // Sliding window: encontrar cada verbo y mirar hasta 200 chars adelante por artículo + ley
  for (const [accionKey, verboRe] of Object.entries(VERBOS) as [keyof typeof VERBOS, RegExp][]) {
    const reGlobal = new RegExp(verboRe.source, 'gi')
    let m: RegExpExecArray | null
    while ((m = reGlobal.exec(text)) !== null) {
      // Mirar los siguientes ~250 chars después del verbo
      const window = text.slice(m.index, m.index + 250)
      const artMatch = window.match(ART_RE)
      const leyMatch = window.match(LEY_RE)
      if (!artMatch || !leyMatch) continue
      const articuloDestino = artMatch[1].replace(/\s+/g, ' ').trim().replace(/\s*([°º])\s*/g, '$1 ').trim()
      const leyDestino = leyMatch[1].replace(/[\.\s]/g, '')
      if (leyDestino.length < 4 || leyDestino.length > 5) continue
      out.push({
        accion: accionKey,
        articuloDestino,
        leyDestino,
      })
      if (out.length >= 30) return out // safety cap
    }
  }
  const result = dedupeModifications(out)
  if (MODS_CACHE.size >= MAX_MODS_CACHE) {
    const keys = Array.from(MODS_CACHE.keys()).slice(0, Math.floor(MAX_MODS_CACHE * 0.3))
    for (const k of keys) MODS_CACHE.delete(k)
  }
  MODS_CACHE.set(item.id, result)
  return result
}

function dedupeModifications(arr: ArticleModification[]): ArticleModification[] {
  const seen = new Set<string>()
  const out: ArticleModification[] = []
  for (const m of arr) {
    const key = `${m.accion}|${m.leyDestino}|${m.articuloDestino}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(m)
  }
  return out
}

// Construir el grafo invertido: para cada (ley, artículo) sabemos qué normas lo
// modificaron. Útil para mostrar "artículos modificados" en la página de una ley.
export type ArticleBacklink = {
  modifier: NewsItem
  mod: ArticleModification
}

export function buildArticleBacklinkIndex(items: NewsItem[]): Map<string, ArticleBacklink[]> {
  const index = new Map<string, ArticleBacklink[]>()
  for (const item of items) {
    const mods = extractArticleModifications(item)
    for (const mod of mods) {
      const key = `${mod.leyDestino}|${mod.articuloDestino}`
      if (!index.has(key)) index.set(key, [])
      index.get(key)!.push({ modifier: item, mod })
    }
  }
  return index
}

// Helper: dado el ID de una ley, obtener todas las modificaciones que recibió,
// agrupadas por artículo destino.
export function getInboundArticleMods(
  lawId: string,
  index: Map<string, ArticleBacklink[]>,
): Map<string, ArticleBacklink[]> {
  const num = lawId.match(/^(?:ar|uy)-ley-(\d{4,5})$/)?.[1]
  if (!num) return new Map()
  const result = new Map<string, ArticleBacklink[]>()
  for (const [key, backlinks] of index) {
    const [leyNum, art] = key.split('|')
    if (leyNum === num) result.set(art, backlinks)
  }
  return result
}
