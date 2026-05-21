// Conexión norma↔persona · directorio de legisladores (diputados AR + BR + UY).
//
// Estado del arte: no hay un endpoint público con CORS abierto para HCDN AR
// que devuelva la lista completa de diputados. Como atajo pragmático para el
// demo, embebemos un dataset curado con los autores que firman las leyes que
// más figuran en nuestro corpus + foto + partido + provincia.
//
// El dataset vive en public/data/legisladores.json y se carga lazy una vez por sesión.

import type { CountryCode } from './types'
import { fetchDiputadosBR } from './sources/diputados-br'

export type Legislador = {
  id: string
  name: string
  country: CountryCode
  camara: 'Diputados' | 'Senadores' | 'Câmara' | 'Senado Federal' | 'Cámara de Representantes'
  partido: string
  bloque?: string
  provincia: string
  foto?: string
  bio?: string
  // IDs de leyes que firma como autor principal o co-autor
  leyesAutor?: string[]
}

type LegisladoresData = {
  fuente: string
  fetchedAt: string
  items: Legislador[]
}

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/legisladores.json`

let cached: LegisladoresData | null = null
let loadPromise: Promise<LegisladoresData | null> | null = null

async function loadAll(): Promise<LegisladoresData | null> {
  if (cached) return cached
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      // Cargar dataset estático
      const res = await fetch(DATA_URL)
      const staticData = res.ok ? ((await res.json()) as LegisladoresData) : null
      const items = staticData?.items ? [...staticData.items] : []

      // Fusionar con diputados BR en vivo (CORS abierto)
      try {
        const brDiputados = await fetchDiputadosBR({ limit: 600 })
        for (const d of brDiputados) {
          // Evitar duplicados si ya existe alguien con el mismo nombre en el JSON
          if (items.some(i => i.name === d.name)) continue
          items.push({
            id: d.id,
            name: d.name,
            country: 'BR',
            camara: 'Câmara',
            partido: d.partido,
            provincia: d.uf,
            foto: d.foto,
            bio: undefined,
          })
        }
      } catch {
        // Si falla el fetch BR, seguimos con el estático
      }

      cached = {
        fuente: staticData?.fuente ?? 'Datos abiertos · Cámara de Diputados AR + Senado AR + Câmara BR live',
        fetchedAt: new Date().toISOString(),
        items,
      }
      return cached
    } catch {
      return null
    } finally {
      loadPromise = null
    }
  })()
  return loadPromise
}

export async function getLegislador(id: string): Promise<Legislador | null> {
  const data = await loadAll()
  return data?.items.find(l => l.id === id) ?? null
}

export async function getAllLegisladores(): Promise<Legislador[]> {
  const data = await loadAll()
  return data?.items ?? []
}

// Match heurístico de un string de autoría a uno de nuestros legisladores conocidos.
// Ejemplo: "DIPUTADOS PEREZ MIGUEL, GARCIA ANA" → busca "PEREZ MIGUEL" y "GARCIA ANA".
export async function matchAuthors(authorsString: string | undefined): Promise<Legislador[]> {
  if (!authorsString) return []
  const data = await loadAll()
  if (!data) return []
  const matches: Legislador[] = []
  const haystack = authorsString.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const l of data.items) {
    const needle = l.name.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (haystack.includes(needle)) matches.push(l)
  }
  return matches
}

// Inversa: dado un legislador, devolver sus leyes autoradas/firmadas.
export async function getLeyesByLegislador(legisladorId: string): Promise<string[]> {
  const data = await loadAll()
  const l = data?.items.find(x => x.id === legisladorId)
  return l?.leyesAutor ?? []
}
