// Watchlist activa · normas que el legislador "sigue" para recibir
// actualizaciones cuando aparezcan cambios en el corpus.

import type { NewsItem } from './types'

const STORAGE_KEY = 'upm.watchlist.v1'

export type WatchEntry = {
  itemId: string
  addedAt: number
  // Snapshot del estado al momento de seguirla (para detectar cambios)
  snapshotStatus?: string
  snapshotCitasIn?: number
}

function readAll(): WatchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WatchEntry[]
  } catch {
    return []
  }
}

function writeAll(entries: WatchEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // ignore
  }
}

export function isWatched(itemId: string): boolean {
  return readAll().some(e => e.itemId === itemId)
}

export function watch(itemId: string, snapshot?: { status?: string; citasIn?: number }): void {
  const all = readAll()
  if (all.some(e => e.itemId === itemId)) return
  all.push({
    itemId,
    addedAt: Date.now(),
    snapshotStatus: snapshot?.status,
    snapshotCitasIn: snapshot?.citasIn,
  })
  writeAll(all)
}

export function unwatch(itemId: string): void {
  writeAll(readAll().filter(e => e.itemId !== itemId))
}

export function getWatchEntries(): WatchEntry[] {
  return readAll().sort((a, b) => b.addedAt - a.addedAt)
}

// Detecta cambios entre el snapshot guardado y el estado actual
export type WatchUpdate = {
  entry: WatchEntry
  item: NewsItem | null
  changes: {
    statusChanged?: { from: string | undefined; to: string }
    newCitations?: number // # citaciones nuevas desde el snapshot
  }
}

export function detectUpdates(items: NewsItem[], citasIndex: Map<string, number>): WatchUpdate[] {
  const entries = readAll()
  if (entries.length === 0) return []
  const byId = new Map(items.map(i => [i.id, i]))
  const updates: WatchUpdate[] = []
  for (const entry of entries) {
    const item = byId.get(entry.itemId) ?? null
    const changes: WatchUpdate['changes'] = {}
    if (item && item.status && item.status !== entry.snapshotStatus) {
      changes.statusChanged = { from: entry.snapshotStatus, to: item.status }
    }
    if (entry.snapshotCitasIn !== undefined) {
      const current = citasIndex.get(entry.itemId) ?? 0
      const diff = current - entry.snapshotCitasIn
      if (diff > 0) changes.newCitations = diff
    }
    updates.push({ entry, item, changes })
  }
  return updates
}

export function getWatchCount(): number {
  return readAll().length
}
