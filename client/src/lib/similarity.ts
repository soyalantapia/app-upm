// Motor de similaridad cross-país: TF-IDF + coseno sobre los 1601 ítems del feed.
//
// Sin AI, sin nuevas APIs. Vectorización en cliente (~150ms para todo el corpus).
// Resultado: dado un item, encontrar las K normas más parecidas de cualquier país.
// Esto cierra la promesa central de UPM · comparar legislación regional al instante.

import type { NewsItem } from '@/lib/types'

// Stopwords ES + PT + tecnicismos legales que aparecen en TODAS las normas
// (deben ignorarse para que la similaridad capture la sustancia, no la forma).
const STOPWORDS = new Set([
  // ES corto
  'el','la','los','las','un','una','unos','unas','de','del','en','y','o','que','a','al','por','para','con','su','sus','se','es','son','ser','sera','este','esta','estos','estas','ese','esa','no','si','lo','le','les','me','mi','tu','te','nos','como','mas','pero','u','e','i','como','sobre','entre','desde','hasta','cada','sin','ante','bajo','tras','toda','todo','todas','todos','aqui','alli','donde','cuando','quien','cual','cuales','muy','tan','asi','aun','ya','ha','han','hay','fue','fueron','sea','sean','ser','sido','siendo',
  // PT corto
  'da','do','das','dos','nao','para','com','um','uma','uns','umas','os','as','sao','no','na','nas','pela','pelo','sua','seu','suas','seus','isso','isto','aos','pelos','pelas','onde','quando','quem','qual','quais','muito','tao','assim','ainda','ja','foi','foram','seja','sejam','sido','sendo','tem','tinha','tendo','sera','serao','sob','ate','contra','desde',
  // Legal genérico que aparece en todo
  'articulo','artigo','art','articulos','artigos','seccion','capitulo','titulo','parrafo','inciso','apartado','disposicion','disposiciones','disposicao','disposicoes','presente','precedente','siguiente','anteriormente','establecese','disponese','dispoese','sustituyese','derogase','aprobase','apruebase','prorrogase','reglamentase','sanciona','sancionada','sancionadas','sanciono','promulga','promulgada','promulgado','vigente','vigencia','aplicable','aplicacion','articulado','redacted',
  'fecha','dia','mes','ano','año','aaaa','mediante','virtud','efecto','efectos','tenor','marco','presente','presentes','siguientes','correspondiente','correspondientes','respectivo','respectivos','dicha','dicho','dichas','dichos',
  'considerando','considerandos','visto','vistos','resuelve','decreta','decretan','dispone','disponen',
  // Conectores que rompen señal
  'tambien','tambem','solo','solamente','aunque','salvo','excepto','incluso','dentro','fuera','arriba','abajo','antes','despues','luego','siempre','nunca','jamas','quizas','tal','tales','cualquier','cualquiera','algun','alguna','algunos','algunas','ningun','ninguna','ningunos','ningunas',
  // Genéricos vacíos
  'cuyo','cuya','cuyos','cuyas','sino','aun','asi','dado','dados','sera','tales','demas','medio','medios','primer','primero','segundo','tercer','tercero','cuarto','quinto','manera','forma','modo','caso','casos','vez','veces','tipo','tipos','parte','partes','numero','numeros',
  // Normativo de bajo valor
  'ley','leyes','lei','leis','norma','normas','decreto','decretos','resolucion','resolucao','resoluciones','reglamento','reglamentos','codigo','codigos','proyecto','proyectos','projeto','projetos','tratado','tratados','convenio','convenios','convencao','convenios',
])

// Tokenización: lowercase, sin diacríticos, alfanumérico, longitud 4-30.
function tokenize(text: string): string[] {
  if (!text) return []
  const out: string[] = []
  const cleaned = text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
  for (const tok of cleaned.split(/\s+/)) {
    if (tok.length < 4 || tok.length > 30) continue
    if (STOPWORDS.has(tok)) continue
    if (/^\d+$/.test(tok)) continue
    out.push(tok)
  }
  return out
}

type SparseVec = Map<string, number>

export type SimilarityIndex = {
  vectors: Map<string, SparseVec>
  norms: Map<string, number>
  itemsById: Map<string, NewsItem>
  builtAt: number
  size: number
}

// Construye índice TF-IDF de todo el corpus. Costo único, después cada lookup es O(N).
// Pesos por campo: title 4x, keywords 3x, tipoDocumento 2x, fullText 1x.
export function buildSimilarityIndex(items: NewsItem[]): SimilarityIndex {
  const t0 = performance.now()
  const tfPerDoc = new Map<string, Map<string, number>>()
  const df = new Map<string, number>()

  for (const item of items) {
    const tf = new Map<string, number>()
    const add = (text: string | undefined, weight: number) => {
      if (!text) return
      for (const t of tokenize(text)) {
        tf.set(t, (tf.get(t) ?? 0) + weight)
      }
    }
    add(item.title, 4)
    add(item.keywords?.join(' '), 3)
    add(item.tipoDocumento, 2)
    add(item.tipoConteudo, 2)
    add(item.fullText ?? item.excerpt, 1)
    tfPerDoc.set(item.id, tf)
    for (const tok of tf.keys()) df.set(tok, (df.get(tok) ?? 0) + 1)
  }

  // IDF clásico con suavizado
  const N = items.length
  const idf = new Map<string, number>()
  for (const [tok, dfCount] of df) {
    // Filtrar términos que aparecen en > 50% del corpus (ruido) o < 2 docs (no aporta)
    if (dfCount < 2 || dfCount > N * 0.5) continue
    idf.set(tok, Math.log(1 + N / dfCount))
  }

  const vectors = new Map<string, SparseVec>()
  const norms = new Map<string, number>()
  const itemsById = new Map<string, NewsItem>()
  for (const item of items) itemsById.set(item.id, item)

  for (const [id, tf] of tfPerDoc) {
    const v: SparseVec = new Map()
    let sumSq = 0
    for (const [tok, freq] of tf) {
      const w = idf.get(tok)
      if (!w) continue
      const tfidf = freq * w
      v.set(tok, tfidf)
      sumSq += tfidf * tfidf
    }
    vectors.set(id, v)
    norms.set(id, Math.sqrt(sumSq) || 1)
  }

  if (typeof window !== 'undefined' && window.console) {
    const ms = (performance.now() - t0).toFixed(0)
    console.log(`[similarity] indexed ${items.length} items in ${ms}ms · vocab=${idf.size}`)
  }

  return { vectors, norms, itemsById, builtAt: Date.now(), size: items.length }
}

// Cosine similarity entre dos vectores sparse. Itera el más chico para velocidad.
function cosine(v1: SparseVec, n1: number, v2: SparseVec, n2: number): number {
  let dot = 0
  const [small, big] = v1.size <= v2.size ? [v1, v2] : [v2, v1]
  for (const [tok, w] of small) {
    const w2 = big.get(tok)
    if (w2) dot += w * w2
  }
  return dot / (n1 * n2)
}

export type SimilarItem = {
  item: NewsItem
  score: number
}

// Top-K items más similares al dado. Por default favorece cross-país: si hay
// candidatos de otros países con score >= 0.6 * mejor_score, empuja esos primero.
export function findSimilarItems(
  itemId: string,
  index: SimilarityIndex,
  opts: { topK?: number; preferCrossCountry?: boolean } = {},
): SimilarItem[] {
  const topK = opts.topK ?? 6
  const preferCrossCountry = opts.preferCrossCountry ?? true
  const queryVec = index.vectors.get(itemId)
  const queryNorm = index.norms.get(itemId)
  const queryItem = index.itemsById.get(itemId)
  if (!queryVec || !queryNorm || !queryItem) return []

  const all: SimilarItem[] = []
  for (const [id, v] of index.vectors) {
    if (id === itemId) continue
    const n = index.norms.get(id) ?? 1
    const score = cosine(queryVec, queryNorm, v, n)
    if (score < 0.08) continue
    const item = index.itemsById.get(id)
    if (!item) continue
    all.push({ item, score })
  }
  all.sort((a, b) => b.score - a.score)

  if (!preferCrossCountry) return all.slice(0, topK)

  // Ranking cross-país: garantizar al menos 2 países distintos al original en topK.
  const queryCountry = queryItem.country
  const sameCountry = all.filter(s => s.item.country === queryCountry)
  const crossCountry = all.filter(s => s.item.country !== queryCountry)

  // Intercalar dando prioridad al cross-country (al menos 60% del topK)
  const targetCross = Math.ceil(topK * 0.6)
  const result: SimilarItem[] = []
  let i = 0, j = 0
  while (result.length < topK && (i < crossCountry.length || j < sameCountry.length)) {
    // Tomar cross hasta llenar 60% o agotar
    if (i < crossCountry.length && (result.filter(r => r.item.country !== queryCountry).length < targetCross || j >= sameCountry.length)) {
      result.push(crossCountry[i++])
    } else if (j < sameCountry.length) {
      result.push(sameCountry[j++])
    } else {
      break
    }
  }
  // Reordenar el resultado final por score para no mostrar saltos raros
  return result.sort((a, b) => b.score - a.score)
}
