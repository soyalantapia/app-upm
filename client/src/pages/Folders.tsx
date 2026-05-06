import { useState } from 'react'
import { FolderClosed, FolderPlus, Bookmark, Lock, Sparkles, Tag, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Eyebrow, EmptyState, PageHeader } from '@/components/ui'
import { store, useStore } from '@/lib/store'
import { TOPICS } from '@/lib/data'

export function FoldersPage() {
  const folders = useStore(s => s.folders)
  const saved = useStore(s => s.saved)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

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
        description="Guardá briefs, documentos, dossiers y materiales. Privado — solo visible para vos."
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
                <div className="mt-0.5 text-[12px] text-ink-500">3 documentos · 2 dossiers</div>
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

      {/* Mis guardados */}
      <div>
        <h2 className="text-[15px] font-bold tracking-tight text-ink-900">Mis guardados</h2>
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
          <div className="mt-3 flex flex-col gap-2.5">
            {saved.map((s, i) => (
              <Card key={s.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-up">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                    <Bookmark size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge tone="brand">{s.type}</Badge>
                    <div className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ink-900">{s.title}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-500 tabular-nums">{new Date(s.savedAt).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => { store.removeSaved(s.id); store.pushToast('info', 'Eliminado de guardados') }}
                    className="rounded-full p-2 text-ink-400 hover:bg-danger-bg/40 hover:text-danger"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
