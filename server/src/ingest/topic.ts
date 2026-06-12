import type { Topic } from '../types.js'

// Portado 1:1 del worker (worker/src/index.ts, detectTopic).
// Clasificador heurístico ES/PT → Topic del enum cerrado.
export function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|polui/i.test(t)) return 'ambiente'
  if (/corredor|biocean|infraestrutur/i.test(t)) return 'corredores-bioceanicos'
  if (/integra|mercosul|mercosur|cooperac/i.test(t)) return 'integracion-regional'
  if (/g[eê]nero|paridad/i.test(t)) return 'genero'
  if (/educac|ensino/i.test(t)) return 'educacion'
  if (/sa[uú]de|sanitar|salud/i.test(t)) return 'salud'
  if (/energia|el[ée]tric/i.test(t)) return 'energia'
  if (/internacional|tratado/i.test(t)) return 'rrii'
  if (/seguranc|seguridad|fronter/i.test(t)) return 'seguridad'
  if (/com[eé]rcio|tribut|fiscal/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}
