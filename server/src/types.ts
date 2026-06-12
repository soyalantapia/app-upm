// COPIA EXACTA del contrato de client/src/lib/types.ts (subset que usa la API).
// NO modificar sin tocar también el cliente — son el mismo contrato.

export type CountryCode = 'AR' | 'BR' | 'UY' | 'PY' | 'CL' | 'BO' | 'PE' | 'CO'

export type Topic =
  | 'ambiente'
  | 'integracion-regional'
  | 'corredores-bioceanicos'
  | 'genero'
  | 'educacion'
  | 'salud'
  | 'energia'
  | 'rio-uruguay'
  | 'mercosur'
  | 'rrii'
  | 'seguridad'
  | 'economia-regional'

export type DocType =
  | 'ley'
  | 'decreto'
  | 'reglamento'
  | 'informe'
  | 'acta'
  | 'convenio'
  | 'comunicado'
  | 'minuta'
  | 'dossier'

export type Relevance = 'alta' | 'media' | 'baja'
export type Frequency = 'diario' | 'semanal' | 'alertas'

export type Operator = {
  email: string
  name: string
  cargo: string
  pais: CountryCode
  loggedAt: string
}

export type Tramitacion = {
  fecha: string
  descripcion: string
  organo?: string
  despacho?: string
}

export type NewsItem = {
  id: string
  title: string
  country: CountryCode
  topic: Topic
  type: DocType
  date: string
  relevance: Relevance
  excerpt: string
  source: string
  fullText?: string
  authors?: string
  status?: string
  tipoDocumento?: string
  tipoConteudo?: string
  keywords?: string[]
  sourceUrl?: string
  pdfUrl?: string
  dataPublicacao?: string
  dataAtualizacao?: string
  apiDetailUrl?: string
  comision?: string
  tramitaciones?: Tramitacion[]
}

export type SourceReport = {
  id: string
  label: string
  country: CountryCode
  ok: boolean
  count: number
  error?: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { id: string; title: string; type: DocType }[]
  isInstitutional?: boolean
  createdAt: string
}

export type Preferences = {
  countries: CountryCode[]
  topics: Topic[]
  frequency: Frequency
  language: 'es' | 'pt'
  notifications: boolean
}

export const COUNTRY_CODES = ['AR', 'BR', 'UY', 'PY', 'CL', 'BO', 'PE', 'CO'] as const
export const TOPICS = [
  'ambiente', 'integracion-regional', 'corredores-bioceanicos', 'genero',
  'educacion', 'salud', 'energia', 'rio-uruguay', 'mercosur', 'rrii',
  'seguridad', 'economia-regional',
] as const
export const DOC_TYPES = [
  'ley', 'decreto', 'reglamento', 'informe', 'acta', 'convenio',
  'comunicado', 'minuta', 'dossier',
] as const
export const RELEVANCES = ['alta', 'media', 'baja'] as const
