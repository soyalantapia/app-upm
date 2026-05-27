// pt-es · Diccionario mínimo de términos legislativos portugués → español.
// No reemplaza traducción profesional; ayuda al legislador hispanohablante
// a entender títulos brasileros sin tener que abrirlos.
//
// Se aplica como traducción "augmentada": el título original se mantiene
// (Sessão Não Deliberativa Solene), pero al hover/aside aparece la
// traducción aproximada ("Sesión No Deliberativa Solemne").

const DICT: [RegExp, string][] = [
  // Verbos / acciones
  [/\bsess[ãa]o\b/gi, 'sesión'],
  [/\baudi[eê]ncia\b/gi, 'audiencia'],
  [/\breuni[ãa]o\b/gi, 'reunión'],
  [/\bvotação\b/gi, 'votación'],
  [/\bvota[ãa]o\b/gi, 'votación'],
  [/\baprovação\b/gi, 'aprobación'],
  [/\bsanção\b/gi, 'sanción'],
  [/\bemenda\b/gi, 'enmienda'],
  [/\bprojeto\b/gi, 'proyecto'],
  [/\bsubstitutivo\b/gi, 'sustitutivo'],
  [/\brelat(or|ora)\b/gi, 'relator/a'],

  // Cuerpos / instituciones
  [/\bC[âa]mara\s+dos\s+Deputados\b/gi, 'Cámara de Diputados'],
  [/\bSenado\s+Federal\b/gi, 'Senado Federal'],
  [/\bMinist[ée]rio\s+P[úu]blico\b/gi, 'Ministerio Público'],
  [/\bComiss[ãa]o\b/gi, 'Comisión'],
  [/\bPoder\s+Executivo\b/gi, 'Poder Ejecutivo'],
  [/\bCongresso\s+Nacional\b/gi, 'Congreso Nacional'],

  // Documentos
  [/\bLei\b/gi, 'Ley'],
  [/\bDecreto\b/gi, 'Decreto'],
  [/\bResolução\b/gi, 'Resolución'],
  [/\bPortaria\b/gi, 'Resolución'],
  [/\bMedida\s+Provis[óo]ria\b/gi, 'Medida Provisoria'],

  // Calificadores
  [/\bSolene\b/gi, 'Solemne'],
  [/\bN[ãa]o\s+Deliberativa\b/gi, 'No Deliberativa'],
  [/\bExtraordin[áa]ria\b/gi, 'Extraordinaria'],
  [/\bOrdin[áa]ria\b/gi, 'Ordinaria'],

  // Temas frecuentes
  [/\bMeio\s+Ambiente\b/gi, 'Medio Ambiente'],
  [/\bEduca[çc][ãa]o\b/gi, 'Educación'],
  [/\bSa[úu]de\b/gi, 'Salud'],
  [/\bSeguran[çc]a\b/gi, 'Seguridad'],
  [/\bRodovi[áa]rio\b/gi, 'Rutas'],
  [/\bRodovi[áa]ria\b/gi, 'Vial'],
  [/\bTrabalhador(es|as)?\b/gi, 'Trabajador/es'],
  [/\bTransport(es?)\b/gi, 'Transporte'],

  // Pequeñas palabras
  [/\baos?\b/gi, 'a los'],
  [/\bda\b/g, 'de la'],
  [/\bdo\b/g, 'del'],
  [/\bdas\b/g, 'de las'],
  [/\bdos\b/g, 'de los'],
  [/\be\b/g, 'y'],
]

const PT_HINT = /(çã|ção|tação|õe|ção|Pública|Não|São|seu|sua|seus|suas|pelos|pelas|aos)\b/

/**
 * Traduce aproximadamente un texto en portugués al español.
 * Conservador: solo modifica si detecta marcadores claros de PT.
 */
export function translatePtEs(text: string | undefined | null): string {
  if (!text) return ''
  if (!PT_HINT.test(text)) return text  // probablemente ya está en ES
  let out = text
  for (const [re, replacement] of DICT) {
    out = out.replace(re, replacement)
  }
  return out
}

/**
 * Detecta si un texto parece estar en portugués.
 */
export function looksPortuguese(text: string | undefined | null): boolean {
  return !!text && PT_HINT.test(text)
}
