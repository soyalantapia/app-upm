import { useNavigate } from 'react-router-dom'
import { BookOpen, FileText, Radar, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { NEWS as MOCK_NEWS } from '@/lib/data'
import { useLiveFeed } from '@/lib/use-live-feed'
import { DiffSinceLastVisit } from '@/components/DiffSinceLastVisit'
import { AgendaMercosur } from '@/components/AgendaMercosur'
import { HomeHero } from '@/components/HomeHero'
import { HomeRadarPreview } from '@/components/HomeRadarPreview'
import { HomeTour } from '@/components/HomeTour'

// Home V2 · Dashboard del legislador
//
// Diseño centrado en decisión, no en showcase:
// 1. Saludo + search prominente + 3 stats HOY (alta relevancia / por votar / audiencias)
// 2. Diff desde última visita (lo nuevo)
// 3. En tu Radar (filtrado por prefs del usuario)
// 4. Agenda MERCOSUR próximos 7 días
// 5. 3 acciones primarias (Radar, Leyes, Asistente)
//
// Quitamos del Home V1: TrendingPanel, WatchlistPanel, MercosurChoropleth,
// BigStats redundantes, alerta única, 3 cards genéricas, documento recomendado,
// y los 8 quick actions del sidebar.

export function HomePage() {
  const { operator } = useAuth()
  const prefs = useStore(s => s.prefs)
  const navigate = useNavigate()

  // Feed real (live) en lugar del mock estático
  const { feed } = useLiveFeed(prefs ? { countries: prefs.countries, topics: prefs.topics } : undefined)
  const NEWS = feed?.items?.length ? feed.items : MOCK_NEWS

  // Apellido para el saludo
  const lastName = operator?.name.split(' ').slice(-1)[0] ?? 'Legislador'

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[900px] flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
      {/* Tour de bienvenida · solo aparece la primera vez */}
      <HomeTour />

      {/* Hero compacto · saludo + search + 3 stats HOY */}
      <HomeHero items={NEWS} userName={lastName} />

      {/* Diff "qué cambió desde tu última visita" */}
      <DiffSinceLastVisit items={NEWS} />

      {/* En tu Radar · filtrado por prefs */}
      <HomeRadarPreview items={NEWS} prefs={prefs} />

      {/* Agenda MERCOSUR próximos 7 días · combina eventos institucionales fijos
          con convocatorias automáticas detectadas del feed */}
      <AgendaMercosur items={NEWS} />

      {/* 3 acciones primarias · simple, no overwhelm */}
      <div className="flex flex-col gap-2.5 pt-2">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
          Ir a
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            onClick={() => navigate('/radar')}
            className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3.5 ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-upm-200"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-upm-500 to-upm-700 text-white">
              <Radar size={17} />
            </div>
            <span className="text-[12.5px] font-bold text-ink-900">Radar</span>
            <span className="text-[10.5px] text-ink-500">Novedades vivas</span>
          </button>
          <button
            onClick={() => navigate('/leyes')}
            className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3.5 ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-upm-200"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-upm-500 to-upm-700 text-white">
              <BookOpen size={17} />
            </div>
            <span className="text-[12.5px] font-bold text-ink-900">Leyes</span>
            <span className="text-[10.5px] text-ink-500">Hablar con una ley</span>
          </button>
          <button
            onClick={() => navigate('/asistente')}
            className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3.5 ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-upm-200"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-upm-500 to-upm-700 text-white">
              <Sparkles size={17} />
            </div>
            <span className="text-[12.5px] font-bold text-ink-900">Asistente</span>
            <span className="text-[10.5px] text-ink-500">Brief, resumen, Biblioteca</span>
          </button>
          <button
            onClick={() => navigate('/briefing')}
            className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3.5 ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-upm-200"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-upm-500 to-upm-700 text-white">
              <FileText size={17} />
            </div>
            <span className="text-[12.5px] font-bold text-ink-900">Briefing</span>
            <span className="text-[10.5px] text-ink-500">Pre-sesión 1-pager</span>
          </button>
        </div>
      </div>
    </div>
  )
}
