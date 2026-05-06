import { Bookmark, Radar, ScrollText, Sparkles } from 'lucide-react'
import { BrandMark } from '@/components/Brand'

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[270px] select-none">
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-upm-400/15 to-upm-600/0 blur-2xl" />
      <div className="relative h-[540px] w-[270px] rounded-[2.5rem] bg-gradient-to-b from-upm-900 to-upm-800 p-2 shadow-floating ring-1 ring-white/10">
        <div className="absolute inset-x-0 top-2 z-20 mx-auto h-5 w-24 rounded-b-2xl bg-upm-900" />
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#F6F8FB]">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 pt-3 text-[9px] font-bold tabular-nums text-ink-700">
            <span>9:41</span>
            <span className="flex gap-1">
              <span className="inline-block h-1 w-3 rounded-sm bg-ink-700" />
              <span className="inline-block h-1 w-3 rounded-sm bg-ink-700" />
              <span className="inline-block h-1 w-4 rounded-sm bg-ink-700" />
            </span>
          </div>

          {/* App header */}
          <div className="flex items-center justify-between px-3 pt-3">
            <div className="flex items-center gap-1.5">
              <BrandMark size={22} />
              <span className="text-[10px] font-bold tracking-tight text-upm-800">Asistente AI UPM</span>
            </div>
            <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-upm-500 to-upm-700 text-[8px] font-bold text-white">P</div>
          </div>

          {/* Hero */}
          <div className="mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-upm-700 via-upm-800 to-upm-900 p-3 text-white shadow-floating">
            <div className="text-[7.5px] font-bold uppercase tracking-[0.2em] text-white/70">Tablero</div>
            <div className="mt-0.5 text-[12px] font-bold leading-tight">Buenos días, Pereira</div>
            <div className="mt-1 text-[8.5px] leading-tight text-white/70">10 novedades · 1 alerta prioritaria</div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold ring-1 ring-white/15">
              <Sparkles size={8} /> Preguntar al Asistente
            </div>
          </div>

          {/* Stats */}
          <div className="mx-3 mt-3 grid grid-cols-2 gap-1.5">
            <div className="rounded-xl bg-white p-2 ring-1 ring-ink-100">
              <div className="text-[7px] font-bold uppercase tracking-[0.16em] text-ink-500">Novedades</div>
              <div className="text-[14px] font-bold tabular-nums text-ink-900">10</div>
            </div>
            <div className="rounded-xl bg-white p-2 ring-1 ring-ink-100">
              <div className="text-[7px] font-bold uppercase tracking-[0.16em] text-ink-500">Alta relevancia</div>
              <div className="text-[14px] font-bold tabular-nums text-ink-900">4</div>
            </div>
          </div>

          {/* News card */}
          <div className="mx-3 mt-2.5 rounded-2xl bg-white p-2.5 ring-1 ring-ink-100 shadow-card">
            <div className="flex items-start gap-1.5">
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-upm-50 text-upm-700">
                <ScrollText size={11} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-upm-50 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-upm-700">🇧🇷 Brasil</span>
                  <span className="rounded-full bg-danger-bg px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-danger-fg">Alta</span>
                </div>
                <div className="mt-1 text-[9px] font-bold leading-tight text-ink-900">Nueva reglamentación ambiental en Brasil</div>
              </div>
            </div>
          </div>

          {/* Bottom nav */}
          <div className="absolute inset-x-2 bottom-2 flex items-center gap-1 rounded-2xl bg-white/95 p-1 shadow-floating ring-1 ring-white/70 backdrop-blur">
            {[
              { icon: Sparkles, label: 'Inicio', active: true },
              { icon: Radar, label: 'Radar' },
              { icon: ScrollText, label: 'Asist.' },
              { icon: Bookmark, label: 'Carpeta' },
            ].map((it, idx) => (
              <div
                key={idx}
                className={
                  'flex flex-1 flex-col items-center gap-0 rounded-xl py-1 ' +
                  (it.active ? 'bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta' : 'text-ink-500')
                }
              >
                <it.icon size={11} />
                <span className="text-[7px] font-semibold">{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
