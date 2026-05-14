import { useEffect, useState } from 'react'
import { fetchLiveFeed } from './sources'
import { enrichCamaraItem } from './sources/camara-br'
import { enrichParlamentoUYItem } from './sources/parlamento-uy'
import { enrichVotacionColombia } from './sources/votaciones-co'
import { enrichInfolegItem } from './sources/infoleg-ar'
import type { NewsItem } from './types'

// Trae UN item por id (de cualquier fuente live o mock) y lo enriquece con detalle
// completo si la fuente lo soporta.
export function useNewsItem(id: string | undefined) {
  const [item, setItem] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false)

  useEffect(() => {
    if (!id) return
    let mounted = true
    const ctrl = new AbortController()

    ;(async () => {
      setLoading(true)
      // Cargar feed para encontrar el item
      const feed = await fetchLiveFeed({ signal: ctrl.signal })
      const found = feed.items.find(i => i.id === id)
      if (!mounted) return
      setItem(found ?? null)
      setLoading(false)

      // Enrich on-demand si tiene apiDetailUrl.
      // Wrap en try/catch para que un error de red no deje enriching=true forever.
      const safeEnrich = async (
        item: NewsItem,
        enricher: (i: NewsItem, s?: AbortSignal) => Promise<NewsItem>,
      ) => {
        setEnriching(true)
        try {
          const enriched = await enricher(item, ctrl.signal)
          if (mounted) setItem(enriched)
        } catch {
          // Silent fail · mantenemos el item original sin enriquecer
        } finally {
          if (mounted) setEnriching(false)
        }
      }
      if (found?.apiDetailUrl && found.id.startsWith('br-camara-')) {
        await safeEnrich(found, enrichCamaraItem)
      } else if (found?.apiDetailUrl && found.id.startsWith('uy-')) {
        await safeEnrich(found, enrichParlamentoUYItem)
      } else if (found?.id.startsWith('co-votacion-')) {
        await safeEnrich(found, enrichVotacionColombia)
      } else if (found?.apiDetailUrl && (found.id.startsWith('ar-ley-') || found.id.startsWith('ar-norm-'))) {
        await safeEnrich(found, enrichInfolegItem)
      }
    })()

    return () => {
      mounted = false
      ctrl.abort()
    }
  }, [id])

  return { item, loading, enriching }
}
