import { useState } from 'react'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  FileCheck2,
  FileStack,
  Filter,
  Library,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Stamp,
  Tag,
  UploadCloud,
  Users,
  Users2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, Chip, Eyebrow, PageHeader, Stat } from '@/components/ui'
import { COUNTRIES, DOCUMENTS, FORUMS, TOPICS, countryByCode, topicById } from '@/lib/data'
import type { DocStatus } from '@/lib/types'
import { store } from '@/lib/store'
import { useUI } from '@/lib/ui-provider'

type Tab = 'documentos' | 'miembros' | 'moderacion' | 'metricas'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'documentos', label: 'Documentos', icon: FileStack },
  { id: 'miembros', label: 'Miembros', icon: Users2 },
  { id: 'moderacion', label: 'Moderación', icon: ShieldCheck },
  { id: 'metricas', label: 'Métricas', icon: BarChart3 },
]

const MEMBERS = [
  { name: 'Dr. Martín Pereira', role: 'Legislador', country: 'UY', status: 'activo', forums: 3 },
  { name: 'Dra. Cecilia Lima', role: 'Coordinadora Foro Ambiente', country: 'BR', status: 'activo', forums: 2 },
  { name: 'Dip. Andrés Ferreyra', role: 'Legislador', country: 'AR', status: 'activo', forums: 1 },
  { name: 'Sen. Lucía Benítez', role: 'Senadora', country: 'PY', status: 'pendiente', forums: 1 },
  { name: 'Dip. Sofía Medina', role: 'Legisladora', country: 'CL', status: 'activo', forums: 2 },
  { name: 'Sec. UPM Federico Solá', role: 'Secretaría UPM', country: 'UY', status: 'activo', forums: 6 },
]

const PENDING = [
  { id: 'p1', title: 'Aporte académico — Río Uruguay', source: 'Foro Académico · Dra. Lima', date: '2026-05-04' },
  { id: 'p2', title: 'Minuta reunión bilateral AR/BR', source: 'Foro Corredores · Dip. Ferreyra', date: '2026-05-03' },
  { id: 'p3', title: 'Borrador comunicado UPM Q2', source: 'Secretaría UPM', date: '2026-05-02' },
]

const TRENDING_TOPICS = [
  { id: 'corredores-bioceanicos', queries: 312 },
  { id: 'ambiente', queries: 287 },
  { id: 'mercosur', queries: 198 },
  { id: 'integracion-regional', queries: 154 },
  { id: 'rio-uruguay', queries: 92 },
]

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('documentos')

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<ShieldCheck size={11} />}>Administración UPM</Eyebrow>}
        title="Panel institucional UPM"
        description="Curaduría de documentos, gestión de miembros, moderación de aportes y métricas del ecosistema. Para Dirección Ejecutiva, Secretaría y Coordinadores de Foro."
        actions={
          <Badge tone="brand">
            <Sparkles size={11} /> Modo administración
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Usuarios activos" value="142" hint="+18 último mes" />
        <Stat label="Consultas (30d)" value="3.842" hint="Asistente AI" />
        <Stat label="Documentos" value={DOCUMENTS.length} hint="Biblioteca UPM" />
        <Stat label="Dossiers creados" value="27" hint="+7 esta semana" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl bg-white p-1.5 ring-1 ring-ink-100 shadow-card">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ' +
              (tab === t.id
                ? 'bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta'
                : 'text-ink-700 hover:bg-upm-50 hover:text-upm-800')
            }
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'documentos' && <DocumentsTab />}
      {tab === 'miembros' && <MembersTab />}
      {tab === 'moderacion' && <ModerationTab />}
      {tab === 'metricas' && <MetricsTab />}
    </div>
  )
}

function DocumentsTab() {
  const { openDocument } = useUI()
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Library size={12} /> Documentos en biblioteca
        </div>
        <div className="mt-3 flex flex-col divide-y divide-ink-100">
          {DOCUMENTS.slice(0, 8).map(d => (
            <div key={d.id} className="flex items-center gap-3 py-3">
              <button
                onClick={() => openDocument(d)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-upm-50 text-upm-700 hover:bg-upm-100"
                aria-label="Abrir detalle"
              >
                <Library size={15} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  <Badge tone="brand">{d.type}</Badge>
                  <StatusPill status={d.status} />
                  {d.country && (
                    <Badge tone="ghost">
                      {countryByCode(d.country).flag} {countryByCode(d.country).name}
                    </Badge>
                  )}
                </div>
                <button onClick={() => openDocument(d)} className="text-left">
                  <div className="mt-1 truncate text-[13px] font-semibold text-ink-900 hover:text-upm-700">{d.title}</div>
                </button>
                <div className="text-[11px] text-ink-500 tabular-nums">{d.date}</div>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    store.pushNotification({ type: 'documento', title: 'Documento marcado Oficial', description: d.title })
                    store.pushToast('success', `"${d.title.slice(0, 28)}…" → Oficial UPM`)
                  }}
                >
                  <Stamp size={12} /> Oficial
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    store.pushNotification({ type: 'documento', title: 'Documento marcado Curado', description: d.title })
                    store.pushToast('info', `"${d.title.slice(0, 28)}…" → Curado`)
                  }}
                >
                  <CheckCircle2 size={12} /> Curado
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="bg-gradient-to-br from-upm-50 to-white ring-upm-100">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <UploadCloud size={12} /> Cargar documento
          </div>
          <p className="mt-2 text-[12.5px] text-ink-500">
            Subí un nuevo documento, clasificalo y vinculalo a un foro, país o tema. Visible para miembros UPM.
          </p>
          <Button
            size="md"
            className="mt-3 w-full"
            onClick={() => store.pushToast('success', 'Documento agregado a la cola de revisión')}
          >
            <UploadCloud size={14} /> Subir documento
          </Button>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <Filter size={12} /> Filtros rápidos
          </div>
          <div className="mt-3 flex flex-col gap-2.5 text-[12.5px]">
            <div className="flex flex-wrap gap-1.5">
              <Chip size="sm" active>Oficial UPM</Chip>
              <Chip size="sm">Curado por UPM</Chip>
              <Chip size="sm">Aporte de foro</Chip>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.slice(0, 6).map(t => (
                <Chip key={t.id} size="sm">
                  <Tag size={10} /> {t.shortLabel}
                </Chip>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function MembersTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <Users2 size={12} /> Miembros activos
          </div>
          <Button size="sm" variant="soft" onClick={() => store.pushToast('success', 'Invitación enviada')}>
            + Invitar miembro
          </Button>
        </div>

        <div className="mt-3 flex flex-col divide-y divide-ink-100">
          {MEMBERS.map(m => {
            const c = countryByCode(m.country as 'UY')
            return (
              <div key={m.name} className="flex items-center gap-3 py-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-upm-500 to-upm-700 text-[12px] font-bold text-white">
                  {m.name.split(' ').slice(-1)[0].charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink-900">{m.name}</div>
                  <div className="text-[11.5px] text-ink-500">
                    {m.role} · {c.flag} {c.name}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={m.status === 'activo' ? 'success' : 'warning'}>{m.status}</Badge>
                  <span className="text-[11px] text-ink-500 tabular-nums">{m.forums} foros</span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Users size={12} /> Foros y coordinadores
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {FORUMS.slice(0, 5).map(f => (
            <div key={f.id} className="rounded-2xl bg-upm-50/50 p-3 ring-1 ring-upm-100">
              <div className="text-[13px] font-semibold text-ink-900">{f.title}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-500">
                {f.members} miembros · próx. {f.upcoming}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ModerationTab() {
  const [archived, setArchived] = useState<Set<string>>(new Set())
  const [approved, setApproved] = useState<Set<string>>(new Set())
  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <ShieldCheck size={12} /> Cola de revisión
          </div>
          <Badge tone="warning">{PENDING.length} pendientes</Badge>
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {PENDING.map(p => {
            const isArchived = archived.has(p.id)
            const isApproved = approved.has(p.id)
            return (
              <div
                key={p.id}
                className={
                  'flex flex-col gap-2 rounded-2xl p-3.5 ring-1 sm:flex-row sm:items-center sm:justify-between transition ' +
                  (isArchived
                    ? 'bg-ink-50 ring-ink-100 opacity-60'
                    : isApproved
                    ? 'bg-success-bg/30 ring-success-bg'
                    : 'bg-white ring-ink-100')
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13.5px] font-semibold text-ink-900">{p.title}</span>
                    {isApproved && <Badge tone="success">Aprobado</Badge>}
                    {isArchived && <Badge tone="neutral">Archivado</Badge>}
                  </div>
                  <div className="text-[11.5px] text-ink-500">{p.source}</div>
                  <div className="text-[11px] text-ink-500 tabular-nums">{p.date}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="soft"
                    disabled={isArchived || isApproved}
                    onClick={() => {
                      setApproved(s => new Set(s).add(p.id))
                      store.pushNotification({ type: 'foro', title: 'Aporte aprobado', description: p.title })
                      store.pushToast('success', 'Aprobado y publicado')
                    }}
                  >
                    <FileCheck2 size={13} /> Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isArchived}
                    onClick={() => {
                      store.pushNotification({ type: 'documento', title: 'Marcado como Oficial UPM', description: p.title })
                      store.pushToast('info', 'Marcado como Oficial UPM')
                    }}
                  >
                    <Stamp size={13} /> Marcar Oficial
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={isArchived}
                    onClick={() => {
                      setArchived(s => new Set(s).add(p.id))
                      store.pushToast('warning', 'Aporte archivado')
                    }}
                  >
                    Archivar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-upm-50 to-white ring-upm-100">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Megaphone size={12} /> Comunicados destacados
        </div>
        <p className="mt-2 text-[12.5px] text-ink-700">
          Destacá comunicados oficiales para que aparezcan en el tope del Radar y en la home de los miembros UPM.
        </p>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => store.pushToast('success', 'Comunicado destacado en la home')}
        >
          <Sparkles size={13} /> Destacar comunicado
        </Button>
      </Card>
    </div>
  )
}

function MetricsTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Activity size={12} /> Actividad por país (30d)
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {COUNTRIES.slice(0, 6).map((c, i) => {
            const pct = [88, 76, 92, 54, 41, 33][i] ?? 30
            return (
              <div key={c.code}>
                <div className="flex items-center justify-between text-[12px] font-semibold text-ink-700">
                  <span>
                    {c.flag} {c.name}
                  </span>
                  <span className="tabular-nums text-ink-500">{pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-upm-400 to-upm-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <BarChart3 size={12} /> Temas más consultados
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {TRENDING_TOPICS.map(({ id, queries }) => {
            const t = topicById(id as 'ambiente')
            return (
              <div key={id} className="flex items-center justify-between rounded-2xl bg-upm-50/40 px-3 py-2.5 ring-1 ring-upm-100">
                <span className="text-[13px] font-semibold text-ink-900">{t.label}</span>
                <span className="text-[12px] font-bold text-upm-700 tabular-nums">{queries}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function StatusPill({ status }: { status: DocStatus }) {
  if (status === 'oficial') return <Badge tone="success">Oficial UPM</Badge>
  if (status === 'curado') return <Badge tone="info">Curado por UPM</Badge>
  return <Badge tone="warning">Aporte de foro</Badge>
}
