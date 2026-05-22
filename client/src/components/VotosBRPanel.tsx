import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Vote, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { fetchVotosForVotacao, summarizeVotos, type VotoBR } from '@/lib/sources/votos-br'

// Panel para items de tipo "br-votacao-*" · trae los votos nominales reales
// vía Câmara BR API y los muestra agregados (resultados + por partido).
export function VotosBRPanel({ itemId }: { itemId: string }) {
  const navigate = useNavigate()
  const [votos, setVotos] = useState<VotoBR[]>([])
  const [loading, setLoading] = useState(true)

  // Detecta el votacaoId del id formato br-votacao-{votacaoId}
  const m = itemId.match(/^br-votacao-(.+)$/)
  const votacaoId = m?.[1]

  useEffect(() => {
    if (!votacaoId) {
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    fetchVotosForVotacao(votacaoId)
      .then(v => {
        if (mounted) {
          setVotos(v)
          setLoading(false)
        }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [votacaoId])

  if (!votacaoId) return null
  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
        <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Vote size={11} /> Trayendo votos nominales desde Câmara BR…
        </div>
        <div className="mt-3 skeleton h-32 w-full rounded-2xl" />
      </div>
    )
  }
  if (votos.length === 0) return null

  const summary = summarizeVotos(votos)
  const aprobada = summary.sim > summary.nao
  // Top partidos por # votantes
  const topParties = Array.from(summary.byParty.entries())
    .sort((a, b) => (b[1].sim + b[1].nao + b[1].abstencao) - (a[1].sim + a[1].nao + a[1].abstencao))
    .slice(0, 8)

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Vote size={11} /> Votos nominales · Câmara dos Deputados Brasil
        </div>
        <span className={
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ' +
          (aprobada
            ? 'bg-success-bg/60 text-success-fg ring-success-bg'
            : 'bg-danger-bg/60 text-danger-fg ring-danger-bg')
        }>
          {aprobada ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          {aprobada ? 'Aprobada' : 'Rechazada'} · {summary.total} votos
        </span>
      </div>

      {/* Distribución sí/no/abstención · barra horizontal */}
      <div className="mt-3">
        <div className="flex h-6 overflow-hidden rounded-full">
          {summary.sim > 0 && (
            <div
              className="flex items-center justify-center bg-success-fg text-[10.5px] font-bold text-white"
              style={{ width: `${(summary.sim / summary.total) * 100}%` }}
            >
              {summary.sim >= summary.total * 0.08 && summary.sim}
            </div>
          )}
          {summary.nao > 0 && (
            <div
              className="flex items-center justify-center bg-danger-fg text-[10.5px] font-bold text-white"
              style={{ width: `${(summary.nao / summary.total) * 100}%` }}
            >
              {summary.nao >= summary.total * 0.08 && summary.nao}
            </div>
          )}
          {summary.abstencao > 0 && (
            <div
              className="flex items-center justify-center bg-warning-fg text-[10.5px] font-bold text-white"
              style={{ width: `${(summary.abstencao / summary.total) * 100}%` }}
            >
              {summary.abstencao >= summary.total * 0.08 && summary.abstencao}
            </div>
          )}
          {summary.obstrucao + summary.outro > 0 && (
            <div
              className="flex items-center justify-center bg-ink-400 text-[10.5px] font-bold text-white"
              style={{ width: `${((summary.obstrucao + summary.outro) / summary.total) * 100}%` }}
            >
              {summary.obstrucao + summary.outro >= summary.total * 0.08 && summary.obstrucao + summary.outro}
            </div>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10.5px] text-ink-600">
          <span className="inline-flex items-center gap-1"><CheckCircle2 size={9} className="text-success-fg" /> Sim {summary.sim}</span>
          <span className="inline-flex items-center gap-1"><XCircle size={9} className="text-danger-fg" /> Não {summary.nao}</span>
          <span className="inline-flex items-center gap-1"><MinusCircle size={9} className="text-warning-fg" /> Abstenção {summary.abstencao}</span>
          {summary.obstrucao + summary.outro > 0 && (
            <span className="inline-flex items-center gap-1 text-ink-500">Otros {summary.obstrucao + summary.outro}</span>
          )}
        </div>
      </div>

      {/* Top partidos · barras horizontales */}
      {topParties.length > 0 && (
        <div className="mt-4">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
            Por partido
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {topParties.map(([party, counts]) => {
              const total = counts.sim + counts.nao + counts.abstencao
              return (
                <li key={party} className="flex items-center gap-2 text-[11px]">
                  <span className="font-bold w-16 truncate text-ink-700">{party}</span>
                  <div className="flex flex-1 h-2 overflow-hidden rounded-full bg-ink-50">
                    <div className="bg-success-fg" style={{ width: `${(counts.sim / total) * 100}%` }} />
                    <div className="bg-danger-fg" style={{ width: `${(counts.nao / total) * 100}%` }} />
                    <div className="bg-warning-fg" style={{ width: `${(counts.abstencao / total) * 100}%` }} />
                  </div>
                  <span className="font-bold tabular-nums w-10 text-right text-ink-800">{total}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Lista de votantes · primeros 20 con click → su perfil */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-bold text-upm-700 hover:text-upm-800">
          Ver lista completa de {votos.length} votantes
        </summary>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {votos.slice(0, 30).map(v => (
            <li key={v.deputadoId}>
              <button
                onClick={() => navigate(`/legislador/br-deputado-${v.deputadoId}`)}
                className="group flex w-full items-center gap-2 rounded-xl bg-ink-50/40 p-2 text-left ring-1 ring-ink-100 transition hover:bg-upm-50 hover:ring-upm-100"
              >
                <span className={
                  'h-2 w-2 shrink-0 rounded-full ' + (
                    v.tipoVoto === 'Sim' ? 'bg-success-fg' :
                    v.tipoVoto === 'Não' ? 'bg-danger-fg' :
                    'bg-warning-fg'
                  )
                } />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-ink-900 line-clamp-1 group-hover:text-upm-800">{v.deputadoNome}</p>
                  <p className="text-[9.5px] text-ink-500">{v.partido} · {v.uf}</p>
                </div>
                <span className="text-[9.5px] font-bold text-ink-500">{v.tipoVoto}</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
