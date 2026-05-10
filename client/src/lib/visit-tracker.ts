// Tracking de "qué cambió desde tu última visita".
// Snapshot localStorage de los IDs vistos al pasar por Radar; en Home
// computamos el diff vs feed actual.

import type { NewsItem } from './types'

const KEY = 'upm.visit.snapshot.v1'

export type VisitSnapshot = {
  ts: number
  itemIds: string[]
}

export function readSnapshot(): VisitSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as VisitSnapshot
  } catch {
    return null
  }
}

export function writeSnapshot(items: NewsItem[]): void {
  try {
    const snap: VisitSnapshot = {
      ts: Date.now(),
      itemIds: items.map(i => i.id),
    }
    localStorage.setItem(KEY, JSON.stringify(snap))
  } catch {
    // localStorage puede estar deshabilitado o lleno · ignorar silenciosamente
  }
}

// Computa los items nuevos desde la última visita registrada.
// Retorna un array vacío si nunca hubo visita previa (primer uso).
export function computeDiff(currentItems: NewsItem[]): {
  newItems: NewsItem[]
  sinceTs: number | null
  hadSnapshot: boolean
} {
  const snap = readSnapshot()
  if (!snap || !snap.itemIds || snap.itemIds.length === 0) {
    return { newItems: [], sinceTs: null, hadSnapshot: false }
  }
  const seen = new Set(snap.itemIds)
  const newItems = currentItems.filter(i => !seen.has(i.id))
  return { newItems, sinceTs: snap.ts, hadSnapshot: true }
}
