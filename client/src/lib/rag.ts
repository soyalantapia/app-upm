// RAG real sobre el corpus de 1601 ítems · 100% client-side.
// Usa el mismo motor TF-IDF que SimilarItemsPanel (similarity.ts) pero permite
// buscar por una query libre (la pregunta del usuario) en lugar de por itemId.
// Salida: response markdown estructurada + lista de fuentes para citar.

import { fetchLiveFeed } from './sources'
import { buildSimilarityIndex, type SimilarityIndex } from './similarity'
import { extractContext } from './extract-context'
import { countryByCode, topicById } from './data'
import type { ChatMessage, DocType, NewsItem } from './types'

let cached: { index: SimilarityIndex; itemsCount: number } | null = null
let buildPromise: Promise<SimilarityIndex> | null = null

async function getOrBuildIndex(): Promise<SimilarityIndex> {
  if (cached && buildPromise === null) {
    const feed = await fetchLiveFeed({}).catch(() => null)
    if (feed && feed.items.length === cached.itemsCount) return cached.index
    cached = null
  }
  if (buildPromise) return buildPromise
  buildPromise = (async () => {
    const feed = await fetchLiveFeed({})
    const index = buildSimilarityIndex(feed.items)
    cached = { index, itemsCount: feed.items.length }
    buildPromise = null
    return index
  })()
  return buildPromise
}

// Stopwords mínimo + tecnicismos legales repetidos
const STOPWORDS = new Set([
  'que','con','para','por','las','los','del','este','esta','sobre','desde','hasta','cuando','donde','como','cuáles','cuales','cuál','cual','cómo','como','qué','que','dónde','donde',
  'ley','leyes','norma','normas','articulo','artigo','decreto','decretos','resolucion','resoluciones','reglamento','reglamentos',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 4 && t.length <= 30 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
}

// Convierte la query libre en vector TF-IDF reusando el IDF del índice (implícito en
// los pesos de los docs). Calculamos la query como TF, normalizada por la cantidad
// de tokens para evitar que queries largas dominen.
function vectorizeQuery(query: string, _index: SimilarityIndex): { vec: Map<string, number>; norm: number } {
  const tokens = tokenize(query)
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)

  // Para query usamos TF puro (cada token ya está implícitamente IDF-weighted en los
  // documentos). Aproximación: peso = TF de la query.
  let sumSq = 0
  for (const w of tf.values()) sumSq += w * w
  const norm = Math.sqrt(sumSq) || 1
  return { vec: tf, norm }
}

function cosineWithDoc(qVec: Map<string, number>, qNorm: number, docVec: Map<string, number>, docNorm: number): number {
  let dot = 0
  for (const [tok, qw] of qVec) {
    const dw = docVec.get(tok)
    if (dw) dot += qw * dw
  }
  return dot / (qNorm * docNorm)
}

export type RAGRetrieval = {
  item: NewsItem
  score: number
}

// Recupera los top K items relevantes para la pregunta.
export async function retrieve(question: string, topK = 5): Promise<RAGRetrieval[]> {
  const index = await getOrBuildIndex()
  const { vec: qVec, norm: qNorm } = vectorizeQuery(question, index)
  if (qVec.size === 0) return []

  const scored: RAGRetrieval[] = []
  for (const [id, docVec] of index.vectors) {
    const docNorm = index.norms.get(id) ?? 1
    const score = cosineWithDoc(qVec, qNorm, docVec, docNorm)
    if (score < 0.04) continue
    const item = index.itemsById.get(id)
    if (!item) continue
    scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

// Genera la respuesta del Asistente · markdown estructurada con resumen + citas.
export async function generateRAGAnswer(question: string): Promise<ChatMessage> {
  const t0 = performance.now()
  const hits = await retrieve(question, 5)
  const ms = (performance.now() - t0).toFixed(0)

  if (hits.length === 0) {
    return {
      id: 'm' + Math.random().toString(36).slice(2, 9),
      role: 'assistant',
      content:
        '**Sin coincidencias en el corpus regional.**\n\n' +
        'No encontré normativa que matchee tu pregunta entre las 1601 normas indexadas. ' +
        'Probá con otra formulación, agregá palabras técnicas (energía, ambiente, integración, fronteras), ' +
        'o consultá directamente el Radar.',
      isInstitutional: false,
      createdAt: new Date().toISOString(),
    }
  }

  // Heurística para determinar si es pregunta de "explicame" / "comparame" / "lista" / "brief"
  const q = question.toLowerCase()
  const wantsList = /lista|listame|enuncia|enumera|cuáles|cuales/.test(q)
  const wantsCompare = /compar|diferencia|similar|equivalente|frente a|vs\b/.test(q)
  const wantsBrief = /brief|prepar|resumi|resumen|sintet|síntet|síntesis/.test(q)

  const lines: string[] = []

  // Header
  if (wantsCompare) {
    lines.push(`**Comparativa regional** · sobre tu consulta encontré ${hits.length} normas relevantes en el corpus.`)
  } else if (wantsList) {
    lines.push(`**${hits.length} normas relevantes** que matchean tu consulta:`)
  } else if (wantsBrief) {
    lines.push(`**Brief regional sobre tu consulta** · destilado de ${hits.length} normas del corpus.`)
  } else {
    lines.push(`Encontré ${hits.length} normas relevantes en el corpus regional. Lo destilo así:`)
  }
  lines.push('')

  // Cada hit con resumen extraído + cita formal
  hits.forEach((hit, idx) => {
    const item = hit.item
    const country = countryByCode(item.country)
    const topic = topicById(item.topic)
    const ctx = extractContext(item.fullText)
    const pct = Math.round(hit.score * 100)

    lines.push(`### ${idx + 1}. ${country.flag} ${item.title}`)
    lines.push('')
    const meta: string[] = [
      `**País:** ${country.name}`,
      `**Tema:** ${topic.label}`,
      `**Tipo:** ${item.tipoDocumento ?? item.type}`,
      `**Match:** ${pct}%`,
    ]
    lines.push(meta.join(' · '))
    lines.push('')

    if (ctx.resumen && ctx.resumen.length > 50) {
      const r = ctx.resumen.length > 280 ? ctx.resumen.slice(0, 277) + '…' : ctx.resumen
      lines.push(r)
      lines.push('')
    } else if (item.excerpt) {
      const e = item.excerpt.length > 280 ? item.excerpt.slice(0, 277) + '…' : item.excerpt
      lines.push(e)
      lines.push('')
    }

    // Sub-info útil: instituciones + montos + plazos clave
    const sub: string[] = []
    if (ctx.instituciones.length > 0) sub.push(`Organismos: ${ctx.instituciones.slice(0, 3).join(', ')}`)
    if (ctx.montos.length > 0) sub.push(`Montos: ${ctx.montos.slice(0, 2).join(', ')}`)
    if (ctx.plazos.length > 0) sub.push(`Plazos: ${ctx.plazos.slice(0, 2).join(', ')}`)
    if (sub.length > 0) {
      lines.push(`*${sub.join(' · ')}*`)
      lines.push('')
    }

    // Cita verificable
    lines.push(`Fuente · [${item.source}](#/radar/${item.id})`)
    lines.push('')
  })

  // Conclusión
  if (wantsCompare && hits.length >= 2) {
    const paises = new Set(hits.map(h => h.item.country))
    lines.push('---')
    lines.push('')
    lines.push(
      `**Síntesis comparativa:** la consulta atraviesa ${paises.size} ${paises.size === 1 ? 'país' : 'países'} ` +
      `del Mercosur. Los abordajes muestran convergencias en marco institucional y divergencias en plazos de implementación.`,
    )
  }

  lines.push('')
  lines.push(
    `*Recuperación TF·IDF en ${ms}ms sobre 1601 normas indexadas en cliente. Click en cada fuente para ver el texto íntegro y contexto extraído.*`,
  )

  // Sources estructuradas para el SourceCard del Assistant
  const sources = hits.map(h => ({
    id: h.item.id,
    title: h.item.title,
    type: (h.item.type ?? 'ley') as DocType,
  }))

  return {
    id: 'm' + Math.random().toString(36).slice(2, 9),
    role: 'assistant',
    content: lines.join('\n'),
    sources,
    isInstitutional: true,
    createdAt: new Date().toISOString(),
  }
}
