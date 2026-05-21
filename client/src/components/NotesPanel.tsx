import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, X, Check, StickyNote } from 'lucide-react'
import { addNote, deleteNote, getNotesForItem, updateNote, type Note } from '@/lib/notes'

// Panel de anotaciones personales del legislador sobre una norma específica.
// Notas + tags, persistidas en localStorage.
export function NotesPanel({ itemId }: { itemId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftTags, setDraftTags] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [editingTags, setEditingTags] = useState('')

  useEffect(() => {
    setNotes(getNotesForItem(itemId))
  }, [itemId])

  const refresh = () => setNotes(getNotesForItem(itemId))

  const handleSave = () => {
    if (!draft.trim()) return
    const tags = draftTags.split(',').map(t => t.trim()).filter(Boolean)
    addNote(itemId, draft, tags)
    setDraft('')
    setDraftTags('')
    setComposing(false)
    refresh()
  }

  const handleEdit = (n: Note) => {
    setEditingId(n.id)
    setEditingText(n.text)
    setEditingTags(n.tags.join(', '))
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    const tags = editingTags.split(',').map(t => t.trim()).filter(Boolean)
    updateNote(editingId, { text: editingText, tags })
    setEditingId(null)
    refresh()
  }

  const handleDelete = (noteId: string) => {
    if (!confirm('Eliminar esta anotación?')) return
    deleteNote(noteId)
    refresh()
  }

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <StickyNote size={11} /> Mis anotaciones {notes.length > 0 && <span className="text-ink-500">({notes.length})</span>}
        </div>
        {!composing && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1 rounded-full bg-upm-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-cta hover:-translate-y-0.5"
          >
            <Plus size={11} /> Agregar nota
          </button>
        )}
      </div>

      {composing && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-upm-50/40 p-3 ring-1 ring-upm-100">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Escribí tu anotación personal sobre esta norma…"
            className="min-h-[80px] resize-y rounded-xl bg-white px-3 py-2 text-[13px] text-ink-900 ring-1 ring-ink-100 focus:outline-none focus:ring-upm-300"
            autoFocus
          />
          <input
            value={draftTags}
            onChange={e => setDraftTags(e.target.value)}
            placeholder="Tags separados por coma (ej: priorizar, comisión-energía)"
            className="rounded-xl bg-white px-3 py-2 text-[12px] text-ink-700 ring-1 ring-ink-100 focus:outline-none focus:ring-upm-300"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setComposing(false); setDraft(''); setDraftTags('') }}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-ink-600 ring-1 ring-ink-100 hover:bg-ink-50"
            >
              <X size={11} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!draft.trim()}
              className="inline-flex items-center gap-1 rounded-full bg-upm-700 px-3 py-1.5 text-[11.5px] font-bold text-white shadow-cta disabled:opacity-40"
            >
              <Check size={11} /> Guardar nota
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && !composing ? (
        <p className="mt-3 text-[12px] italic text-ink-500">
          Sin anotaciones todavía. Agregá una para guardar pensamientos, recordatorios o tags privados sobre esta norma.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {notes.map(n => (
            <li key={n.id} className="rounded-2xl bg-ink-50/40 p-3 ring-1 ring-ink-100">
              {editingId === n.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    className="min-h-[60px] resize-y rounded-xl bg-white px-2.5 py-2 text-[12.5px] ring-1 ring-ink-100 focus:outline-none focus:ring-upm-300"
                  />
                  <input
                    value={editingTags}
                    onChange={e => setEditingTags(e.target.value)}
                    placeholder="Tags separados por coma"
                    className="rounded-xl bg-white px-2.5 py-1.5 text-[11.5px] text-ink-700 ring-1 ring-ink-100 focus:outline-none focus:ring-upm-300"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold text-ink-600 ring-1 ring-ink-100"
                    >
                      <X size={10} /> Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="inline-flex items-center gap-1 rounded-full bg-upm-700 px-2.5 py-1 text-[10.5px] font-bold text-white shadow-cta"
                    >
                      <Check size={10} /> Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-800">{n.text}</p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => handleEdit(n)}
                        className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink-600 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700"
                        title="Editar"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink-600 ring-1 ring-ink-100 hover:bg-danger-bg/40 hover:text-danger-fg"
                        title="Eliminar"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="text-ink-500 tabular-nums">{new Date(n.updatedAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    {n.tags.length > 0 && <span className="text-ink-300">·</span>}
                    {n.tags.map((t, i) => (
                      <span key={`${n.id}-t-${i}`} className="rounded-full bg-upm-50 px-1.5 py-0.5 font-bold text-upm-700 ring-1 ring-upm-100">
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
