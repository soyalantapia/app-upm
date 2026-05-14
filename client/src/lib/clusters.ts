// Cluster de ecosistema normativo
//
// Detecta cuando un grupo de normas pertenece al mismo "evento normativo":
// una ley raíz + sus decretos reglamentarios + resoluciones implementadoras
// + leyes modificatorias. Las agrupa en un cluster expandible.
//
// Algoritmo: para cada ley nacional que tiene >= N backlinks, formar un
// cluster con ella como raíz + las normas que la citan. Las normas no
// agrupadas quedan como singletons.

import type { NewsItem } from './types'
import type { CitationGraph } from './citations'
import { extractLawNumberFromId } from './citations'

export type Cluster = {
  id: string
  root: NewsItem // la ley raíz
  members: NewsItem[] // todas las normas en el ecosistema, incluyendo root
  size: number
}

// Construye clusters · una ley raíz queda en cluster propio si tiene >= 2 backlinks.
// Las normas que aparecen en múltiples clusters quedan en el de mayor tamaño.
export function buildClusters(items: NewsItem[], graph: CitationGraph, minSize = 3): {
  clusters: Cluster[]
  singletons: NewsItem[]
  itemToCluster: Map<string, string> // itemId → clusterId
} {
  const t0 = performance.now()
  // 1. Identificar leyes-raíz candidatas (que tienen backlinks)
  const candidateRoots: { law: NewsItem; backlinkCount: number }[] = []
  for (const item of items) {
    const num = extractLawNumberFromId(item.id)
    if (!num) continue
    const backlinks = graph.backlinks.get(num)
    if (!backlinks || backlinks.length < minSize - 1) continue
    candidateRoots.push({ law: item, backlinkCount: backlinks.length })
  }

  // 2. Ordenar por backlinks desc (las más citadas se quedan con sus miembros)
  candidateRoots.sort((a, b) => b.backlinkCount - a.backlinkCount)

  // 3. Construir clusters · primer cluster que reclama un item se lo queda
  const clusters: Cluster[] = []
  const itemToCluster = new Map<string, string>()

  for (const { law } of candidateRoots) {
    const num = extractLawNumberFromId(law.id)!
    const backlinks = graph.backlinks.get(num) ?? []
    const members: NewsItem[] = [law]
    if (!itemToCluster.has(law.id)) itemToCluster.set(law.id, `cl-${law.id}`)

    for (const bl of backlinks) {
      if (!itemToCluster.has(bl.item.id)) {
        members.push(bl.item)
        itemToCluster.set(bl.item.id, `cl-${law.id}`)
      }
    }

    if (members.length >= minSize) {
      clusters.push({
        id: `cl-${law.id}`,
        root: law,
        members,
        size: members.length,
      })
    } else {
      // Liberar miembros si el cluster quedó debajo del mínimo
      members.forEach(m => itemToCluster.delete(m.id))
    }
  }

  // 4. Items no agrupados
  const singletons = items.filter(it => !itemToCluster.has(it.id))

  if (typeof window !== 'undefined' && window.console) {
    const ms = (performance.now() - t0).toFixed(0)
    console.log(
      `[clusters] built in ${ms}ms · ${clusters.length} clusters agrupan ` +
      `${items.length - singletons.length}/${items.length} items, ${singletons.length} sueltos`,
    )
  }

  return { clusters, singletons, itemToCluster }
}

// Conectores ES en minúscula al titlecase (excepto si arrancan oración).
const TC_LOWER = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'a', 'por', 'para', 'con', 'su', 'sus', 'al', 'o', 'u', 'da', 'do', 'das', 'dos', 'e'])
// Siglas conocidas que deben quedar en MAYÚSCULA.
const TC_KEEP_UPPER = new Set([
  'ENARGAS', 'BCRA', 'AFIP', 'ARCA', 'ANMAT', 'ANSES', 'CNV', 'ENRE', 'ENACOM',
  'OIT', 'OMS', 'OEA', 'ONU', 'BID', 'CAF', 'BIRF', 'FMI', 'PNUD',
  'STF', 'TSE', 'IMPO', 'DAPRE', 'BORA', 'INDEC',
  'PEN', 'HCDN', 'HCSN', 'MERCOSUR', 'MERCOSUL', 'CABA',
  'SA', 'SRL', 'SAS', 'CONICET', 'INTA', 'INTI',
])

function titlecaseES(s: string): string {
  return s
    .split(/\s+/)
    .map((word, idx) => {
      if (!word) return word
      const stripped = word.replace(/[.,;:()]/g, '')
      // Mantener siglas conocidas en mayúscula
      if (TC_KEEP_UPPER.has(stripped.toUpperCase())) return word.toUpperCase()
      // Palabras todo-mayúscula >=3 chars que probablemente son siglas/proper nouns:
      // capitalizar (e.g., MODIFICACION → Modificación lo dejamos al toLowerCase)
      const lower = word.toLowerCase()
      // Conectores en minúscula salvo primera palabra
      if (idx > 0 && TC_LOWER.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

// Cluster name: deriva un nombre legible del título de la ley raíz
export function clusterDisplayName(cluster: Cluster): string {
  const t = cluster.root.title
  // "Ley 27541 · LEY DE SOLIDARIDAD SOCIAL Y REACTIVACION PRODUCTIVA"
  // → "Ley de Solidaridad Social y Reactivacion Productiva"
  const afterDot = t.match(/·\s*(.+)/)
  let name = afterDot ? afterDot[1] : t
  // Si está todo en MAYÚSCULA aplicamos titlecase ES; si tiene mezcla lo dejamos.
  if (name === name.toUpperCase()) {
    name = titlecaseES(name)
  }
  if (name.length > 70) name = name.slice(0, 67) + '…'
  return name
}
