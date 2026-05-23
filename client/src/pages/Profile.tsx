import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bell,
  BellOff,
  BellRing,
  Building2,
  CalendarDays,
  CircleUser,
  Globe,
  LogOut,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Wrench,
} from 'lucide-react'
import { Badge, Button, Card, Chip, Eyebrow, PageHeader } from '@/components/ui'
import { Drawer } from '@/components/Drawer'
import { useAuth } from '@/lib/auth'
import { useStore, store, type Alert } from '@/lib/store'
import { COUNTRIES, TOPICS, countryByCode, topicById } from '@/lib/data'
import type { CountryCode, Topic } from '@/lib/types'

const CARGOS = ['Legislador', 'Senador', 'Diputado', 'Coordinador de foro', 'Secretaría UPM', 'Asesor parlamentario']

export function ProfilePage() {
  const { operator, signOut, updateOperator } = useAuth()
  const prefs = useStore(s => s.prefs)
  const alerts = useStore(s => s.alerts)
  const navigate = useNavigate()

  const [editOpen, setEditOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [editName, setEditName] = useState(operator?.name ?? '')
  const [editEmail, setEditEmail] = useState(operator?.email ?? '')
  const [editCargo, setEditCargo] = useState(operator?.cargo ?? 'Legislador')
  const [editPais, setEditPais] = useState<CountryCode>(operator?.pais ?? 'UY')

  const openEdit = () => {
    setEditName(operator?.name ?? '')
    setEditEmail(operator?.email ?? '')
    setEditCargo(operator?.cargo ?? 'Legislador')
    setEditPais(operator?.pais ?? 'UY')
    setEditOpen(true)
  }

  const saveEdit = (e: FormEvent) => {
    e.preventDefault()
    if (!editName.trim() || !editEmail.trim()) return
    updateOperator({
      name: editName.trim(),
      email: editEmail.trim(),
      cargo: editCargo,
      pais: editPais,
    })
    setEditOpen(false)
    store.pushToast('success', 'Perfil actualizado')
  }

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<CircleUser size={11} />}>Perfil del legislador</Eyebrow>}
        title="Personalización y membresía"
        description="Tu perfil, preferencias del Radar y plan UPM."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {/* Identidad */}
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-upm-500 to-upm-800 text-2xl font-bold text-white shadow-cta">
                {operator?.name.split(' ').slice(-1)[0]?.charAt(0) ?? 'L'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
                  Datos principales
                </div>
                <h2 className="mt-1 text-[22px] font-bold tracking-tight text-ink-900">{operator?.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-500">
                  <span className="inline-flex items-center gap-1"><Building2 size={13} /> {operator?.cargo}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Globe size={13} /> {countryByCode(operator?.pais ?? 'UY').flag} {countryByCode(operator?.pais ?? 'UY').name}</span>
                  <span>·</span>
                  <span>{operator?.email}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="success"><BadgeCheck size={11} /> Miembro UPM</Badge>
                  <Badge tone="brand">Plan Premium · Activo</Badge>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={openEdit}>
                <Pencil size={13} /> Editar
              </Button>
            </div>
          </Card>

          {/* Preferencias */}
          <Card>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Wrench size={12} /> Preferencias del Radar
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <div className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Países seguidos</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(prefs?.countries ?? []).map(c => {
                    const co = countryByCode(c)
                    return <Chip key={c} size="sm" active><span aria-hidden>{co.flag}</span>{co.name}</Chip>
                  })}
                  <Chip size="sm" onClick={() => navigate('/onboarding')}>+ Editar</Chip>
                </div>
                <div className="mt-1 text-[11px] text-ink-500">Disponibles: {COUNTRIES.length}</div>
              </div>

              <div>
                <div className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Temas seguidos</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(prefs?.topics ?? []).map(t => (
                    <Chip key={t} size="sm" active><Tag size={10} />{topicById(t).label}</Chip>
                  ))}
                  <Chip size="sm" onClick={() => navigate('/onboarding')}>+ Editar</Chip>
                </div>
                <div className="mt-1 text-[11px] text-ink-500">Disponibles: {TOPICS.length}</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="p-3.5">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
                    <CalendarDays size={11} /> Frecuencia
                  </div>
                  <div className="mt-1 text-[15px] font-bold capitalize text-ink-900">{prefs?.frequency ?? 'diario'}</div>
                </Card>
                <Card className="p-3.5">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
                    <Globe size={11} /> Idioma
                  </div>
                  <div className="mt-1 text-[15px] font-bold text-ink-900">
                    {prefs?.language === 'pt' ? 'Português' : 'Español'}
                  </div>
                </Card>
                <Card className="p-3.5">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
                    <Bell size={11} /> Notificaciones
                  </div>
                  <div className="mt-1 text-[15px] font-bold text-ink-900">{prefs?.notifications ? 'Activadas' : 'Desactivadas'}</div>
                </Card>
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button size="md" variant="secondary" onClick={() => navigate('/onboarding')}>
              <Wrench size={14} /> Editar preferencias
            </Button>
            <Button size="md" variant="ghost" onClick={() => setAlertsOpen(true)}>
              <BellRing size={14} /> Gestionar alertas
              {alerts.filter(a => a.active).length > 0 && (
                <span className="ml-1 rounded-full bg-upm-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {alerts.filter(a => a.active).length}
                </span>
              )}
            </Button>
            <Button size="md" variant="danger" onClick={handleSignOut}>
              <LogOut size={14} /> Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Membresía */}
        <div className="flex flex-col gap-4">
          <Card className="bg-gradient-to-br from-upm-700 to-upm-900 text-white ring-white/10">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-upm-200">Membresía</div>
            <div className="mt-2 text-[22px] font-bold tracking-tight">UPM Premium</div>
            <div className="mt-1 text-[12.5px] text-white/70">Activo · renovación 2026-12-31</div>

            <ul className="mt-4 flex flex-col gap-1.5 text-[13px] text-white/85">
              {[
                'Asistente AI ilimitado',
                'Radar normativo regional',
                'Biblioteca UPM completa',
                'Dossiers y briefs reutilizables',
                'Foros UPM por tema',
              ].map(b => (
                <li key={b} className="flex items-start gap-1.5">
                  <Sparkles size={12} className="mt-0.5 text-upm-200" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <Button size="sm" variant="secondary" className="mt-4 w-full" onClick={() => store.pushToast('info', 'Plan 2026 · Renovación automática')}>
              Ver plan
            </Button>
          </Card>

          <Card>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Datos institucionales</div>
            <div className="mt-2 flex flex-col gap-1.5 text-[12.5px] text-ink-700">
              <div><span className="font-semibold text-ink-900">Temas prioritarios:</span> Ambiente, integración regional, corredores bioceánicos</div>
              <div><span className="font-semibold text-ink-900">Institución:</span> Parlamento Nacional · Uruguay</div>
              <div><span className="font-semibold text-ink-900">Acreditación:</span> Miembro UPM · 2026</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Drawer Alertas inteligentes */}
      <Drawer
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        title={<span className="flex items-center gap-2"><BellRing size={15} className="text-upm-600" /> Alertas inteligentes</span>}
        description="Recibís una notificación cada vez que el Radar detecta un ítem que coincide con tus alertas."
        width="md"
      >
        <AlertasPanel alerts={alerts} />
      </Drawer>

      {/* Drawer Editar perfil */}
      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={<span className="flex items-center gap-2"><Pencil size={15} className="text-upm-600" /> Editar perfil</span>}
        description="Actualizá tus datos institucionales."
        width="md"
      >
        <form onSubmit={saveEdit} className="flex flex-col gap-4">
          <Field label="Nombre completo" required>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              required
              className="w-full rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
            />
          </Field>
          <Field label="Email institucional" required>
            <input
              type="email"
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              required
              className="w-full rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
            />
          </Field>
          <Field label="Cargo">
            <select
              value={editCargo}
              onChange={e => setEditCargo(e.target.value)}
              className="w-full appearance-none rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 focus:outline-none focus:ring-2 focus:ring-upm-400"
            >
              {CARGOS.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="País">
            <select
              value={editPais}
              onChange={e => setEditPais(e.target.value as CountryCode)}
              className="w-full appearance-none rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 focus:outline-none focus:ring-2 focus:ring-upm-400"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" size="md" variant="secondary" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="md" disabled={!editName.trim() || !editEmail.trim()}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

// ─── Panel de alertas inteligentes ────────────────────────────────────────────
function AlertasPanel({ alerts }: { alerts: Alert[] }) {
  const [keyword, setKeyword] = useState('')
  const [selCountries, setSelCountries] = useState<CountryCode[]>([])
  const [selTopics, setSelTopics] = useState<Topic[]>([])
  const [adding, setAdding] = useState(false)

  const toggleCountry = (c: CountryCode) =>
    setSelCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  const toggleTopic = (t: Topic) =>
    setSelTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return
    store.createAlert({ keyword: keyword.trim(), countries: selCountries, topics: selTopics, active: true })
    setKeyword('')
    setSelCountries([])
    setSelTopics([])
    setAdding(false)
    store.pushToast('success', `Alerta "${keyword.trim()}" activada`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Lista de alertas existentes */}
      <div className="flex flex-col gap-2">
        {alerts.length === 0 && (
          <div className="rounded-2xl bg-ink-50 px-4 py-6 text-center text-[13px] text-ink-500">
            No tenés alertas activas. Creá la primera abajo.
          </div>
        )}
        {alerts.map(a => (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink-100"
          >
            <button
              onClick={() => store.toggleAlert(a.id)}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors ${
                a.active ? 'bg-upm-50 text-upm-600' : 'bg-ink-50 text-ink-400'
              }`}
              title={a.active ? 'Desactivar alerta' : 'Activar alerta'}
            >
              {a.active ? <BellRing size={14} /> : <BellOff size={14} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink-900 truncate">{a.keyword}</div>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {a.countries.length > 0
                  ? a.countries.map(c => {
                    const co = countryByCode(c)
                    return <span key={c} className="text-[10.5px] text-ink-500">{co.flag} {co.code}</span>
                  })
                  : <span className="text-[10.5px] text-ink-400">Todos los países</span>
                }
                {a.topics.length > 0 && (
                  <>
                    <span className="text-[10.5px] text-ink-300">·</span>
                    {a.topics.map(t => (
                      <span key={t} className="text-[10.5px] text-ink-500">{topicById(t).shortLabel}</span>
                    ))}
                  </>
                )}
              </div>
              {a.matchCount > 0 && (
                <div className="mt-0.5 text-[10.5px] text-upm-600 font-semibold">
                  {a.matchCount} coincidencia{a.matchCount !== 1 ? 's' : ''} encontrada{a.matchCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                store.removeAlert(a.id)
                store.pushToast('info', 'Alerta eliminada')
              }}
              className="shrink-0 p-1.5 text-ink-300 hover:text-danger transition-colors"
              title="Eliminar alerta"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Crear nueva alerta */}
      {!adding ? (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={13} /> Nueva alerta
        </Button>
      ) : (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl bg-upm-50/40 p-4 ring-1 ring-upm-100 flex flex-col gap-3"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
            Nueva alerta
          </div>
          <Field label="Palabra clave" required>
            <input
              autoFocus
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Ej.: ITAIPU, corredor bioceánico, género…"
              className="w-full rounded-2xl bg-white px-4 py-3 text-[14px] ring-1 ring-ink-100 focus:outline-none focus:ring-2 focus:ring-upm-400"
            />
          </Field>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500 mb-1.5">
              Países (vacío = todos)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggleCountry(c.code)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ring-1 ${
                    selCountries.includes(c.code)
                      ? 'bg-upm-600 text-white ring-upm-600'
                      : 'bg-white text-ink-600 ring-ink-100 hover:ring-upm-200'
                  }`}
                >
                  {c.flag} {c.code}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500 mb-1.5">
              Temas (vacío = todos)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTopic(t.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ring-1 ${
                    selTopics.includes(t.id)
                      ? 'bg-upm-600 text-white ring-upm-600'
                      : 'bg-white text-ink-600 ring-ink-100 hover:ring-upm-200'
                  }`}
                >
                  {t.shortLabel}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={!keyword.trim()}>
              <Bell size={13} /> Crear alerta
            </Button>
          </div>
        </form>
      )}

      <p className="text-[11.5px] text-ink-400">
        Las alertas se evalúan cuando el Radar carga nuevos ítems. Recibís una notificación si hay coincidencias.
      </p>
    </div>
  )
}
