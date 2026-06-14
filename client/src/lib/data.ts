import type {
  AgendaEvent,
  Country,
  CountryCode,
  Document,
  Dossier,
  Folder,
  Forum,
  NewsItem,
  Topic,
  TopicMeta,
} from './types'

export const COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
]

export const TOPICS: TopicMeta[] = [
  { id: 'ambiente', label: 'Ambiente', shortLabel: 'Ambiente' },
  { id: 'integracion-regional', label: 'Integración regional', shortLabel: 'Integración' },
  { id: 'corredores-bioceanicos', label: 'Corredores bioceánicos', shortLabel: 'Corredores' },
  { id: 'genero', label: 'Género', shortLabel: 'Género' },
  { id: 'educacion', label: 'Educación', shortLabel: 'Educación' },
  { id: 'salud', label: 'Salud', shortLabel: 'Salud' },
  { id: 'energia', label: 'Energía', shortLabel: 'Energía' },
  { id: 'rio-uruguay', label: 'Río Uruguay', shortLabel: 'Río Uruguay' },
  { id: 'mercosur', label: 'Integración MERCOSUR', shortLabel: 'MERCOSUR' },
  { id: 'rrii', label: 'Relaciones internacionales', shortLabel: 'RRII' },
  { id: 'seguridad', label: 'Seguridad', shortLabel: 'Seguridad' },
  { id: 'economia-regional', label: 'Economía regional', shortLabel: 'Economía' },
]

export const countryByCode = (code: CountryCode): Country =>
  COUNTRIES.find(c => c.code === code) ?? COUNTRIES[0]

export const topicById = (id: Topic): TopicMeta =>
  TOPICS.find(t => t.id === id) ?? TOPICS[0]

// Datos mock ELIMINADOS para producción. La data real viene del backend
// (useLiveFeed → /feed). Se dejan vacíos: cero datos falsos en la app.
export const NEWS: NewsItem[] = []
export const DOCUMENTS: Document[] = []
export const DOSSIERS: Dossier[] = []
export const FOLDERS: Folder[] = []
export const AGENDA: AgendaEvent[] = []
export const FORUMS: Forum[] = []

export const DEFAULT_PREFS = {
  // Países con corpus real (PY/BO/CL eran datos sintéticos, removidos).
  countries: ['AR', 'CO', 'UY', 'BR'] as CountryCode[],
  topics: ['ambiente', 'integracion-regional', 'corredores-bioceanicos', 'mercosur'] as Topic[],
  frequency: 'diario' as const,
  language: 'es' as const,
  notifications: true,
}

