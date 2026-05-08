import { useEffect, useState } from 'react'
import { fetchLiveFeed } from './sources'
import { enrichCamaraItem } from './sources/camara-br'
import { enrichParlamentoUYItem } from './sources/parlamento-uy'
import { NEWS as MOCK_NEWS } from './data'
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
      const found = feed.items.find(i => i.id === id) ?? MOCK_NEWS.find(i => i.id === id)
      if (!mounted) return
      setItem(found ?? null)
      setLoading(false)

      // Enrich on-demand si tiene apiDetailUrl
      if (found?.apiDetailUrl && found.id.startsWith('br-camara-')) {
        setEnriching(true)
        const enriched = await enrichCamaraItem(found, ctrl.signal)
        if (mounted) {
          setItem(enriched)
          setEnriching(false)
        }
      } else if (found?.apiDetailUrl && found.id.startsWith('uy-')) {
        setEnriching(true)
        const enriched = await enrichParlamentoUYItem(found, ctrl.signal)
        if (mounted) {
          setItem(enriched)
          setEnriching(false)
        }
      }
    })()

    return () => {
      mounted = false
      ctrl.abort()
    }
  }, [id])

  return { item, loading, enriching }
}
