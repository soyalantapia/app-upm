// Detección de contenido placeholder / scrapeado en el corpus de leyes.
//
// Parte del corpus trae (a) excerpts que son el menú de la web fuente
// ("Leteral primer nivel Documentos y Leyes…") y (b) "texto íntegro" que
// en realidad es una plantilla sin rellenar ("[NOMBRE], Presidente.
// [MINISTERIO DE…]"). Mostrar eso como real rompe la confianza. Estas
// helpers permiten ocultarlo y mostrar un mensaje honesto en su lugar.

const BOILERPLATE_MARKERS = [
  /Leteral primer nivel/i,
  /B[uú]squeda de Documentos y Leyes/i,
  /Diarios de Sesiones Repartidos/i,
  /Documentos y Leyes\s+B[uú]squeda/i,
  /Constituci[oó]n de la Rep[uú]blica\s+Leyes\s+Documentos/i,
]

/**
 * True si el texto es placeholder/scrapeado y NO debería mostrarse como real.
 * Detecta plantillas con marcadores entre corchetes ([NOMBRE], [MINISTERIO…])
 * y el "chrome" de navegación scrapeado de las webs fuente.
 */
export function isPlaceholderText(text?: string | null): boolean {
  if (!text) return true
  const t = text.trim()
  if (t.length < 8) return true
  // Plantilla sin rellenar: 2+ marcadores tipo [NOMBRE] / [MINISTERIO DE …] / [fecha]
  const brackets = t.match(/\[[^\]]{2,}\]/g) || []
  if (brackets.length >= 2) return true
  // Chrome de navegación scrapeado de la web fuente
  if (BOILERPLATE_MARKERS.some(re => re.test(t))) return true
  return false
}

/** Devuelve el texto si es real, o '' si es placeholder/vacío. */
export function realTextOrEmpty(text?: string | null): string {
  return isPlaceholderText(text) ? '' : (text ?? '').trim()
}
