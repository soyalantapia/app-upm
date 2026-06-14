// sync · Adaptador de persistencia para el store.
//
// Hoy: localStorage (default).
// Mañana: cuando exista backend, intercambiar la implementación con
// setSyncAdapter(restAdapter) sin tocar consumers.
//
// El store usa estos 3 hooks:
//   - read(key) → JSON value | null
//   - write(key, value) → void
//   - clear(key) → void
//
// Esta abstracción permite:
//   - Mantener persistencia offline (localStorage)
//   - Agregar sync con backend cuando exista
//   - Cambiar storage (IndexedDB, sessionStorage) sin migration
//   - Mockear en tests

export type SyncAdapter = {
  read: (key: string) => unknown
  write: (key: string, value: unknown) => void
  clear: (key: string) => void
  /** Adapter name para debug */
  name: string
}

// === Default: localStorage ===
export const localStorageAdapter: SyncAdapter = {
  name: 'localStorage',
  read(key) {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  write(key, value) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // QuotaExceeded · ignorar; en el futuro podría reportar a telemetry
    }
  },
  clear(key) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch { /* ignore */ }
  },
}

// === In-memory (para tests) ===
export function createMemoryAdapter(): SyncAdapter {
  const data = new Map<string, unknown>()
  return {
    name: 'memory',
    read: (key) => data.get(key) ?? null,
    write: (key, value) => { data.set(key, value) },
    clear: (key) => { data.delete(key) },
  }
}

// === Backend REST (upm-api · /me/*) ===
// Write-through: localStorage SIEMPRE (fuente de verdad offline) + push
// debounced al backend con JWT demo. Cualquier fallo de red es silencioso:
// la app funciona idéntica sin backend (modo demo intacto).
//
// Mapeo de keys → endpoints:
//   upm.app.state  → PUT /me/prefs (subdoc prefs) + PUT /me/saved ({saved, folders})
//   upm.notes.v1   → PUT /me/notes ({notes: <array>})

const TOKEN_KEY = 'upm.sync.token.v1'

export function createRestAdapter(baseUrl: string): SyncAdapter {
  const base = baseUrl.replace(/\/$/, '')
  let token: string | null = null
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  async function ensureToken(): Promise<string | null> {
    if (token) return token
    const cached = localStorageAdapter.read(TOKEN_KEY)
    if (typeof cached === 'string' && cached) {
      token = cached
      return token
    }
    // El login demo del backend acepta cualquier email → usar el del operator local.
    const operator = localStorageAdapter.read('upm.app.operator') as { email?: string } | null
    if (!operator?.email) return null
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: operator.email }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) return null
      const json = (await res.json()) as { token?: string }
      if (!json.token) return null
      token = json.token
      localStorageAdapter.write(TOKEN_KEY, token)
      return token
    } catch {
      return null
    }
  }

  async function put(path: string, body: unknown, retry = true): Promise<void> {
    const t = await ensureToken()
    if (!t) return
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      })
      if (res.status === 401 && retry) {
        // token vencido → re-login una vez
        token = null
        localStorageAdapter.clear(TOKEN_KEY)
        await put(path, body, false)
      }
    } catch {
      // offline · queda en localStorage
    }
  }

  function pushKey(key: string, value: unknown): void {
    if (key === 'upm.app.state') {
      const s = value as { prefs?: unknown; saved?: unknown[]; folders?: unknown[] } | null
      if (s?.prefs) void put('/me/prefs', s.prefs)
      if (s && (s.saved || s.folders)) void put('/me/saved', { saved: s.saved ?? [], folders: s.folders ?? [] })
    } else if (key === 'upm.notes.v1') {
      void put('/me/notes', { notes: Array.isArray(value) ? value : [] })
    }
  }

  return {
    name: 'rest',
    read(key) {
      return localStorageAdapter.read(key)
    },
    write(key, value) {
      localStorageAdapter.write(key, value) // offline-first, siempre
      // Push en background, debounced por key (el store escribe seguido)
      const prev = timers.get(key)
      if (prev) clearTimeout(prev)
      timers.set(key, setTimeout(() => {
        timers.delete(key)
        pushKey(key, value)
      }, 1500))
    },
    clear(key) {
      localStorageAdapter.clear(key)
    },
  }
}

// === Active adapter (intercambiable) ===
let activeAdapter: SyncAdapter = localStorageAdapter

// Autoactivación: si el build trae VITE_UPM_API_URL (backend upm-api), el
// estado del usuario se espeja server-side. Sin la var → localStorage puro
// (modo demo idéntico a siempre). sync.ts ya se importa en el boot (store.ts).
// OJO: sin optional chaining — Vite solo estatiza el patrón exacto
// `import.meta.env.VITE_X`; con `env?.` el define no aplica y rollup
// elimina todo el adapter por dead-code.
const UPM_API_URL = (import.meta.env.VITE_UPM_API_URL ?? '').toString().replace(/\/$/, '')
if (typeof window !== 'undefined' && UPM_API_URL) {
  activeAdapter = createRestAdapter(UPM_API_URL)
}

export function setSyncAdapter(adapter: SyncAdapter): void {
  activeAdapter = adapter
}

export function getSyncAdapter(): SyncAdapter {
  return activeAdapter
}

/**
 * API conveniente · usar en lugar de window.localStorage directo.
 */
export const sync = {
  read: <T = unknown>(key: string): T | null => activeAdapter.read(key) as T | null,
  write: <T = unknown>(key: string, value: T): void => activeAdapter.write(key, value),
  clear: (key: string): void => activeAdapter.clear(key),
}
