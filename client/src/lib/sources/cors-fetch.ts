// Fetch helper que intenta directo y si falla por CORS retry con proxy público.
// corsproxy.io es free tier, sin registro. Si cae, otro fallback es allorigins.win.
//
// IMPORTANTE: este helper es solo para APIs gubernamentales públicas — no usar
// con datos sensibles porque pasan por un tercero.

const PROXIES = [
  // codetabs primero porque acepta payloads grandes (>1MB) y suele responder rápido
  (u: string) => `https://api.codetabs.com/v1/proxy?quest=${u}`,
  (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
]

export async function fetchWithCorsFallback(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  // Intento directo primero
  try {
    const r = await fetch(url, init)
    if (r.ok) return r
    // Si la respuesta no es ok pero llegó (no fue CORS), devolver y dejar que el caller decida
    return r
  } catch {
    // Falló por CORS o red — probamos con proxies
    for (const proxy of PROXIES) {
      try {
        const r = await fetch(proxy(url), init)
        if (r.ok) return r
      } catch {
        // siguiente proxy
      }
    }
    throw new Error(`No se pudo acceder a ${url} ni vía proxies`)
  }
}
