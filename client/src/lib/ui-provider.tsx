import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { DocumentDetailDrawer } from '@/components/DocumentDetailDrawer'
import { CreateNoteModal, type CreateNoteIntent } from '@/components/CreateNoteModal'
import { DOCUMENTS } from '@/lib/data'
import type { Document } from '@/lib/types'

type UIContextValue = {
  openDocument: (idOrDoc: string | Document) => void
  closeDocument: () => void
  openCreateMinuta: (preset?: { title?: string; body?: string; ref?: string }) => void
  openCreateBrief: (preset?: { title?: string; body?: string; ref?: string }) => void
  closeNote: () => void
}

const UIContext = createContext<UIContextValue | undefined>(undefined)

export function UIProvider({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<Document | null>(null)
  const [noteIntent, setNoteIntent] = useState<CreateNoteIntent>(null)

  const openDocument = useCallback((idOrDoc: string | Document) => {
    if (typeof idOrDoc === 'string') {
      const found = DOCUMENTS.find(d => d.id === idOrDoc)
      setDoc(found ?? null)
    } else {
      setDoc(idOrDoc)
    }
  }, [])
  const closeDocument = useCallback(() => setDoc(null), [])

  const openCreateMinuta = useCallback((preset?: { title?: string; body?: string; ref?: string }) => {
    setNoteIntent({
      mode: 'minuta',
      defaultTitle: preset?.title ?? 'Minuta: ',
      defaultBody: preset?.body,
      ref: preset?.ref,
    })
  }, [])
  const openCreateBrief = useCallback((preset?: { title?: string; body?: string; ref?: string }) => {
    setNoteIntent({
      mode: 'brief',
      defaultTitle: preset?.title ?? 'Brief: ',
      defaultBody: preset?.body,
      ref: preset?.ref,
    })
  }, [])
  const closeNote = useCallback(() => setNoteIntent(null), [])

  const value = useMemo(
    () => ({ openDocument, closeDocument, openCreateMinuta, openCreateBrief, closeNote }),
    [openDocument, closeDocument, openCreateMinuta, openCreateBrief, closeNote],
  )

  return (
    <UIContext.Provider value={value}>
      {children}
      <DocumentDetailDrawer
        doc={doc}
        onClose={closeDocument}
        onCreateMinuta={() => {
          if (doc) openCreateMinuta({ title: `Minuta: ${doc.title}`, ref: doc.id })
        }}
      />
      <CreateNoteModal intent={noteIntent} onClose={closeNote} />
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
