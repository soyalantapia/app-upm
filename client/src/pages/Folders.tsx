import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  ClipboardList,
  FileStack,
  FileText,
  FolderClosed,
  FolderPlus,
  Lock,
  MessageSquareQuote,
  Newspaper,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, Eyebrow, EmptyState, PageHeader } from '@/components/ui'
import { store, useStore } from '@/lib/store'
import { TOPICS } from '@/lib/data'

const SEED: { id: string; type: 'novedad' | 'documento' | 'respuesta' | 'minuta' | 'brief'; title: string; ref?: string; savedAt: string }[] = [
  { id: 'seed-1', type: 'novedad', title: 'Nueva reglamentación ambiental en Brasil', ref: 'n1', savedAt: '2026-05-04T10:12:00Z' },
  { id: 'seed-2', type: 'documento', title: 'Convenio de cooperación legislativa regional', ref: 'd3', savedAt: '2026-05-03T14:30:00Z' },
  { id: 'seed-3', type: 'respuesta', title: 'Resumen ejecutivo — Corredores bioceánicos', savedAt: '2026-05-02T09:05:00Z' },
  { id: 'seed-4', type: 'brief', title: 'Brief de reunión bilateral Argentina-Brasil', savedAt: '2026-05-01T16:40:00Z' },
  { id: 'seed-5', type: 'minuta', title: 'Minuta — Foro de Medio Ambiente', savedAt: '2026-04-28T11:20:00Z' },
]

const SECTIONS: { id: 'novedad' | 'documento' | 'respuesta' | 'minuta' | 'brief'; label: string; icon: LucideIcon }[] = [
  { id: 'novedad', label: 'Novedades guardadas', icon: Newspaper },
  { id: 'documento', label: 'Documentos guardados', icon: FileText },
  { id: 'respuesta', label: 'Respuestas del Asistente', icon: MessageSquareQuote },
  { id: 'minuta', label: 'Minutas', icon: ClipboardList },
  { id: 'brief', label: 'Briefs', icon: FileStack },
]

export function FoldersPage() {
  const folders = useStore(s => s.folders)
  const saved = useStore(s => s.saved)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  // Inyectar seeds en la primera visita si no hay nada guardado todavía
  useEffect(() => {
    if (saved.length === 0) {
      SEED.forEach(s => store.saveItem({ id: s.id, type: s.type, title: s.title, ref: s.ref }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, typeof saved> = {}
    for (const s of SECTIONS) map[s.id] = []
    for (const item of saved) {
      const key = item.type
      if (!map[key]) map[key] = []
      map[key].push(item)
    }
    return map
  }, [saved])

  const create = () => {
    if (!name.trim()) return
    store.createFolder(name.trim())
    store.pushToast('success', `Carpeta "${name.trim()}" creada`)
    setName('')
    setCreating(false)
  }

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<FolderClosed size={11} />}>Mi carpeta</Eyebrow>}
        title="Tu espacio privado de trabajo"
        description="Guardá briefs, documentos, minutas y respuestas. Privado — solo visible para vos."
        actions={
          <>
            <Badge tone="ghost"><Lock size={11} /> Privado</Badge>
            <Button size="md" onClick={() => setCreating(v => !v)}>
              <FolderPlus size={15} /> Crear carpeta
            </Button>
          </>
        }
      />

      {creating && (
        <Card className="animate-fade-in flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
            placeholder="Nombre de la carpeta (ej. Comisión Ambiente)"
            className="flex-1 rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
          />
          <div className="flex gap-2">
            <Button size="md" variant="secondary" onClick={() => { setCreating(false); setName('') }}>Cancelar</Button>
            <Button size="md" onClick={create} disabled={!name.trim()}>Crear</Button>
          </div>
        </Card>
      )}

      {/* Mis temas */}
      <div>
        <h2 className="text-[15px] font-bold tracking-tight text-ink-900">Mis temas</h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {['ambiente', 'corredores-bioceanicos', 'integracion-regional', 'mercosur'].map(id => {
            const t = TOPICS.find(x => x.id === id)!
            return (
              <Card key={id} interactive className="bg-gradient-to-br from-upm-50 to-white">
                <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
                  <Tag size={11} /> Tema
                </div>
                <div className="mt-1.5 text-[14.5px] font-bold text-ink-900">{t.label}</div>
                <div className="mt-0.5 text-[12px] text-ink-500">3 documentos · 2 minutas</div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Mis carpetas */}
      <div>
        <div className="flex items-end justify-between">
          <h2 className="text-[15px] font-bold tracking-tight text-ink-900">Mis carpetas</h2>
          <span className="text-[11px] font-semibold text-ink-500 tabular-nums">{folders.length} carpetas</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((f, i) => (
            <Card key={f.id} interactive style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-up">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                  <FolderClosed size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold leading-snug text-ink-900">{f.title}</div>
                  {f.description && <div className="mt-0.5 text-[12px] text-ink-500">{f.description}</div>}
                  <div className="mt-2 flex items-center gap-1.5">
                    <Badge tone="ghost">{f.itemCount} ítems</Badge>
                    <Badge tone="success">Privado</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Mis guardados — agrupados por tipo */}
      <div>
        <div className="flex items-end justify-between">
          <h2 className="text-[15px] font-bold tracking-tight text-ink-900">Mis guardados</h2>
          <span className="text-[11px] font-semibold text-ink-500 tabular-nums">{saved.length} ítems</span>
        </div>

        {saved.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Bookmark size={22} />}
              title="Aún no guardaste nada"
              description="Cuando guardes una novedad, respuesta o documento aparecerá acá. Probá desde el Radar o el Asistente."
              action={<Button size="md" variant="soft"><Sparkles size={14} /> Ir al Asistente</Button>}
            />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-5">
            {SECTIONS.map(sec => {
              const items = grouped[sec.id] ?? []
              if (items.length === 0) return null
              const Icon = sec.icon
              return (
                <div key={sec.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
                      <Icon size={12} /> {sec.label}
                    </div>
                    <Badge tone="ghost">{items.length}</Badge>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {items.map((item, i) => (
                      <Card key={item.id} style={{ animationDelay: `${i * 35}ms` }} className="animate-fade-up">
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold leading-snug text-ink-900">{item.title}</div>
                            <div className="mt-0.5 text-[11px] text-ink-500 tabular-nums">
                              {new Date(item.savedAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <button
                            onClick={() => { store.removeSaved(item.id); store.pushToast('info', 'Eliminado de guardados') }}
                            className="rounded-full p-2 text-ink-400 hover:bg-danger-bg/40 hover:text-danger"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Restaurar demo */}
            <button
              onClick={() => SEED.forEach(s => store.saveItem({ id: s.id, type: s.type, title: s.title, ref: s.ref }))}
              className="self-start text-[12px] font-semibold text-upm-700 hover:text-upm-800"
            >
              <Plus size={12} className="mr-1 inline" /> Restaurar guardados de ejemplo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
