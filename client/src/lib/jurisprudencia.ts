// Conexión norma↔jurisprudencia · usa un dataset pre-procesado de sumarios de
// la Corte Suprema de Justicia de la Nación (Argentina) que mapean cada fallo
// a la(s) ley(es) que interpretan.
//
// Una vez cargado el dataset (lazy fetch), exponemos lookups por número de ley.

export type CSJNFallo = {
  id: string
  title: string
  fecha: string
  sala: string
  ley: string                  // número de ley citada
  sumario: string
  url: string
  tags: string[]
}

type CSJNData = {
  fuente: string
  url: string
  fetchedAt: string
  items: CSJNFallo[]
}

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/csjn-ar.json`

let cached: CSJNData | null = null
let loadPromise: Promise<CSJNData | null> | null = null

async function loadCSJN(): Promise<CSJNData | null> {
  if (cached) return cached
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      const res = await fetch(DATA_URL)
      if (!res.ok) return null
      const json = (await res.json()) as CSJNData
      cached = json
      return json
    } catch {
      return null
    } finally {
      loadPromise = null
    }
  })()
  return loadPromise
}

// Backlinks: dado un número de ley, lista de fallos CSJN que la mencionan.
let leyToFallos: Map<string, CSJNFallo[]> | null = null

async function ensureIndex(): Promise<Map<string, CSJNFallo[]>> {
  if (leyToFallos) return leyToFallos
  const data = await loadCSJN()
  const index = new Map<string, CSJNFallo[]>()
  if (data) {
    for (const fallo of data.items) {
      const num = fallo.ley
      if (!index.has(num)) index.set(num, [])
      index.get(num)!.push(fallo)
    }
  }
  leyToFallos = index
  return index
}

export async function getFallosForLaw(numero: string): Promise<CSJNFallo[]> {
  const index = await ensureIndex()
  return index.get(numero) ?? []
}

// Total de fallos en el corpus
export async function getCSJNTotalCount(): Promise<number> {
  const data = await loadCSJN()
  return data?.items.length ?? 0
}
