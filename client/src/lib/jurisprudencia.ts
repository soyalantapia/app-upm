// Conexión norma↔jurisprudencia · usa datasets pre-procesados de sumarios de
// las cortes supremas del Mercosur (CSJN AR, STF BR, SCJ UY) que mapean cada
// fallo a la(s) ley(es) que interpreta.
//
// Carga los 3 datasets lazy y los fusiona en un único índice ley → fallos.

import type { CountryCode } from './types'

export type CSJNFallo = {
  id: string
  title: string
  fecha: string
  sala: string
  ley: string
  sumario: string
  url: string
  tags: string[]
  country: CountryCode
  tribunal: 'CSJN' | 'STF' | 'SCJ'
}

type FalloDataRaw = Omit<CSJNFallo, 'country' | 'tribunal'>

type FallosData = {
  fuente: string
  url: string
  fetchedAt: string
  items: FalloDataRaw[]
}

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')

const SOURCES: { url: string; country: CountryCode; tribunal: CSJNFallo['tribunal'] }[] = [
  { url: `${PUBLIC_BASE}/data/csjn-ar.json`, country: 'AR', tribunal: 'CSJN' },
  { url: `${PUBLIC_BASE}/data/stf-br.json`, country: 'BR', tribunal: 'STF' },
  { url: `${PUBLIC_BASE}/data/scj-uy.json`, country: 'UY', tribunal: 'SCJ' },
]

let cached: CSJNFallo[] | null = null
let loadPromise: Promise<CSJNFallo[]> | null = null

async function loadAllFallos(): Promise<CSJNFallo[]> {
  if (cached) return cached
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const all: CSJNFallo[] = []
    for (const src of SOURCES) {
      try {
        const res = await fetch(src.url)
        if (!res.ok) continue
        const data = (await res.json()) as FallosData
        for (const raw of data.items) {
          all.push({ ...raw, country: src.country, tribunal: src.tribunal })
        }
      } catch {
        // Si una corte falla, continuamos con las otras
      }
    }
    cached = all
    return all
  })()
  return loadPromise
}

let leyToFallos: Map<string, CSJNFallo[]> | null = null

async function ensureIndex(): Promise<Map<string, CSJNFallo[]>> {
  if (leyToFallos) return leyToFallos
  const all = await loadAllFallos()
  const index = new Map<string, CSJNFallo[]>()
  for (const fallo of all) {
    const num = fallo.ley
    if (!index.has(num)) index.set(num, [])
    index.get(num)!.push(fallo)
  }
  leyToFallos = index
  return index
}

export async function getFallosForLaw(numero: string): Promise<CSJNFallo[]> {
  const index = await ensureIndex()
  return index.get(numero) ?? []
}

export async function getCSJNTotalCount(): Promise<number> {
  const all = await loadAllFallos()
  return all.length
}

export async function getFallosCountByTribunal(): Promise<Record<CSJNFallo['tribunal'], number>> {
  const all = await loadAllFallos()
  const out = { CSJN: 0, STF: 0, SCJ: 0 } as Record<CSJNFallo['tribunal'], number>
  for (const f of all) out[f.tribunal]++
  return out
}
