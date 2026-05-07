import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  CircleUser,
  Globe,
  LogOut,
  Pencil,
  Sparkles,
  Tag,
  Wrench,
} from 'lucide-react'
import { Badge, Button, Card, Chip, Eyebrow, PageHeader } from '@/components/ui'
import { Drawer } from '@/components/Drawer'
import { useAuth } from '@/lib/auth'
import { useStore, store } from '@/lib/store'
import { COUNTRIES, TOPICS, countryByCode, topicById } from '@/lib/data'
import type { CountryCode } from '@/lib/types'

const CARGOS = ['Legislador', 'Senador', 'Diputado', 'Coordinador de foro', 'Secretaría UPM', 'Asesor parlamentario']

export function ProfilePage() {
  const { operator, signOut, updateOperator } = useAuth()
  const prefs = useStore(s => s.prefs)
  const navigate = useNavigate()

  const [editOpen, setEditOpen] = useState(false)
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
            <Button size="md" variant="ghost" onClick={() => store.pushToast('info', 'Notificaciones actualizadas')}>
              <Bell size={14} /> Gestionar alertas
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

            <Button size="sm" variant="secondary" className="mt-4 w-full" onClick={() => store.pushToast('info', 'Plan: 2026 — Renovación automática')}>
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
