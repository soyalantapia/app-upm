export type CountryCode =
  | 'AR' | 'BR' | 'UY' | 'PY' | 'CL' | 'BO' | 'PE' | 'CO'

export type Country = {
  code: CountryCode
  name: string
  flag: string
}

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

export type TopicMeta = {
  id: Topic
  label: string
  shortLabel: string
}

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

export type DocStatus = 'oficial' | 'curado' | 'aporte'
export type Relevance = 'alta' | 'media' | 'baja'
export type Frequency = 'diario' | 'semanal' | 'alertas'

export type Operator = {
  email: string
  name: string
  cargo: string
  pais: CountryCode
  loggedAt: string
}

export type Document = {
  id: string
  title: string
  type: DocType
  country?: CountryCode
  topic: Topic
  status: DocStatus
  date: string
  forum?: string
  excerpt: string
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
}

export type Dossier = {
  id: string
  title: string
  topic: Topic
  updatedAt: string
  summary: string
  sections: { title: string; body: string }[]
  documents: string[]
}

export type Folder = {
  id: string
  title: string
  itemCount: number
  description?: string
}

export type AgendaEvent = {
  id: string
  title: string
  date: string
  participants: string
  status: 'pendiente' | 'preparado' | 'completado'
  documents: number
  topic: Topic
}

export type Forum = {
  id: string
  title: string
  topic: Topic
  members: number
  documents: number
  upcoming: string
  description: string
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
