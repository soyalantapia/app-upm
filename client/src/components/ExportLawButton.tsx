import { Download } from 'lucide-react'
import { useState } from 'react'
import { exportLawToMarkdown, downloadMarkdown } from '@/lib/export-law'
import { useCitationGraph } from '@/lib/use-citations'
import { store } from '@/lib/store'
import type { NewsItem } from '@/lib/types'

export function ExportLawButton({ item, variant = 'default' }: { item: NewsItem; variant?: 'default' | 'compact' }) {
  const { graph } = useCitationGraph()
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    setBusy(true)
    try {
      const md = await exportLawToMarkdown(item, graph)
      const safeTitle = item.title
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 60)
      downloadMarkdown(`${safeTitle}.md`, md)
      store.pushToast('success', 'Mapa de la Ley exportado en Markdown')
    } catch (e) {
      store.pushToast('danger', 'Error al exportar')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleExport}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700 disabled:opacity-50"
        title="Exportar Mapa de la Ley a Markdown imprimible"
      >
        <Download size={12} /> {busy ? 'Exportando…' : 'Exportar .md'}
      </button>
    )
  }

  return (
    <button
      onClick={handleExport}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-upm-700 ring-1 ring-upm-200 shadow-cta hover:-translate-y-0.5 hover:bg-upm-50 disabled:opacity-50"
    >
      <Download size={12} /> {busy ? 'Exportando…' : 'Exportar Markdown'}
    </button>
  )
}
