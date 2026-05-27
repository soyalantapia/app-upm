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

// === Backend REST-ready (stub) ===
// Implementación futura cuando exista API:
//
// export function createRestAdapter(baseUrl: string, token: string): SyncAdapter {
//   const cache = new Map<string, unknown>()
//   return {
//     name: 'rest',
//     read(key) {
//       // Sync-only · este adapter haría background sync via fetch + cache
//       return cache.get(key) ?? localStorageAdapter.read(key)
//     },
//     write(key, value) {
//       cache.set(key, value)
//       localStorageAdapter.write(key, value)  // mantener offline
//       fetch(`${baseUrl}/sync/${key}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//         body: JSON.stringify(value),
//       }).catch(() => { /* offline · queda en localStorage */ })
//     },
//     clear(key) {
//       cache.delete(key)
//       localStorageAdapter.clear(key)
//       fetch(`${baseUrl}/sync/${key}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
//     },
//   }
// }

// === Active adapter (intercambiable) ===
let activeAdapter: SyncAdapter = localStorageAdapter

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
