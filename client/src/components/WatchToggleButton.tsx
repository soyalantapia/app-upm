import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { isWatched, watch, unwatch } from '@/lib/watchlist'
import { useCitationGraph, getCitationCount } from '@/lib/use-citations'
import { store } from '@/lib/store'
import type { NewsItem } from '@/lib/types'

// Botón pequeño para Seguir / Dejar de seguir una norma.
export function WatchToggleButton({ item, variant = 'default' }: { item: NewsItem; variant?: 'default' | 'compact' }) {
  const [watched, setWatched] = useState(false)
  const { graph } = useCitationGraph()

  useEffect(() => { setWatched(isWatched(item.id)) }, [item.id])

  const toggle = () => {
    if (watched) {
      unwatch(item.id)
      setWatched(false)
      store.pushToast('info', 'Dejaste de seguir esta norma')
    } else {
      const citasIn = getCitationCount(item.id, graph)
      watch(item.id, { status: item.status, citasIn })
      setWatched(true)
      store.pushToast('success', 'Ahora seguís esta norma · te avisamos cuando cambie')
    }
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={toggle}
        className={
          'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
          (watched
            ? 'bg-warning-bg/60 text-warning-fg ring-1 ring-warning-bg hover:bg-warning-bg/80'
            : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700')
        }
        title={watched ? 'Dejar de seguir' : 'Seguir esta norma'}
      >
        {watched ? <Bell size={12} /> : <BellOff size={12} />}
        {watched ? 'Siguiendo' : 'Seguir'}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition ' +
        (watched
          ? 'bg-warning-bg text-warning-fg ring-1 ring-warning-bg hover:bg-warning-bg/80'
          : 'bg-upm-50 text-upm-700 ring-1 ring-upm-100 hover:bg-upm-100')
      }
    >
      {watched ? <Bell size={13} /> : <BellOff size={13} />}
      {watched ? 'Siguiendo · te avisamos cuando cambie' : 'Seguir esta norma'}
    </button>
  )
}
