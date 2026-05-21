// Glosario contextual extraído del articulado.
// Las leyes suelen definir términos al inicio: "A los efectos de la presente ley,
// se entiende por X a Y" o "Para los fines del presente, se denomina X a Y".
// Detectarlos y exponerlos como tooltips eleva la usabilidad.

import type { NewsItem } from './types'

export type GlossaryEntry = {
  term: string
  definition: string
}

// Patrones cubiertos:
// 1) "se entiende por X a Y" / "se entenderá por X Y"
// 2) "se denomina X a Y" / "se denominará X a Y"
// 3) "X significa Y" (más raro pero presente)
// 4) "se considera X a Y"
const GLOSSARY_PATTERNS = [
  /Se\s+(?:entiende|entender[áa])\s+por\s+([A-Za-zÁÉÍÓÚáéíóúÑñ][\wÁÉÍÓÚáéíóúÑñ\s]{2,40}?)\s+a?\s+(?:la\s+|el\s+|los\s+|las\s+)?([^.;:]{20,300})/g,
  /Se\s+(?:denomina|denominar[áa])\s+([A-Za-zÁÉÍÓÚáéíóúÑñ][\wÁÉÍÓÚáéíóúÑñ\s]{2,40}?)\s+a?\s+([^.;:]{20,300})/g,
  /Se\s+considera\s+([A-Za-zÁÉÍÓÚáéíóúÑñ][\wÁÉÍÓÚáéíóúÑñ\s]{2,40}?)\s+a?\s+([^.;:]{20,300})/g,
]

export function extractGlossary(item: NewsItem): GlossaryEntry[] {
  const text = item.fullText ?? item.excerpt ?? ''
  if (!text) return []
  const out: GlossaryEntry[] = []
  const seen = new Set<string>()

  for (const re of GLOSSARY_PATTERNS) {
    const reGlobal = new RegExp(re.source, re.flags)
    let m: RegExpExecArray | null
    while ((m = reGlobal.exec(text)) !== null && out.length < 15) {
      const term = m[1].trim().replace(/\s+/g, ' ')
      const definition = m[2].trim().replace(/\s+/g, ' ')
      const key = term.toLowerCase()
      if (seen.has(key)) continue
      // Filtros de calidad
      if (term.length < 3 || term.length > 60) continue
      if (definition.length < 20 || definition.length > 280) continue
      if (/^(?:de|del|la|el|los|las|un|una|y|o)\b/i.test(term)) continue
      seen.add(key)
      out.push({ term, definition })
    }
  }
  return out
}
