// Detección de sectores y actores económicos/sociales mencionados en el texto.
// Va más allá del diccionario INSTITUCIONES (que solo cubre Estado) e incluye:
// · empresas reguladas (energía, transporte, telecom, salud)
// · sindicatos
// · cámaras empresarias
// · universidades
// · sectores económicos genéricos (industria, agro, minería)

import type { NewsItem } from './types'

export type Sector = {
  name: string
  category: SectorCategory
}

export type SectorCategory =
  | 'empresa-energia'
  | 'empresa-transporte'
  | 'empresa-telecom'
  | 'empresa-financiera'
  | 'empresa-otras'
  | 'sindicato'
  | 'camara-empresaria'
  | 'universidad'
  | 'sector-economico'
  | 'sociedad-civil'

// Diccionarios cuidadosamente curados · solo entidades públicamente identificables.
// Se hacen matchear con \b word boundaries (case-insensitive).
const DICT: Record<SectorCategory, string[]> = {
  'empresa-energia': [
    'YPF', 'IEASA', 'CAMMESA', 'ENARSA', 'Edenor', 'Edesur', 'Edelap',
    'TGS', 'TGN', 'Transener', 'Pampa Energía', 'Central Puerto', 'Albanesi',
    'Petrobras', 'Eletrobras', 'Cemig', 'CPFL', 'EDP',
    'UTE Uruguay', 'ANCAP', 'OSE',
    'Ecopetrol', 'EPM Colombia',
  ],
  'empresa-transporte': [
    'Aerolíneas Argentinas', 'Trenes Argentinos', 'SOFSE', 'ADIF',
    'Autopistas del Sol', 'Subterráneos de Buenos Aires', 'Metrovías',
    'AySA', 'Vialidad Nacional', 'DNV',
    'Embraer', 'TAM', 'LATAM', 'GOL', 'Azul',
    'COPSA Uruguay',
  ],
  'empresa-telecom': [
    'Telefónica', 'Movistar', 'Claro', 'Telecom Argentina', 'Personal',
    'Telecentro', 'DirecTV', 'Cablevisión', 'Flow',
    'Antel Uruguay',
    'Vivo', 'TIM Brasil', 'Oi Brasil',
  ],
  'empresa-financiera': [
    'Banco Nación', 'Banco Provincia', 'Banco Ciudad', 'Banco Macro',
    'Banco Galicia', 'BBVA', 'Santander', 'HSBC', 'ICBC',
    'BNDES', 'Banco do Brasil', 'Caixa Econômica', 'Itaú', 'Bradesco',
    'BROU Uruguay', 'República Microfinanzas',
    'BID', 'BIRF', 'CAF', 'FONPLATA', 'Banco Mundial', 'FMI',
  ],
  'empresa-otras': [
    'Techint', 'Aceitera General Deheza', 'Arcor', 'Mercado Libre',
    'Globant', 'Vista Energy', 'Pan American Energy',
    'Vale', 'Embraer', 'Petrobras',
    'Conaprole', 'Tienda Inglesa',
  ],
  sindicato: [
    'CGT', 'CTA', 'CTERA', 'ATE', 'UPCN', 'UOM', 'UOCRA', 'AOMA',
    'SMATA', 'FATSA', 'UPA', 'UTA', 'Camioneros', 'La Bancaria',
    'Foetra', 'Luz y Fuerza', 'APUBA',
    'CUT Brasil', 'Força Sindical',
    'PIT-CNT Uruguay',
    'CUT Colombia', 'CGT Colombia',
  ],
  'camara-empresaria': [
    'UIA', 'CAME', 'AEA', 'CGE', 'AFARTE', 'CAFCO',
    'SRA', 'CRA', 'FAA', 'CONINAGRO',
    'ABA', 'ADEBA', 'Bolsa de Comercio',
    'AmCham', 'IDEA', 'Cámara de Comercio Argentino-Brasileña',
    'CNI Brasil', 'Fiesp', 'Firjan',
    'Cámara de Industrias Uruguay',
  ],
  universidad: [
    'UBA', 'UNLP', 'UNC', 'UNS', 'UNCuyo', 'UNT', 'UNNE', 'UNL', 'UNSAM',
    'UNGS', 'UNQ', 'UNDAV', 'UTN', 'UNAJ', 'UNLAM',
    'CONICET', 'INTA', 'INTI', 'CONAE', 'CONEAU',
    'USP', 'UNICAMP', 'UFRJ', 'UnB',
    'UdelaR', 'UTEC Uruguay',
    'Universidad Nacional', 'Universidad de los Andes', 'Universidad del Rosario',
  ],
  'sector-economico': [
    'industria automotriz', 'industria farmacéutica', 'industria textil',
    'sector agropecuario', 'sector agroindustrial', 'minería', 'petroquímica',
    'sector energético', 'sector financiero', 'sector salud',
    'sector turismo', 'sector tecnológico', 'economía del conocimiento',
    'pesca', 'forestal', 'metalúrgica', 'siderurgia',
    'biotecnología', 'litio', 'gas natural', 'energías renovables',
  ],
  'sociedad-civil': [
    'Amnistía Internacional', 'Human Rights Watch', 'Greenpeace',
    'Cáritas', 'Cruz Roja', 'Médicos Sin Fronteras',
    'CELS', 'ACIJ', 'Poder Ciudadano', 'Fundación Vía Libre',
  ],
}

// Pre-compilar regex de cada entrada (escape de specials + word boundaries)
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const COMPILED: { name: string; category: SectorCategory; re: RegExp }[] = []
for (const [cat, names] of Object.entries(DICT) as [SectorCategory, string[]][]) {
  for (const name of names) {
    COMPILED.push({
      name,
      category: cat,
      re: new RegExp(`\\b${escapeRegex(name)}\\b`, 'i'),
    })
  }
}

// Cache por id para evitar re-detección. SmartCard hace detectSectors en cada
// item del Radar; sin cache, cada keystroke en search ejecuta 60+ regex × 1700 items.
const SECTORS_CACHE = new Map<string, Sector[]>()
const MAX_SECTORS_CACHE = 3000

export function detectSectors(item: NewsItem): Sector[] {
  const cached = SECTORS_CACHE.get(item.id)
  if (cached) return cached

  const text = `${item.title ?? ''}\n${item.fullText ?? item.excerpt ?? ''}`
  if (!text) return []
  const found: Sector[] = []
  const seen = new Set<string>()
  for (const c of COMPILED) {
    if (!c.re.test(text)) continue
    const key = `${c.category}|${c.name}`
    if (seen.has(key)) continue
    seen.add(key)
    found.push({ name: c.name, category: c.category })
    if (found.length >= 25) break
  }

  if (SECTORS_CACHE.size >= MAX_SECTORS_CACHE) {
    const keys = Array.from(SECTORS_CACHE.keys()).slice(0, Math.floor(MAX_SECTORS_CACHE * 0.3))
    for (const k of keys) SECTORS_CACHE.delete(k)
  }
  SECTORS_CACHE.set(item.id, found)
  return found
}

export const SECTOR_META: Record<SectorCategory, { label: string; emoji: string; color: string }> = {
  'empresa-energia': { label: 'Energía', emoji: '⚡', color: 'bg-warning-bg/40 text-warning-fg ring-warning-bg' },
  'empresa-transporte': { label: 'Transporte', emoji: '🚂', color: 'bg-upm-50 text-upm-700 ring-upm-100' },
  'empresa-telecom': { label: 'Telecom', emoji: '📡', color: 'bg-info-bg/40 text-info-fg ring-info-bg' },
  'empresa-financiera': { label: 'Finanzas', emoji: '🏦', color: 'bg-success-bg/40 text-success-fg ring-success-bg' },
  'empresa-otras': { label: 'Empresa', emoji: '🏢', color: 'bg-ink-50 text-ink-700 ring-ink-100' },
  sindicato: { label: 'Sindicato', emoji: '✊', color: 'bg-danger-bg/40 text-danger-fg ring-danger-bg' },
  'camara-empresaria': { label: 'Cámara', emoji: '🤝', color: 'bg-upm-50 text-upm-700 ring-upm-100' },
  universidad: { label: 'Universidad', emoji: '🎓', color: 'bg-info-bg/40 text-info-fg ring-info-bg' },
  'sector-economico': { label: 'Sector', emoji: '📊', color: 'bg-ink-50 text-ink-700 ring-ink-100' },
  'sociedad-civil': { label: 'Sociedad civil', emoji: '🌐', color: 'bg-success-bg/40 text-success-fg ring-success-bg' },
}

export function groupSectorsByCategory(sectors: Sector[]): Map<SectorCategory, Sector[]> {
  const m = new Map<SectorCategory, Sector[]>()
  for (const s of sectors) {
    if (!m.has(s.category)) m.set(s.category, [])
    m.get(s.category)!.push(s)
  }
  return m
}
