import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Sparkles,
  Radar,
  ScrollText,
  FileText,
  Library,
  FolderClosed,
  User,
  LogOut,
  Search,
  BarChart3,
  LayoutGrid,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { BrandLockup, BrandMark } from '@/components/Brand'
import { SouthAmericaBackdrop } from '@/components/SouthAmerica'
import { NotificationsBell } from '@/components/NotificationsBell'
import { GlobalSearch } from '@/components/GlobalSearch'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  primary?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home, primary: true },
  { to: '/asistente', label: 'Asistente', icon: Sparkles, primary: true },
  { to: '/radar', label: 'Radar', icon: Radar, primary: true },
  { to: '/leyes', label: 'Leyes', icon: ScrollText, primary: true },
  { to: '/briefing', label: 'Briefing', icon: FileText, primary: true },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
  { to: '/carpetas', label: 'Mi carpeta', icon: FolderClosed },
  { to: '/perfil', label: 'Perfil', icon: User },
]

// Mobile · 4 accesos directos + "Más" con el resto (todo alcanzable sin sidebar)
const MOBILE_NAV = NAV.filter(n => n.primary).slice(0, 4)
const MORE_NAV: NavItem[] = [
  { to: '/briefing', label: 'Briefing', icon: FileText },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
  { to: '/carpetas', label: 'Mi carpeta', icon: FolderClosed },
  { to: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { to: '/perfil', label: 'Perfil', icon: User },
]

export function AppShell() {
  const { operator, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = MORE_NAV.some(n => location.pathname.startsWith(n.to))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === '/' && document.activeElement && (document.activeElement as HTMLElement).tagName !== 'INPUT' && (document.activeElement as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Scroll-to-top on route change · y cerrar el menú "Más" del mobile
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    setMoreOpen(false)
  }, [location.pathname])

  return (
    <div className="bg-network-mesh min-h-[100svh]">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/40 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
        <BrandLockup compact />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink-700 ring-1 ring-ink-100 shadow-card hover:bg-upm-50"
            aria-label="Buscar"
          >
            <Search size={15} />
          </button>
          <NotificationsBell />
          <button
            onClick={() => navigate('/perfil')}
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-upm-500 to-upm-700 text-[13px] font-bold text-white shadow-cta"
            aria-label="Perfil"
          >
            {operator?.name.split(' ').slice(-1)[0]?.charAt(0) ?? 'L'}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1480px] gap-0 md:gap-6 md:px-4 md:py-6">
        {/* Sidebar desktop */}
        <aside className="sticky top-6 hidden h-[calc(100svh-3rem)] w-[260px] shrink-0 flex-col rounded-3xl bg-white/85 p-4 ring-1 ring-white/60 shadow-glass backdrop-blur md:flex">
          <div className="flex items-center justify-between px-2 pb-3">
            <BrandLockup />
            <NotificationsBell />
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="mt-1 flex w-full items-center gap-2 rounded-2xl bg-upm-50/60 px-3 py-2 text-[12.5px] text-ink-500 ring-1 ring-upm-100 hover:bg-upm-50 hover:text-upm-800"
          >
            <Search size={14} className="text-upm-600" />
            <span className="flex-1 text-left">Buscar…</span>
            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-ink-500 ring-1 ring-ink-100">
              ⌘K
            </span>
          </button>

          <nav className="mt-3 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-upm-50 text-upm-800 ring-1 ring-upm-100 shadow-card'
                      : 'text-ink-700 hover:bg-upm-50/70 hover:text-upm-800',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={17}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={isActive ? 'text-upm-600' : 'text-ink-500 group-hover:text-upm-600'}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-upm-50/60 p-3 ring-1 ring-upm-100">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-upm-500 to-upm-700 text-[12px] font-bold text-white">
              {operator?.name.split(' ').slice(-1)[0]?.charAt(0) ?? 'L'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold text-ink-900">{operator?.name}</div>
              <div className="truncate text-[10.5px] uppercase tracking-[0.14em] text-ink-500">{operator?.cargo}</div>
            </div>
            <button
              onClick={() => {
                signOut()
                navigate('/login', { replace: true })
              }}
              className="rounded-full p-1.5 text-ink-500 hover:bg-white hover:text-danger"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 pb-32 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav
        className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-1 rounded-3xl bg-white/95 p-1.5 shadow-floating ring-1 ring-white/70 backdrop-blur md:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {MOBILE_NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-semibold transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta'
                  : 'text-ink-500 hover:text-upm-700',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(v => !v)}
          aria-label="Más secciones"
          aria-expanded={moreOpen}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-semibold transition-all duration-200',
            moreActive || moreOpen
              ? 'bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta'
              : 'text-ink-500 hover:text-upm-700',
          )}
        >
          <LayoutGrid size={19} strokeWidth={moreActive || moreOpen ? 2.4 : 2} />
          <span>Más</span>
        </button>
      </nav>

      {/* Sheet "Más" · acceso a las secciones que no entran en la barra inferior */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" />
          <div
            className="absolute inset-x-3 bottom-[5.5rem] rounded-3xl bg-white p-3 shadow-floating ring-1 ring-ink-100"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Más secciones</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Cerrar" className="grid h-7 w-7 place-items-center rounded-full text-ink-500 hover:bg-ink-50">
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {MORE_NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-2xl px-3 py-3 text-[13px] font-semibold transition-all',
                      isActive
                        ? 'bg-upm-50 text-upm-800 ring-1 ring-upm-100'
                        : 'text-ink-700 hover:bg-upm-50/70 hover:text-upm-800',
                    )
                  }
                >
                  <item.icon size={17} className="text-upm-600" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

export function FullBleedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-deep-mesh relative min-h-[100svh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_78%,rgba(220,235,250,0.10),transparent_60%)]" />
      <SouthAmericaBackdrop tone="dark" className="right-[-3%] top-1/2 hidden h-[120%] w-[55%] -translate-y-1/2 lg:block" />
      <SouthAmericaBackdrop tone="dark" className="-right-12 -top-8 h-72 w-72 lg:hidden" />
      <div className="absolute left-6 top-6 z-10 hidden md:block">
        <div className="flex items-center gap-2.5 text-white">
          <BrandMark size={36} />
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold tracking-tight">Asistente AI UPM</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">Acceso institucional</span>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  )
}
