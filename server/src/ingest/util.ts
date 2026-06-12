import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// fetch con timeout propio (15s default) — server-side, sin proxies CORS.
export async function fetchJson<T>(url: string, opts?: { timeoutMs?: number; headers?: Record<string, string> }): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(opts?.timeoutMs ?? 15_000),
    headers: { Accept: 'application/json', 'User-Agent': 'upm-api/1.0 (+https://soyalantapia.github.io/app-upm/)', ...opts?.headers },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return (await res.json()) as T
}

// Loader de los JSON estáticos curados (client/public/data/<id>.json).
// 1) Filesystem local (dev / monorepo): ../../client/public/data
// 2) Fallback: STATIC_DATA_BASE (GH Pages) — para Railway, donde client/ no existe.
const HERE = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_DATA_DIRS = [
  path.resolve(HERE, '../../../client/public/data'), // desde dist/ingest o src/ingest
  path.resolve(HERE, '../../../../client/public/data'),
]

export async function loadStaticJson<T>(id: string, staticBase: string): Promise<T> {
  for (const dir of LOCAL_DATA_DIRS) {
    try {
      const raw = await readFile(path.join(dir, `${id}.json`), 'utf8')
      return JSON.parse(raw) as T
    } catch {
      // siguiente candidato
    }
  }
  return fetchJson<T>(`${staticBase.replace(/\/$/, '')}/${id}.json`)
}

export function truncateExcerpt(s: string, max = 600): string {
  const t = (s ?? '').trim()
  return t.length > max ? t.slice(0, max - 3) + '…' : t
}
