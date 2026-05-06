import { useSyncExternalStore } from 'react'
import { DEFAULT_PREFS, FOLDERS } from './data'
import type { Preferences, Folder } from './types'

const STORAGE_KEY = 'upm.app.state'

type Saved = {
  id: string
  type: 'novedad' | 'documento' | 'respuesta' | 'brief' | 'minuta'
  title: string
  ref?: string
  savedAt: string
  folderId?: string
}

type State = {
  prefs: Preferences | null
  onboarded: boolean
  saved: Saved[]
  folders: Folder[]
  toasts: { id: string; tone: 'success' | 'info' | 'warning' | 'danger'; message: string }[]
}

const initial: State = {
  prefs: null,
  onboarded: false,
  saved: [],
  folders: FOLDERS,
  toasts: [],
}

function load(): State {
  if (typeof window === 'undefined') return initial
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<State>
    return {
      ...initial,
      ...parsed,
      toasts: [],
      folders: parsed.folders && parsed.folders.length ? parsed.folders : FOLDERS,
    }
  } catch {
    return initial
  }
}

let state: State = load()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(fn => fn())

function persist(s: State) {
  try {
    const { toasts: _t, ...rest } = s
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  } catch {
    // ignore
  }
}

function update(updater: (s: State) => State) {
  state = updater(state)
  persist(state)
  notify()
}

export const store = {
  getSnapshot: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  setPrefs(prefs: Preferences) {
    update(s => ({ ...s, prefs, onboarded: true }))
  },
  resetOnboarding() {
    update(s => ({ ...s, prefs: null, onboarded: false }))
  },
  saveItem(item: Omit<Saved, 'savedAt'>) {
    update(s => ({
      ...s,
      saved: [{ ...item, savedAt: new Date().toISOString() }, ...s.saved.filter(i => i.id !== item.id)],
    }))
  },
  removeSaved(id: string) {
    update(s => ({ ...s, saved: s.saved.filter(i => i.id !== id) }))
  },
  createFolder(title: string) {
    const id = 'f' + Math.random().toString(36).slice(2, 8)
    update(s => ({
      ...s,
      folders: [{ id, title, itemCount: 0 }, ...s.folders],
    }))
  },
  pushToast(tone: State['toasts'][number]['tone'], message: string) {
    const id = 't' + Date.now()
    update(s => ({ ...s, toasts: [...s.toasts, { id, tone, message }] }))
    setTimeout(() => {
      update(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) }))
    }, 3200)
  },
  dismissToast(id: string) {
    update(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) }))
  },
  setDefaults() {
    update(s => ({ ...s, prefs: DEFAULT_PREFS, onboarded: true }))
  },
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(initial),
  )
}
