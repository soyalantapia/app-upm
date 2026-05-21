// Export del Mapa de la Ley a Markdown imprimible.
// Triggera download de un .md file con todo el contexto ensamblado: identificación,
// metadata, resumen, articulado, impacto, sectores, modificaciones, jurisprudencia,
// glosario, similar items, backlinks.

import type { NewsItem } from './types'
import { extractContext } from './extract-context'
import { extractArticleModifications } from './genealogy'
import { detectSectors, SECTOR_META } from './sectors'
import { extractGlossary } from './glossary'
import { computeImpact } from './impact'
import { getFallosForLaw } from './jurisprudencia'
import { matchAuthors } from './legisladores'
import { extractLawNumberFromId, type CitationGraph } from './citations'
import { getNotesForItem } from './notes'
import { countryByCode, topicById } from './data'
import { formatDate } from './format'

export async function exportLawToMarkdown(
  item: NewsItem,
  graph: CitationGraph | null,
): Promise<string> {
  const country = countryByCode(item.country)
  const topic = topicById(item.topic)
  const ctx = extractContext(item.fullText ?? item.excerpt ?? '')
  const mods = extractArticleModifications(item)
  const sectores = detectSectors(item)
  const glossary = extractGlossary(item)
  const impact = computeImpact(item, graph)
  const authors = await matchAuthors(item.authors)
  const lawNum = extractLawNumberFromId(item.id)
  const fallos = lawNum ? await getFallosForLaw(lawNum) : []
  const notes = getNotesForItem(item.id)

  const lines: string[] = []
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

  lines.push(`# ${item.title}`)
  lines.push('')
  lines.push(`> Exportado por **Asistente AI UPM** · ${today}`)
  lines.push('')

  // Identificación
  lines.push('## Identificación')
  lines.push('')
  lines.push(`- **País:** ${country.flag} ${country.name}`)
  lines.push(`- **Tema:** ${topic.label}`)
  lines.push(`- **Tipo:** ${item.tipoDocumento ?? item.type}`)
  lines.push(`- **Relevancia:** ${item.relevance}`)
  lines.push(`- **Publicación:** ${formatDate(item.dataPublicacao ?? item.date)}`)
  if (item.status) lines.push(`- **Estado:** ${item.status}`)
  if (item.authors) lines.push(`- **Autoría:** ${item.authors}`)
  lines.push(`- **Fuente:** ${item.source}`)
  if (item.sourceUrl) lines.push(`- **Documento oficial:** ${item.sourceUrl}`)
  lines.push('')

  // Resumen
  if (ctx.resumen) {
    lines.push('## Resumen ejecutivo')
    lines.push('')
    lines.push(ctx.resumen)
    lines.push('')
    lines.push(`*${ctx.totalPalabras} palabras · Complejidad ${ctx.complejidad}${ctx.articulos.length > 0 ? ` · ${ctx.articulos.length} artículos` : ''}*`)
    lines.push('')
  }

  // Impacto
  lines.push('## Análisis de impacto regulatorio')
  lines.push('')
  lines.push(`**Score:** ${impact.scoreImpacto}/100 · **Etiqueta:** ${impact.scoreLabel.toUpperCase()}`)
  lines.push('')
  lines.push('| Métrica | Valor |')
  lines.push('|---|---|')
  lines.push(`| Modifica artículos | ${impact.articulosModificados} |`)
  lines.push(`| Leyes que cita (out) | ${impact.leyesCitadasOut} |`)
  lines.push(`| Normas que la citan (in) | ${impact.citasIn} |`)
  lines.push(`| Decretos reglamentarios | ${impact.decretosReglamentarios} |`)
  lines.push(`| Resoluciones aplicativas | ${impact.resolucionesAplicativas} |`)
  lines.push(`| Fallos asociados | ${fallos.length} |`)
  lines.push(`| Provincias mencionadas | ${impact.provincias} |`)
  lines.push(`| Organismos | ${impact.organismos} |`)
  lines.push(`| Sectores | ${impact.sectores} |`)
  lines.push('')

  // Autores identificados
  if (authors.length > 0) {
    lines.push('## Legisladores autores identificados')
    lines.push('')
    for (const a of authors) {
      lines.push(`- **${a.name}** · ${a.partido} (${a.provincia}) · ${a.camara}`)
    }
    lines.push('')
  }

  // Organismos
  if (ctx.instituciones.length > 0) {
    lines.push('## Organismos mencionados')
    lines.push('')
    lines.push(ctx.instituciones.join(' · '))
    lines.push('')
  }

  // Sectores
  if (sectores.length > 0) {
    lines.push('## Sectores y actores afectados')
    lines.push('')
    const byCat = new Map<string, string[]>()
    for (const s of sectores) {
      const cat = SECTOR_META[s.category].label
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat)!.push(s.name)
    }
    for (const [cat, names] of byCat) {
      lines.push(`- **${cat}:** ${names.join(', ')}`)
    }
    lines.push('')
  }

  // Lugares y plazos
  if (ctx.provincias.length > 0) {
    lines.push('## Lugares afectados')
    lines.push('')
    lines.push(ctx.provincias.join(' · '))
    lines.push('')
  }
  if (ctx.plazos.length > 0) {
    lines.push('## Plazos')
    lines.push('')
    lines.push(ctx.plazos.join(' · '))
    lines.push('')
  }
  if (ctx.montos.length > 0) {
    lines.push('## Montos')
    lines.push('')
    lines.push(ctx.montos.join(' · '))
    lines.push('')
  }

  // Modificaciones legislativas
  if (mods.length > 0) {
    lines.push('## Modificaciones legislativas que introduce')
    lines.push('')
    for (const m of mods.slice(0, 30)) {
      lines.push(`- **${m.accion}** Art. ${m.articuloDestino} de la Ley ${m.leyDestino}`)
    }
    lines.push('')
  }

  // Articulado
  if (ctx.articulos.length > 0) {
    lines.push('## Articulado')
    lines.push('')
    for (const a of ctx.articulos.slice(0, 15)) {
      lines.push(`### Art. ${a.numero}`)
      lines.push(a.texto)
      lines.push('')
    }
  }

  // Jurisprudencia
  if (fallos.length > 0) {
    lines.push('## Jurisprudencia · CSJN')
    lines.push('')
    for (const f of fallos) {
      lines.push(`### ${f.title}`)
      lines.push(`*${formatDate(f.fecha)} · ${f.sala}*`)
      lines.push('')
      lines.push(f.sumario)
      lines.push('')
      if (f.url) lines.push(`Link: ${f.url}`)
      lines.push('')
    }
  }

  // Glosario
  if (glossary.length > 0) {
    lines.push('## Glosario')
    lines.push('')
    for (const g of glossary) {
      lines.push(`- **${g.term}:** ${g.definition}`)
    }
    lines.push('')
  }

  // Anotaciones del legislador
  if (notes.length > 0) {
    lines.push('## Anotaciones del legislador')
    lines.push('')
    for (const n of notes) {
      lines.push(`### ${new Date(n.updatedAt).toLocaleDateString('es-AR')}`)
      lines.push(n.text)
      if (n.tags.length > 0) {
        lines.push('')
        lines.push(`*Tags: ${n.tags.join(', ')}*`)
      }
      lines.push('')
    }
  }

  // Texto completo
  if (item.fullText) {
    lines.push('---')
    lines.push('## Texto completo')
    lines.push('')
    lines.push(item.fullText)
    lines.push('')
  }

  lines.push('---')
  lines.push(`*Generado por Asistente AI UPM · Datos en vivo de fuentes oficiales · ${today}*`)

  return lines.join('\n')
}

// Helper para gatillar la descarga
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
