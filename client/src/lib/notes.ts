// Anotaciones personales del legislador sobre cada norma.
// Persisten 100% client-side en localStorage.

const STORAGE_KEY = 'upm.notes.v1'

export type Note = {
  id: string             // identificador único (timestamp)
  itemId: string         // id del item al que pertenece la nota
  text: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

function readAll(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Note[]
  } catch {
    return []
  }
}

function writeAll(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch {
    // localStorage lleno o deshabilitado
  }
}

export function getNotesForItem(itemId: string): Note[] {
  return readAll()
    .filter(n => n.itemId === itemId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function addNote(itemId: string, text: string, tags: string[] = []): Note {
  const all = readAll()
  const note: Note = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId,
    text: text.trim(),
    tags: tags.map(t => t.trim()).filter(Boolean),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  all.push(note)
  writeAll(all)
  return note
}

export function updateNote(noteId: string, patch: Partial<Pick<Note, 'text' | 'tags'>>): Note | null {
  const all = readAll()
  const idx = all.findIndex(n => n.id === noteId)
  if (idx === -1) return null
  all[idx] = {
    ...all[idx],
    ...patch,
    updatedAt: Date.now(),
  }
  writeAll(all)
  return all[idx]
}

export function deleteNote(noteId: string): void {
  const all = readAll().filter(n => n.id !== noteId)
  writeAll(all)
}

// Devuelve TODOS los itemIds que tienen al menos una nota (útil para badge en lista)
export function getAllAnnotatedItemIds(): Set<string> {
  return new Set(readAll().map(n => n.itemId))
}

// Total de notas en el sistema (para mostrar en Home/perfil)
export function getTotalNotes(): number {
  return readAll().length
}
