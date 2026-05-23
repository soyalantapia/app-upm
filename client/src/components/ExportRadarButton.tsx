import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, Check } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import { countryByCode, topicById } from '@/lib/data'
import { formatDate } from '@/lib/format'

// ExportRadarButton · descarga el listado filtrado del Radar
// en formato CSV (Excel-compatible) o Markdown (para briefing).

function escapeCSV(value: string): string {
  // RFC 4180: si contiene coma, comilla o salto de línea, envolver en comillas
  // y escapar comillas internas con doble comilla.
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

function buildCSV(items: NewsItem[]): string {
  const headers = ['id', 'fecha', 'pais', 'tema', 'tipo', 'relevancia', 'titulo', 'fuente', 'estado', 'url']
  const rows = items.map(n => {
    const c = countryByCode(n.country)
    const t = topicById(n.topic)
    return [
      n.id,
      formatDate(n.dataPublicacao ?? n.date),
      c.name,
      t.label,
      n.type,
      n.relevance,
      n.title,
      n.source ?? '',
      n.status ?? '',
      n.sourceUrl ?? '',
    ].map(v => escapeCSV(String(v ?? ''))).join(',')
  })
  return [headers.join(','), ...rows].join('\n')
}

function buildMarkdown(items: NewsItem[]): string {
  const lines: string[] = []
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  lines.push(`# Radar UPM · ${items.length} normas`)
  lines.push(`> Exportado el ${today}`)
  lines.push('')
  for (const n of items.slice(0, 100)) {
    const c = countryByCode(n.country)
    const t = topicById(n.topic)
    lines.push(`## ${c.flag} ${n.title}`)
    lines.push(`**Fecha:** ${formatDate(n.dataPublicacao ?? n.date)} · **País:** ${c.name} · **Tema:** ${t.label} · **Relevancia:** ${n.relevance}`)
    if (n.source) lines.push(`**Fuente oficial:** ${n.source}`)
    if (n.status) lines.push(`**Estado:** ${n.status}`)
    if (n.excerpt) lines.push(`\n${n.excerpt}`)
    if (n.sourceUrl) lines.push(`\n[Ver fuente original](${n.sourceUrl})`)
    lines.push('\n---\n')
  }
  if (items.length > 100) {
    lines.push(`\n_+ ${items.length - 100} normas adicionales no incluidas en el export markdown._`)
  }
  return lines.join('\n')
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function ExportRadarButton({ items, disabled }: { items: NewsItem[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<'csv' | 'md' | null>(null)

  const handle = (format: 'csv' | 'md') => {
    const ts = new Date().toISOString().slice(0, 10)
    if (format === 'csv') {
      downloadBlob(buildCSV(items), `radar-upm-${ts}.csv`, 'text/csv')
    } else {
      downloadBlob(buildMarkdown(items), `radar-upm-${ts}.md`, 'text/markdown')
    }
    setDone(format)
    setTimeout(() => { setDone(null); setOpen(false) }, 1200)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled || items.length === 0}
        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-bold text-ink-700 ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:bg-upm-50 hover:text-upm-700 disabled:opacity-50 disabled:hover:translate-y-0"
        title={`Exportar las ${items.length} normas filtradas`}
      >
        <Download size={12} /> Exportar ({items.length})
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-2xl bg-white p-1 ring-1 ring-ink-100 shadow-floating">
          <button
            onClick={() => handle('csv')}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] text-ink-700 transition hover:bg-upm-50 hover:text-upm-700"
          >
            <FileSpreadsheet size={14} />
            <div className="flex-1">
              <div className="font-bold">Excel · CSV</div>
              <div className="text-[10.5px] text-ink-500">Para análisis tabular</div>
            </div>
            {done === 'csv' && <Check size={12} className="text-success" />}
          </button>
          <button
            onClick={() => handle('md')}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] text-ink-700 transition hover:bg-upm-50 hover:text-upm-700"
          >
            <FileText size={14} />
            <div className="flex-1">
              <div className="font-bold">Briefing · Markdown</div>
              <div className="text-[10.5px] text-ink-500">Top 100 normas con resumen</div>
            </div>
            {done === 'md' && <Check size={12} className="text-success" />}
          </button>
        </div>
      )}
    </div>
  )
}
