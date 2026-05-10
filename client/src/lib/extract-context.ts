// Motor de extracción de contexto sobre el fullText de una norma.
//
// Sin AI, sin nuevas APIs. Solo regex + diccionarios sobre el texto pre-cargado.
// Resultado: 8 capas adicionales de información por item para enriquecer el detalle.

export type ExtractedContext = {
  resumen?: string                              // primer párrafo significativo
  articulos: { numero: string; texto: string }[]
  decretos: string[]                            // ej "DNU 55/23", "Decreto 452/25"
  resoluciones: string[]                        // ej "RESOL-2024-690-APN-DIRECTORIO#ENARGAS"
  leyesCitadas: string[]                        // números de ley
  montos: string[]                              // ej "$50.000.000", "USD 100/mes"
  plazos: string[]                              // ej "30 días", "DIEZ (10) días hábiles", "5 años"
  provincias: string[]                          // provincias AR, países Mercosur
  instituciones: string[]                       // organismos del Estado
  totalPalabras: number
  complejidad: 'simple' | 'media' | 'compleja'
}

// Provincias argentinas + países Mercosur ampliado
const PROVINCIAS_AR = [
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Ciudad Autónoma de Buenos Aires', 'CABA',
  'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis',
  'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
]
const PAISES_MERCOSUR = [
  'Argentina', 'Brasil', 'Uruguay', 'Paraguay', 'Chile', 'Bolivia', 'Perú', 'Colombia',
  'MERCOSUR', 'MERCOSUL',
]

// Diccionario de instituciones argentinas comunes
const INSTITUCIONES = [
  'Ministerio de Economía', 'Ministerio de Salud', 'Ministerio de Justicia',
  'Ministerio del Interior', 'Ministerio de Seguridad', 'Ministerio de Defensa',
  'Ministerio de Capital Humano', 'Ministerio de Relaciones Exteriores',
  'Jefatura de Gabinete', 'Poder Ejecutivo Nacional', 'Honorable Congreso',
  'Cámara de Diputados', 'Senado',
  'BCRA', 'Banco Central de la República Argentina',
  'AFIP', 'ARCA', 'ANMAT', 'ANSES', 'CNV', 'ENRE', 'ENARGAS', 'ENACOM',
  'Corte Suprema', 'Procuración', 'Defensoría',
  'Secretaría de Energía', 'Secretaría de Comercio',
  'Boletín Oficial', 'BORA',
  // Brasil
  'Câmara dos Deputados', 'Senado Federal', 'STF', 'TSE',
  // Uruguay
  'Asamblea General', 'Cámara de Senadores', 'Cámara de Representantes', 'IMPO',
  // Colombia
  'DAPRE', 'Presidencia de la República', 'Función Pública',
]

export function extractContext(fullText: string | undefined): ExtractedContext {
  const text = (fullText ?? '').trim()
  if (!text) {
    return {
      articulos: [], decretos: [], resoluciones: [], leyesCitadas: [],
      montos: [], plazos: [], provincias: [], instituciones: [],
      totalPalabras: 0, complejidad: 'simple',
    }
  }

  return {
    resumen: extractResumen(text),
    articulos: extractArticulos(text),
    decretos: dedupe(extractDecretos(text), 12),
    resoluciones: dedupe(extractResoluciones(text), 8),
    leyesCitadas: dedupe(extractLeyesCitadas(text), 12),
    montos: dedupe(extractMontos(text), 8),
    plazos: dedupe(extractPlazos(text), 8),
    provincias: dedupe(extractProvincias(text), 12),
    instituciones: dedupe(extractInstituciones(text), 12),
    totalPalabras: text.split(/\s+/).length,
    complejidad: computeComplejidad(text),
  }
}

function dedupe(arr: string[], max: number): string[] {
  return Array.from(new Set(arr.map(s => s.trim()).filter(Boolean))).slice(0, max)
}

// 1. Resumen ejecutivo: primer párrafo de >100 chars después del VISTO o
// directamente desde el inicio si no hay VISTO.
function extractResumen(text: string): string {
  // Buscar "RESUELVE:" o "DECRETAN:" y tomar lo que sigue
  const resuelveMatch = text.match(/(?:RESUELVE|DECRETAN|DECRETA|DISPONE)\s*:?\s*([\s\S]{50,500}?)(?:Artículo|ARTÍCULO|ART\.|$)/)
  if (resuelveMatch) {
    return resuelveMatch[1].trim().replace(/\s+/g, ' ').slice(0, 400)
  }
  // Buscar el primer Artículo 1° y tomar su primera oración
  const art1Match = text.match(/(?:Artículo|ARTÍCULO|Art\.)\s*1[°º\.\s]+(.{40,300}?)(?:[\.;]\s|\n\n)/)
  if (art1Match) {
    return art1Match[1].trim().replace(/\s+/g, ' ').slice(0, 400)
  }
  // Fallback: primer párrafo no-trivial
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 80 && !/^VISTO/i.test(p))
  if (paragraphs[0]) return paragraphs[0].replace(/\s+/g, ' ').slice(0, 400)
  return text.replace(/\s+/g, ' ').slice(0, 300)
}

// 2. Articulado: lista de artículos con su texto
function extractArticulos(text: string): { numero: string; texto: string }[] {
  const out: { numero: string; texto: string }[] = []
  // Patrón: "Artículo 1°", "ARTÍCULO 2°", "Art. 3" — captura número + el texto que sigue
  const re = /(?:Artículo|ARTÍCULO|ART\.|Art\.)\s*(\d{1,3})[°º\.\s]+([\s\S]+?)(?=(?:Artículo|ARTÍCULO|ART\.|Art\.)\s*\d{1,3}[°º\.\s]|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null && out.length < 30) {
    const numero = m[1]
    const cuerpo = m[2].trim().replace(/\s+/g, ' ').slice(0, 600)
    if (cuerpo.length >= 20) {
      out.push({ numero, texto: cuerpo })
    }
  }
  return out
}

// 3. Decretos: "Decreto N° 1738/92", "DNU N° 55/23", "Decreto 452/25"
function extractDecretos(text: string): string[] {
  const re = /(?:DNU|Decreto)(?:\s+de\s+Necesidad\s+y\s+Urgencia)?\s+(?:N[°º\.]?\s*)?(\d{1,5}\s*\/\s*\d{2,4})/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const num = m[1].replace(/\s/g, '')
    const isDnu = /DNU/i.test(m[0])
    out.push(`${isDnu ? 'DNU' : 'Decreto'} ${num}`)
  }
  return out
}

// 4. Resoluciones: "RESOL-2024-690-APN-DIRECTORIO#ENARGAS", "Resolución N° 6/22"
function extractResoluciones(text: string): string[] {
  const out: string[] = []
  // Patrón formal RESOL-YYYY-NNN-APN
  const re1 = /RESOL[\-\s]?(\d{4})[\-\s]?(\d{1,5})[\-\s]?APN[\-\s]?[A-Z\#]+/gi
  let m: RegExpExecArray | null
  while ((m = re1.exec(text)) !== null) out.push(m[0].slice(0, 60))
  // Patrón clásico "Resolución N° 6/22"
  const re2 = /Resoluci[óo]n(?:es)?\s+(?:N[°º\.]?\s*)?(\d{1,5}\s*\/\s*\d{2,4})/gi
  while ((m = re2.exec(text)) !== null) out.push(`Resolución ${m[1].replace(/\s/g, '')}`)
  return out
}

// 5. Leyes citadas: "Ley N° 24.076", "Leyes N° 24.076 y N° 27.742"
function extractLeyesCitadas(text: string): string[] {
  const re = /Ley(?:es)?\s*[\s\n]*(?:N[°º\.\s]*)?(\d{1,2}[\.\s]?\d{3,4})/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const num = m[1].replace(/[\.\s]/g, '')
    if (num.length >= 4 && num.length <= 5) out.push(`Ley ${num}`)
  }
  return out
}

// 6. Montos económicos
function extractMontos(text: string): string[] {
  const out: string[] = []
  // USD / dólares / U$S
  const reUSD = /(?:USD|U\$S|US\$|dólares?)\s*([\d\.,]+(?:\s*(?:millones?|mil|millardo))?)/gi
  // Pesos / $ ARS
  const rePesos = /\$\s*([\d\.,]+)|(?:ARS|pesos?)\s*([\d\.,]+(?:\s*(?:millones?|mil))?)/gi
  // Reais
  const reReais = /R\$\s*([\d\.,]+)/g
  let m: RegExpExecArray | null
  while ((m = reUSD.exec(text)) !== null) out.push(`USD ${m[1].trim()}`)
  while ((m = rePesos.exec(text)) !== null) out.push(`$${(m[1] ?? m[2]).trim()}`)
  while ((m = reReais.exec(text)) !== null) out.push(`R$ ${m[1].trim()}`)
  return out
}

// 7. Plazos
function extractPlazos(text: string): string[] {
  const out: string[] = []
  // "30 días", "DIEZ (10) días", "5 años", "noventa (90) días"
  const re = /(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s*\()?(\d{1,4})\)?\s*(d[ií]as|meses|años|semanas|horas)\s*(h[áa]biles|corridos|naturales)?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const num = m[1]
    const unidad = m[2].toLowerCase().replace('í', 'i').replace('ñ', 'n')
    const tipo = m[3] ? ' ' + m[3] : ''
    if (parseInt(num) > 0 && parseInt(num) < 10000) {
      out.push(`${num} ${unidad}${tipo}`)
    }
  }
  return out
}

// 8. Provincias y regiones
function extractProvincias(text: string): string[] {
  const out: string[] = []
  for (const p of PROVINCIAS_AR) {
    if (new RegExp(`\\b${escapeRegex(p)}\\b`, 'i').test(text)) out.push(p)
  }
  for (const p of PAISES_MERCOSUR) {
    if (new RegExp(`\\b${escapeRegex(p)}\\b`, 'i').test(text)) out.push(p)
  }
  return out
}

// 9. Instituciones del Estado
function extractInstituciones(text: string): string[] {
  const out: string[] = []
  for (const inst of INSTITUCIONES) {
    if (new RegExp(`\\b${escapeRegex(inst)}\\b`, 'i').test(text)) out.push(inst)
  }
  return out
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Score de complejidad: simple/media/compleja según largo y vocabulario técnico
function computeComplejidad(text: string): 'simple' | 'media' | 'compleja' {
  const words = text.split(/\s+/).length
  const tecnicismos = (text.match(/\b(?:considerando|disposición|mediante|dispónese|dispuesto|en virtud|sustitúyese|deróguese|prorrogar|reglamenta)\b/gi) ?? []).length
  if (words > 1500 || tecnicismos > 8) return 'compleja'
  if (words > 500 || tecnicismos > 3) return 'media'
  return 'simple'
}
