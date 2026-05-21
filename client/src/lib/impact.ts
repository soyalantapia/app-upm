// Análisis de impacto cuantitativo · combina extract-context + citations + genealogy
// + sectors en un único score con métricas accionables para legisladores.

import type { NewsItem } from './types'
import type { CitationGraph } from './citations'
import { extractLawNumberFromId } from './citations'
import { extractContext } from './extract-context'
import { extractArticleModifications, type ArticleModification } from './genealogy'
import { detectSectors, type Sector } from './sectors'

export type ImpactReport = {
  // Conexiones cuantitativas
  articulosModificados: number    // genealogía outbound
  leyesCitadasOut: number          // leyes que esta cita
  citasIn: number                  // normas que citan a esta (backlinks)
  decretosReglamentarios: number   // backlinks tipo decreto
  resolucionesAplicativas: number  // backlinks tipo resolución
  fallosAsociados: number          // jurisprudencia (placeholder, Tier 2A)

  // Alcance
  provincias: number
  organismos: number
  sectores: number
  paisesMencionados: number

  // Magnitud
  montos: string[]                 // primeros 5 montos detectados
  plazos: string[]                 // primeros 5 plazos detectados
  totalPalabras: number

  // Modificaciones específicas (outbound)
  modificaciones: ArticleModification[]
  // Sectores detectados (lista completa)
  sectoresDetectados: Sector[]

  // Score agregado 0-100
  scoreImpacto: number
  scoreLabel: 'masivo' | 'alto' | 'medio' | 'acotado'
}

export function computeImpact(item: NewsItem, graph: CitationGraph | null): ImpactReport {
  const ctx = extractContext(item.fullText ?? item.excerpt ?? '')
  const mods = extractArticleModifications(item)
  const sectores = detectSectors(item)

  // Backlinks · solo si la norma es una ley nacional
  const num = extractLawNumberFromId(item.id)
  const backlinks = num && graph ? graph.backlinks.get(num) ?? [] : []
  const citingItems = backlinks.map(b => b.item)
  const decretosReg = citingItems.filter(it => it.type === 'decreto').length
  const resolApp = citingItems.filter(it => /resoluci|resol/i.test(it.tipoDocumento ?? '')).length

  // Países mencionados (de extract-context.provincias que incluye Mercosur)
  const paisesMencionados = ctx.provincias.filter(p =>
    /Brasil|Uruguay|Argentina|Paraguay|Chile|Bolivia|Per[úu]|Colombia|MERCOSUR|MERCOSUL/i.test(p),
  ).length

  // Score · ponderado por las dimensiones de impacto
  let score = 0
  score += Math.min(mods.length * 3, 30)              // hasta 30 pts por modificaciones
  score += Math.min(citingItems.length * 2, 25)       // hasta 25 pts por backlinks
  score += Math.min(ctx.leyesCitadas.length * 2, 15)  // hasta 15 pts por outbound
  score += Math.min(sectores.length * 2, 15)          // hasta 15 pts por sectores
  score += Math.min(ctx.provincias.length, 8)         // hasta 8 pts por alcance geo
  score += Math.min(ctx.instituciones.length, 7)      // hasta 7 pts por organismos

  const scoreLabel = score >= 70 ? 'masivo' : score >= 40 ? 'alto' : score >= 20 ? 'medio' : 'acotado'

  return {
    articulosModificados: mods.length,
    leyesCitadasOut: ctx.leyesCitadas.length,
    citasIn: citingItems.length,
    decretosReglamentarios: decretosReg,
    resolucionesAplicativas: resolApp,
    fallosAsociados: 0, // hasta que Tier 2A esté listo
    provincias: ctx.provincias.length,
    organismos: ctx.instituciones.length,
    sectores: sectores.length,
    paisesMencionados,
    montos: ctx.montos.slice(0, 5),
    plazos: ctx.plazos.slice(0, 5),
    totalPalabras: ctx.totalPalabras,
    modificaciones: mods,
    sectoresDetectados: sectores,
    scoreImpacto: Math.min(score, 100),
    scoreLabel,
  }
}
