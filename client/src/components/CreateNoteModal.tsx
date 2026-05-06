import { useEffect, useState } from 'react'
import { ClipboardList, FileStack } from 'lucide-react'
import { Modal } from './Modal'
import { Button, Chip } from './ui'
import { TOPICS } from '@/lib/data'
import type { Topic } from '@/lib/types'
import { store, useStore } from '@/lib/store'

type Mode = 'minuta' | 'brief'

export type CreateNoteIntent = {
  mode: Mode
  defaultTitle?: string
  defaultBody?: string
  ref?: string
} | null

export function CreateNoteModal({
  intent,
  onClose,
}: {
  intent: CreateNoteIntent
  onClose: () => void
}) {
  const folders = useStore(s => s.folders)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [topic, setTopic] = useState<Topic>('integracion-regional')
  const [folderId, setFolderId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (intent) {
      setTitle(intent.defaultTitle ?? (intent.mode === 'minuta' ? 'Minuta — ' : 'Brief — '))
      setBody(intent.defaultBody ?? '')
      setTopic('integracion-regional')
      setFolderId(undefined)
    }
  }, [intent])

  if (!intent) return null

  const isMinuta = intent.mode === 'minuta'
  const Icon = isMinuta ? ClipboardList : FileStack

  const submit = () => {
    if (!title.trim()) return
    store.saveItem({
      id: 'sav-' + intent.mode + '-' + Date.now(),
      type: intent.mode,
      title: title.trim(),
      body: body.trim(),
      ref: intent.ref,
      folderId,
      meta: { topic },
    })
    store.pushNotification({
      type: 'sistema',
      title: `${isMinuta ? 'Minuta' : 'Brief'} creado`,
      description: title.trim(),
    })
    store.pushToast('success', `${isMinuta ? 'Minuta' : 'Brief'} guardado en tu carpeta`)
    onClose()
  }

  return (
    <Modal
      open={Boolean(intent)}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Icon size={17} className="text-upm-600" />
          {isMinuta ? 'Crear minuta' : 'Crear brief'}
        </span>
      }
      description={
        isMinuta
          ? 'Tu minuta queda en Mi carpeta como minuta institucional reutilizable.'
          : 'Convertí esta información en un brief listo para reunión, comisión o foro.'
      }
      footer={
        <>
          <Button size="md" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="md" onClick={submit} disabled={!title.trim()}>
            Guardar en mi carpeta
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Título</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={isMinuta ? 'Minuta — Reunión...' : 'Brief — Tema...'}
            className="rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Contenido</span>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            placeholder={
              isMinuta
                ? '1. Tema\n2. Participantes\n3. Puntos tratados\n4. Acuerdos\n5. Próximos pasos'
                : '1. Resumen\n2. Marco normativo\n3. Preguntas para reunión\n4. Próximos pasos'
            }
            className="resize-none rounded-2xl bg-white px-4 py-3 text-[13.5px] leading-relaxed ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Tema asociado</span>
          <div className="flex flex-wrap gap-1.5">
            {TOPICS.slice(0, 8).map(t => (
              <Chip key={t.id} size="sm" active={topic === t.id} onClick={() => setTopic(t.id)}>
                {t.shortLabel}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Carpeta destino</span>
          <div className="flex flex-wrap gap-1.5">
            <Chip size="sm" active={!folderId} onClick={() => setFolderId(undefined)}>
              Sin carpeta
            </Chip>
            {folders.map(f => (
              <Chip key={f.id} size="sm" active={folderId === f.id} onClick={() => setFolderId(f.id)}>
                {f.title}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
