import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  ClipboardList,
  FileStack,
  FileText,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Lock,
  MessageSquareQuote,
  Move,
  Newspaper,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, Eyebrow, EmptyState, PageHeader } from '@/components/ui'
import { store, useStore, type SavedItem, type SavedType } from '@/lib/store'
import { TOPICS } from '@/lib/data'
import { useUI } from '@/lib/ui-provider'
import { Drawer } from '@/components/Drawer'
import { cn } from '@/lib/cn'

const SEED: { id: string; type: SavedType; title: string; ref?: string }[] = [
  { id: 'seed-1', type: 'novedad', title: 'Nueva reglamentación ambiental en Brasil', ref: 'n1' },
  { id: 'seed-2', type: 'documento', title: 'Convenio de cooperación legislativa regional', ref: 'd3' },
  { id: 'seed-3', type: 'respuesta', title: 'Resumen ejecutivo — Corredores bioceánicos' },
  { id: 'seed-4', type: 'brief', title: 'Brief de reunión bilateral Argentina-Brasil' },
  { id: 'seed-5', type: 'minuta', title: 'Minuta — Foro de Medio Ambiente' },
]

const SECTIONS: { id: SavedType; label: string; icon: LucideIcon }[] = [
  { id: 'novedad', label: 'Novedades guardadas', icon: Newspaper },
  { id: 'documento', label: 'Documentos guardados', icon: FileText },
  { id: 'respuesta', label: 'Respuestas del Asistente', icon: MessageSquareQuote },
  { id: 'minuta', label: 'Minutas', icon: ClipboardList },
  { id: 'brief', label: 'Briefs', icon: FileStack },
]

export function FoldersPage() {
  const { openDocument } = useUI()
  const folders = useStore(s => s.folders)
  const saved = useStore(s => s.saved)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<SavedItem | null>(null)

  useEffect(() => {
    if (saved.length === 0) {
      SEED.forEach(s => store.saveItem({ id: s.id, type: s.type, title: s.title, ref: s.ref }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, SavedItem[]> = {}
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

  const folderItems = openFolderId
    ? saved.filter(s => s.folderId === openFolderId)
    : []
  const openFolder = folders.find(f => f.id === openFolderId)

  const handleItemClick = (item: SavedItem) => {
    if (item.type === 'documento' && item.ref) {
      openDocument(item.ref)
    } else if (item.type === 'novedad' && item.ref) {
      window.location.hash = `#/radar/${item.ref}`
    }
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
          {folders.map((f, i) => {
            const itemCount = saved.filter(s => s.folderId === f.id).length
            return (
              <Card
                key={f.id}
                interactive
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-fade-up"
                onClick={() => setOpenFolderId(f.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                    <FolderClosed size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold leading-snug text-ink-900">{f.title}</div>
                    {f.description && <div className="mt-0.5 text-[12px] text-ink-500">{f.description}</div>}
                    <div className="mt-2 flex items-center gap-1.5">
                      <Badge tone="ghost">{itemCount} ítems</Badge>
                      <Badge tone="success">Privado</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
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
                          <button
                            onClick={() => handleItemClick(item)}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700 hover:bg-upm-100"
                          >
                            <Icon size={15} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <button onClick={() => handleItemClick(item)} className="text-left">
                              <div className="text-[13px] font-semibold leading-snug text-ink-900 hover:text-upm-700">
                                {item.title}
                              </div>
                            </button>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-ink-500 tabular-nums">
                              {new Date(item.savedAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              {item.folderId && (
                                <Badge tone="brand">{folders.find(f => f.id === item.folderId)?.title ?? 'Carpeta'}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => setMoveTarget(item)}
                              className="rounded-full p-2 text-ink-400 hover:bg-upm-50 hover:text-upm-700"
                              aria-label="Mover a carpeta"
                              title="Mover a carpeta"
                            >
                              <Move size={13} />
                            </button>
                            <button
                              onClick={() => { store.removeSaved(item.id); store.pushToast('info', 'Eliminado de guardados') }}
                              className="rounded-full p-2 text-ink-400 hover:bg-danger-bg/40 hover:text-danger"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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

      {/* Drawer de carpeta */}
      <Drawer
        open={Boolean(openFolderId)}
        onClose={() => setOpenFolderId(null)}
        title={openFolder ? <span className="flex items-center gap-2"><FolderOpen size={16} className="text-upm-600" /> {openFolder.title}</span> : 'Carpeta'}
        description={
          openFolder
            ? `${folderItems.length} ítems · ${openFolder.description ?? 'Carpeta privada'}`
            : ''
        }
        width="md"
      >
        {folderItems.length === 0 ? (
          <div className="rounded-2xl bg-ink-50 p-6 text-center text-[13px] text-ink-500">
            Esta carpeta aún no tiene ítems. Mové uno desde "Mis guardados" usando el icono de mover.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {folderItems.map(item => {
              const sec = SECTIONS.find(s => s.id === item.type)
              const Icon = sec?.icon ?? FileText
              return (
                <Card key={item.id} className="cursor-pointer" onClick={() => handleItemClick(item)}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge tone="brand">{sec?.label ?? item.type}</Badge>
                      <div className="mt-1 text-[13px] font-semibold leading-snug text-ink-900">{item.title}</div>
                      <div className="mt-0.5 text-[10.5px] text-ink-500 tabular-nums">
                        {new Date(item.savedAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        store.moveSavedToFolder(item.id, undefined)
                        store.pushToast('info', 'Ítem quitado de la carpeta')
                      }}
                      className="rounded-full p-2 text-ink-400 hover:bg-ink-50 hover:text-ink-900"
                      aria-label="Quitar de carpeta"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-upm-50/40 p-3 ring-1 ring-upm-100">
          <span className="text-[12px] text-ink-700">¿Querés eliminar esta carpeta?</span>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (openFolderId) {
                store.removeFolder(openFolderId)
                store.pushToast('info', 'Carpeta eliminada')
                setOpenFolderId(null)
              }
            }}
          >
            <Trash2 size={12} /> Eliminar carpeta
          </Button>
        </div>
      </Drawer>

      {/* Modal mover a carpeta */}
      {moveTarget && (
        <Drawer
          open={Boolean(moveTarget)}
          onClose={() => setMoveTarget(null)}
          title={<span className="flex items-center gap-2"><Move size={16} className="text-upm-600" /> Mover a carpeta</span>}
          description={moveTarget.title}
          width="md"
        >
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                store.moveSavedToFolder(moveTarget.id, undefined)
                store.pushToast('info', 'Sin carpeta asignada')
                setMoveTarget(null)
              }}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ring-1 transition',
                !moveTarget.folderId ? 'bg-upm-50 ring-upm-200' : 'bg-white ring-ink-100 hover:ring-upm-100',
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-50 text-ink-500">
                <X size={14} />
              </span>
              <span className="text-[13px] font-semibold text-ink-900">Sin carpeta</span>
            </button>
            {folders.map(f => {
              const active = moveTarget.folderId === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    store.moveSavedToFolder(moveTarget.id, f.id)
                    store.pushToast('success', `Movido a "${f.title}"`)
                    setMoveTarget(null)
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ring-1 transition',
                    active ? 'bg-upm-50 ring-upm-200' : 'bg-white ring-ink-100 hover:ring-upm-100',
                  )}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-upm-50 text-upm-700">
                    <FolderClosed size={14} />
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block text-[13px] font-semibold text-ink-900">{f.title}</span>
                    {f.description && <span className="block text-[11px] text-ink-500">{f.description}</span>}
                  </span>
                  {active && <Badge tone="brand">Actual</Badge>}
                </button>
              )
            })}
          </div>
        </Drawer>
      )}
    </div>
  )
}
