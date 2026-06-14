import type { CountryCode, NewsItem } from "../types.js"
import { fetchHcdnArgentina } from "./fetchers/hcdn-ar.js"
import { fetchExpedientesHCDN } from "./fetchers/expedientes-hcdn.js"
import { fetchLeyesInfolegArgentina, fetchDecretosInfolegArgentina, fetchDecisionesAdminInfolegArgentina, fetchResolucionesInfolegArgentina, fetchDisposicionesInfolegArgentina, fetchComunicacionesInfolegArgentina, fetchAcordadasInfolegArgentina, fetchDirectivasInfolegArgentina, fetchCircularesInfolegArgentina, fetchMercosurComercioAR, fetchBCRAArgentina, fetchSaludArgentina, fetchEconomiaArgentina, fetchSeguridadArgentina, fetchEnergiaArgentina, fetchComunicacionesARorg } from "./fetchers/infoleg-ar.js"
import { fetchImpoUY } from "./fetchers/impo-uy.js"
import { fetchLeyesUruguay } from "./fetchers/leyes-uy.js"
import { fetchProyectosColombia, fetchLeyesColombia } from "./fetchers/socrata-co.js"
import { fetchVistaProyectosColombia } from "./fetchers/vista-co.js"
import { fetchVotacionesColombia } from "./fetchers/votaciones-co.js"
import { fetchLeyesPresidenciaColombia, fetchDecretosPresidenciaColombia } from "./fetchers/presidencia-co.js"
import { fetchTratadosColombia } from "./fetchers/tratados-co.js"
import { fetchCorteConstitucionalColombia } from "./fetchers/corte-constitucional-co.js"
import { fetchSentenciasCorteCO } from "./fetchers/sentencias-corte-co.js"
import { fetchParlamentoUY } from "./fetchers/parlamento-uy.js"
import { fetchMateriasSenadoBR } from "./fetchers/materias-senado-br.js"
import { fetchVotacoesCamaraBR } from "./fetchers/votacoes-br.js"
import { fetchVotacoesSenadoBR } from "./fetchers/votacoes-senado-br.js"
import { fetchEventosCamaraBR } from "./fetchers/eventos-br.js"
import { fetchTcuBR } from "./fetchers/tcu-br.js"
import { fetchLeyesDestacadasAR } from "./fetchers/leyes-destacadas-ar.js"
import { fetchCsjnAR } from "./fetchers/csjn-ar.js"
import { fetchCamaraBR } from "./fetchers/camara-br.js"
import { fetchSenadoBR } from "./fetchers/senado-br.js"

// Registro de fuentes server-side (auto-generado desde el porteo + curadas).
// ids/labels/country consistentes con client/src/lib/sources/index.ts.
export type IngestFetcher = {
  id: string
  label: string
  country: CountryCode
  fn: (ctx: { staticBase: string }) => Promise<NewsItem[]>
}

export const FETCHERS: IngestFetcher[] = [
  // Curadas AR (verificadas)
  { id: "leyes-destacadas-ar", label: "Congreso de la Nación · Leyes Nacionales Destacadas (AR)", country: "AR", fn: ({ staticBase }) => fetchLeyesDestacadasAR(staticBase) },
  { id: "csjn-ar", label: "Corte Suprema de Justicia de la Nación · Argentina", country: "AR", fn: ({ staticBase }) => fetchCsjnAR(staticBase) },
  // Live BR (portadas del worker)
  { id: "camara-br", label: "Câmara dos Deputados", country: "BR", fn: () => fetchCamaraBR() },
  { id: "senado-br", label: "Senado Federal Brasil", country: "BR", fn: () => fetchSenadoBR() },
  { id: "hcdn-ar", label: "HCDN Argentina · Leyes Nacionales", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchHcdnArgentina(staticBase) },
  { id: "expedientes-hcdn-ar", label: "Cámara de Diputados AR · Expedientes históricos", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchExpedientesHCDN(staticBase) },
  { id: "leyes-infoleg-ar", label: "Argentina · Leyes Nacionales (BO)", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchLeyesInfolegArgentina(staticBase) },
  { id: "decretos-infoleg-ar", label: "Argentina · Decretos del PEN", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchDecretosInfolegArgentina(staticBase) },
  { id: "decisiones-admin-ar", label: "Argentina · Decisiones Administrativas (Jefatura)", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchDecisionesAdminInfolegArgentina(staticBase) },
  { id: "resoluciones-ar", label: "Argentina · Resoluciones ministeriales", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchResolucionesInfolegArgentina(staticBase) },
  { id: "disposiciones-ar", label: "Argentina · Disposiciones", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchDisposicionesInfolegArgentina(staticBase) },
  { id: "comunicaciones-ar", label: "Argentina · Comunicaciones del PEN", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchComunicacionesInfolegArgentina(staticBase) },
  { id: "acordadas-ar", label: "Argentina · Acordadas (Corte Suprema)", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchAcordadasInfolegArgentina(staticBase) },
  { id: "directivas-ar", label: "Argentina · Directivas", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchDirectivasInfolegArgentina(staticBase) },
  { id: "circulares-ar", label: "Argentina · Circulares (BCRA, AFIP)", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchCircularesInfolegArgentina(staticBase) },
  { id: "mercosur-comercio-ar", label: "Argentina · Comisión de Comercio del MERCOSUR", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchMercosurComercioAR(staticBase) },
  { id: "bcra-ar", label: "Argentina · Banco Central (BCRA)", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchBCRAArgentina(staticBase) },
  { id: "salud-ar", label: "Argentina · Salud (Min. Salud + ANMAT)", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchSaludArgentina(staticBase) },
  { id: "economia-ar", label: "Argentina · Economía y Recaudación (ARCA/AFIP)", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchEconomiaArgentina(staticBase) },
  { id: "seguridad-ar", label: "Argentina · Seguridad e Interior", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchSeguridadArgentina(staticBase) },
  { id: "energia-ar", label: "Argentina · Energía (Sec. Energía + ENRE/ENARGAS)", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchEnergiaArgentina(staticBase) },
  { id: "enacom-ar", label: "Argentina · ENACOM Comunicaciones", country: "AR" as CountryCode, fn: ({ staticBase }) => fetchComunicacionesARorg(staticBase) },
  { id: "impo-uy", label: "IMPO Uruguay · Decretos del Poder Ejecutivo", country: "UY" as CountryCode, fn: ({ staticBase }) => fetchImpoUY(staticBase) },
  { id: "leyes-uy", label: "Leyes Promulgadas Uruguay", country: "UY" as CountryCode, fn: ({ staticBase }) => fetchLeyesUruguay(staticBase) },
  { id: "senado-co", label: "Senado Colombia", country: "CO" as CountryCode, fn: () => fetchProyectosColombia() },
  { id: "leyes-co", label: "Leyes Sancionadas Colombia", country: "CO" as CountryCode, fn: () => fetchLeyesColombia() },
  { id: "vista-co", label: "Senado y Cámara CO · Texto íntegro", country: "CO" as CountryCode, fn: () => fetchVistaProyectosColombia() },
  { id: "votaciones-co", label: "Senado CO · Votaciones nominales", country: "CO" as CountryCode, fn: () => fetchVotacionesColombia() },
  { id: "leyes-presidencia-co", label: "Presidencia CO · Leyes y Actos Legislativos", country: "CO" as CountryCode, fn: () => fetchLeyesPresidenciaColombia() },
  { id: "decretos-presidencia-co", label: "Presidencia CO · Decretos y Resoluciones", country: "CO" as CountryCode, fn: () => fetchDecretosPresidenciaColombia() },
  { id: "tratados-co", label: "Cancillería Colombia · Tratados", country: "CO" as CountryCode, fn: () => fetchTratadosColombia() },
  { id: "corte-const-co", label: "Corte Constitucional CO · Exhortos al Congreso", country: "CO" as CountryCode, fn: () => fetchCorteConstitucionalColombia() },
  { id: "sentencias-corte-co", label: "Corte Constitucional CO · Sentencias recientes", country: "CO" as CountryCode, fn: () => fetchSentenciasCorteCO() },
  { id: "parlamento-uy", label: "Parlamento del Uruguay", country: "UY" as CountryCode, fn: () => fetchParlamentoUY() },
  { id: "materias-senado-br", label: "Senado Federal Brasil · Matérias legislativas", country: "BR" as CountryCode, fn: () => fetchMateriasSenadoBR() },
  { id: "votacoes-camara-br", label: "Câmara BR · Votaciones recientes", country: "BR" as CountryCode, fn: () => fetchVotacoesCamaraBR() },
  { id: "votacoes-senado-br", label: "Senado Federal BR · Votaciones nominales", country: "BR" as CountryCode, fn: () => fetchVotacoesSenadoBR() },
  { id: "eventos-camara-br", label: "Câmara BR · Agenda y eventos", country: "BR" as CountryCode, fn: () => fetchEventosCamaraBR() },
  { id: "tcu-br", label: "Tribunal de Contas da União · Brasil", country: "BR" as CountryCode, fn: ({ staticBase }) => fetchTcuBR(staticBase) },
]
