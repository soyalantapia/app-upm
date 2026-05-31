// humanizeSourceUrl · convierte URLs de APIs / datos abiertos en páginas
// legibles para una persona, o las oculta si no hay equivalente humano.
//
// Problema: varias fuentes (eventos-br, votações-br…) caen al `uri` de la
// API cuando no hay URL pública, así que "ver fuente" abría un JSON crudo
// en vez de una página. Esta función se aplica en los puntos de render.

export function humanizeSourceUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  const u = url.trim()
  if (!u) return undefined

  // Câmara dos Deputados (Brasil) · datos abiertos → página pública
  let m = u.match(/dadosabertos\.camara\.leg\.br\/api\/v2\/eventos\/(\d+)/i)
  if (m) return `https://www.camara.leg.br/evento-legislativo/${m[1]}`
  m = u.match(/dadosabertos\.camara\.leg\.br\/api\/v2\/proposicoes\/(\d+)/i)
  if (m) return `https://www.camara.leg.br/propostas-legislativas/${m[1]}`
  m = u.match(/dadosabertos\.camara\.leg\.br\/api\/v2\/orgaos\/(\d+)/i)
  if (m) return `https://www.camara.leg.br/orgaos/${m[1]}`

  // Cualquier otro endpoint de API / datos abiertos no es legible → ocultar
  if (/\/api\/v\d|dadosabertos\.|legis\.senado\.leg\.br\/dadosabertos|\.json(\?|$)/i.test(u)) {
    return undefined
  }

  return u
}
