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

// Cluster name: deriva un nombre legible del título de la ley raíz
export function clusterDisplayName(cluster: Cluster): string {
  const t = cluster.root.title
  // "Ley 27541 · LEY DE SOLIDARIDAD SOCIAL Y REACTIVACION PRODUCTIVA"
  // → "Régimen de Solidaridad Social y Reactivación Productiva"
  const afterDot = t.match(/·\s*(.+)/)
  if (afterDot) {
    let name = afterDot[1]
    // Capitalizar primera letra y bajar el resto
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    if (name.length > 60) name = name.slice(0, 57) + '…'
    return name
  }
  return t.length > 60 ? t.slice(0, 57) + '…' : t
}
