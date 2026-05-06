import { useSyncExternalStore } from 'react'
import { DEFAULT_PREFS, FOLDERS } from './data'
import type { ChatMessage, Preferences, Folder } from './types'

const STORAGE_KEY = 'upm.app.state'

export type SavedType = 'novedad' | 'documento' | 'respuesta' | 'minuta' | 'brief'

export type SavedItem = {
  id: string
  type: SavedType
  title: string
  ref?: string
  body?: string
  meta?: Record<string, string>
  folderId?: string
  savedAt: string
}

export type Notification = {
  id: string
  title: string
  description: string
  type: 'novedad' | 'foro' | 'documento' | 'sistema'
  unread: boolean
  createdAt: string
  ref?: string
}

export type Conversation = {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: string
}

type Toast = { id: string; tone: 'success' | 'info' | 'warning' | 'danger'; message: string }

type State = {
  prefs: Preferences | null
  onboarded: boolean
  saved: SavedItem[]
  folders: Folder[]
  notifications: Notification[]
  conversations: Conversation[]
  toasts: Toast[]
}

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'nt-1',
    title: 'Nueva alerta de Ambiente',
    description: 'Brasil publicó un decreto con impacto regional. Relevancia alta.',
    type: 'novedad',
    unread: true,
    createdAt: '2026-05-06T08:30:00Z',
    ref: 'n1',
  },
  {
    id: 'nt-2',
    title: 'Documento agregado a la Biblioteca',
    description: 'Convenio de cooperación legislativa regional fue publicado como Oficial UPM.',
    type: 'documento',
    unread: true,
    createdAt: '2026-05-05T16:10:00Z',
    ref: 'd3',
  },
  {
    id: 'nt-3',
    title: 'Foro de Corredores Bioceánicos',
    description: 'Agenda preliminar disponible. Próxima reunión: 19 de mayo.',
    type: 'foro',
    unread: true,
    createdAt: '2026-05-05T11:42:00Z',
  },
  {
    id: 'nt-4',
    title: 'Tu Radar fue actualizado',
    description: '5 nuevas novedades coinciden con tus temas prioritarios.',
    type: 'sistema',
    unread: false,
    createdAt: '2026-05-04T09:00:00Z',
  },
  {
    id: 'nt-5',
    title: 'Minuta publicada',
    description: 'Foro UPM de Medio Ambiente publicó la minuta de la última reunión.',
    type: 'foro',
    unread: false,
    createdAt: '2026-05-03T13:25:00Z',
  },
]

const initial: State = {
  prefs: null,
  onboarded: false,
  saved: [],
  folders: FOLDERS,
  notifications: SEED_NOTIFICATIONS,
  conversations: [],
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
      notifications: parsed.notifications && parsed.notifications.length ? parsed.notifications : SEED_NOTIFICATIONS,
      conversations: parsed.conversations ?? [],
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
    void _t
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

const randId = (prefix = '') => prefix + Math.random().toString(36).slice(2, 9)

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
  saveItem(item: Omit<SavedItem, 'savedAt'>) {
    update(s => ({
      ...s,
      saved: [{ ...item, savedAt: new Date().toISOString() }, ...s.saved.filter(i => i.id !== item.id)],
    }))
  },
  removeSaved(id: string) {
    update(s => ({
      ...s,
      saved: s.saved.filter(i => i.id !== id),
    }))
  },
  moveSavedToFolder(savedId: string, folderId: string | undefined) {
    update(s => ({
      ...s,
      saved: s.saved.map(i => (i.id === savedId ? { ...i, folderId } : i)),
      folders: s.folders.map(f => {
        if (folderId && f.id === folderId) return { ...f, itemCount: f.itemCount + 1 }
        return f
      }),
    }))
  },
  isSaved(ref: string | undefined) {
    if (!ref) return false
    return state.saved.some(i => i.ref === ref)
  },
  createFolder(title: string, description?: string) {
    const id = randId('f-')
    update(s => ({
      ...s,
      folders: [{ id, title, itemCount: 0, description }, ...s.folders],
    }))
    return id
  },
  removeFolder(id: string) {
    update(s => ({
      ...s,
      folders: s.folders.filter(f => f.id !== id),
      saved: s.saved.map(i => (i.folderId === id ? { ...i, folderId: undefined } : i)),
    }))
  },
  pushToast(tone: Toast['tone'], message: string) {
    const id = randId('t-')
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
  // Notifications
  markNotificationRead(id: string) {
    update(s => ({
      ...s,
      notifications: s.notifications.map(n => (n.id === id ? { ...n, unread: false } : n)),
    }))
  },
  markAllNotificationsRead() {
    update(s => ({
      ...s,
      notifications: s.notifications.map(n => ({ ...n, unread: false })),
    }))
  },
  pushNotification(n: Omit<Notification, 'id' | 'createdAt' | 'unread'>) {
    update(s => ({
      ...s,
      notifications: [
        { id: randId('nt-'), unread: true, createdAt: new Date().toISOString(), ...n },
        ...s.notifications,
      ],
    }))
  },
  // Conversations
  saveConversation(title: string, messages: ChatMessage[]) {
    const id = randId('c-')
    update(s => ({
      ...s,
      conversations: [
        { id, title, messages, updatedAt: new Date().toISOString() },
        ...s.conversations.slice(0, 24),
      ],
    }))
    return id
  },
  removeConversation(id: string) {
    update(s => ({
      ...s,
      conversations: s.conversations.filter(c => c.id !== id),
    }))
  },
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(initial),
  )
}
