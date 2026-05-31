import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, EmptyState } from '@/components/ui'
import { store, useStore, type SavedItem, type SavedType } from '@/lib/store'
import { useUI } from '@/lib/ui-provider'
import { Drawer } from '@/components/Drawer'
import { Markdown } from '@/components/Markdown'
import { cn } from '@/lib/cn'

const SEED: { id: string; type: SavedType; title: string; ref?: string; body?: string }[] = [
  { id: 'seed-1', type: 'novedad', title: 'Nueva reglamentación ambiental en Brasil', ref: 'n1' },
  { id: 'seed-2', type: 'documento', title: 'Convenio de cooperación legislativa regional', ref: 'd3' },
  {
    id: 'seed-3',
    type: 'respuesta',
    title: 'Resumen ejecutivo · Corredores bioceánicos',
    body: '## Corredores bioceánicos · resumen ejecutivo\n\n**Qué es:** la red vial y ferroviaria que conecta puertos del Atlántico y del Pacífico atravesando el MERCOSUR.\n\n**Por qué importa:**\n- Reduce costos logísticos del comercio regional con Asia.\n- Argentina, Brasil, Paraguay y Chile tienen tramos en distintas etapas.\n\n**Estado:** en tramitación en varias legislaturas; sin marco normativo único.\n\n> Generado por el Asistente AI UPM a partir del corpus regional.',
  },
  {
    id: 'seed-4',
    type: 'brief',
    title: 'Brief de reunión bilateral Argentina-Brasil',
    body: '## Brief · reunión bilateral Argentina–Brasil\n\n**Objetivo:** alinear posiciones sobre integración energética y ambiental.\n\n**3 puntos clave:**\n1. Coordinación de agendas en el Parlasur.\n2. Marco común para infraestructura de integración física.\n3. Compromisos ambientales sobre la cuenca compartida.\n\n**Próximo paso:** acordar fecha de comisión conjunta.',
  },
  {
    id: 'seed-5',
    type: 'minuta',
    title: 'Minuta: Foro de Medio Ambiente',
    body: '## Minuta · Foro de Medio Ambiente\n\n**Asistentes:** delegaciones de AR, BR, UY, PY.\n\n**Temas tratados:**\n- Estado del Acuerdo de Escazú en la región.\n- Monitoreo de la cuenca del Pantanal.\n\n**Acuerdos:** elevar un informe conjunto a las comisiones de ambiente de cada país.',
  },
]

const TYPE_META: Record<SavedType, { label: string; icon: LucideIcon; tone: string }> = {
  novedad: { label: 'Novedad', icon: Newspaper, tone: 'bg-warning-bg text-warning-fg' },
  documento: { label: 'Documento', icon: FileText, tone: 'bg-info-bg text-info-fg' },
  respuesta: { label: 'Respuesta', icon: MessageSquareQuote, tone: 'bg-success-bg text-success-fg' },
  minuta: { label: 'Minuta', icon: ClipboardList, tone: 'bg-upm-50 text-upm-700' },
  brief: { label: 'Brief', icon: FileStack, tone: 'bg-upm-100 text-upm-800' },
}

export function FoldersPage() {
  const navigate = useNavigate()
  const { openDocument } = useUI()
  const folders = useStore(s => s.folders)
  const saved = useStore(s => s.saved)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<SavedItem | null>(null)
  const [readItem, setReadItem] = useState<SavedItem | null>(null)

  useEffect(() => {
    if (saved.length === 0) {
      SEED.forEach(s => store.saveItem({ id: s.id, type: s.type, title: s.title, ref: s.ref, body: s.body }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    } else if (item.body) {
      setReadItem(item)
    } else {
      store.pushToast('info', 'Este ítem no tiene vista disponible aún')
    }
  }

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      {/* Header compacto · título + Crear carpeta */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <FolderClosed size={11} /> Mi carpeta
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
            Tu espacio privado
          </h1>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] text-ink-500">
            <Lock size={11} /> Solo visible para vos · briefs, minutas, leyes guardadas
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(v => !v)}>
          <FolderPlus size={13} /> Crear carpeta
        </Button>
      </div>

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

      {/* Carpetas */}
      <div>
        <div className="flex items-end justify-between">
          <h2 className="text-[15px] font-bold tracking-tight text-ink-900">Carpetas</h2>
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

      {/* Guardados, lista plana */}
      <div>
        <div className="flex items-end justify-between">
          <h2 className="text-[15px] font-bold tracking-tight text-ink-900">Guardados</h2>
          <span className="text-[11px] font-semibold text-ink-500 tabular-nums">{saved.length} ítems</span>
        </div>

        {saved.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Bookmark size={22} />}
              title="Aún no guardaste nada"
              description="Cuando guardes una novedad, respuesta o documento aparecerá acá. Probá desde el Radar o el Asistente."
              action={<Button size="md" variant="soft" onClick={() => navigate('/asistente')}><Sparkles size={14} /> Ir al Asistente</Button>}
            />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {saved.map((item, i) => {
              const meta = TYPE_META[item.type]
              const Icon = meta.icon
              const folder = item.folderId ? folders.find(f => f.id === item.folderId) : null
              return (
                <Card
                  key={item.id}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className="animate-fade-up"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleItemClick(item)}
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${meta.tone} hover:opacity-80`}
                    >
                      <Icon size={16} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="brand">{meta.label}</Badge>
                        {folder && <Badge tone="info">{folder.title}</Badge>}
                        {item.id.startsWith('seed-') && <Badge tone="ghost">Ejemplo</Badge>}
                      </div>
                      <button onClick={() => handleItemClick(item)} className="mt-1.5 block text-left">
                        <div className="text-[13.5px] font-semibold leading-snug text-ink-900 hover:text-upm-700">
                          {item.title}
                        </div>
                      </button>
                      <div className="mt-0.5 text-[10.5px] text-ink-500 tabular-nums">
                        {new Date(item.savedAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
              )
            })}

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
          <div className="rounded-2xl bg-gradient-to-br from-upm-50/40 to-white p-6 text-center ring-1 ring-upm-100">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-upm-100 text-upm-700">
              📁
            </div>
            <p className="mt-3 text-[13px] font-semibold text-ink-800">Esta carpeta está vacía</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
              Para sumar normas: andá al <button onClick={() => navigate('/radar')} className="font-bold text-upm-700 underline-offset-2 hover:underline">Radar</button> o a <button onClick={() => navigate('/leyes')} className="font-bold text-upm-700 underline-offset-2 hover:underline">Leyes</button>, tocá "Guardar" en una norma y luego movela acá con el icono de mover.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {folderItems.map(item => {
              const meta = TYPE_META[item.type]
              const Icon = meta.icon
              return (
                <Card key={item.id} className="cursor-pointer" onClick={() => handleItemClick(item)}>
                  <div className="flex items-start gap-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${meta.tone}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge tone="brand">{meta.label}</Badge>
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

      {/* Drawer leer ítem guardado (brief / respuesta / minuta) */}
      {readItem && (
        <Drawer
          open={Boolean(readItem)}
          onClose={() => setReadItem(null)}
          title={
            <span className="flex items-center gap-2">
              {(() => { const meta = TYPE_META[readItem.type]; const Icon = meta.icon; return <Icon size={15} className="text-upm-600" /> })()}
              <span className="line-clamp-1">{readItem.title}</span>
            </span>
          }
          description={
            <span className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_META[readItem.type].tone}`}>
                {TYPE_META[readItem.type].label}
              </span>
              <span>·</span>
              <span>{new Date(readItem.savedAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          }
          width="lg"
        >
          <div className="prose-sm max-w-none">
            {readItem.body ? (
              <Markdown content={readItem.body} />
            ) : (
              <p className="text-[13px] text-ink-500 italic">Este ítem no tiene contenido de texto disponible.</p>
            )}
          </div>
        </Drawer>
      )}

      {/* Drawer mover */}
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
