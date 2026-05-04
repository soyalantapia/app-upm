import { Outlet, NavLink } from 'react-router-dom'
import { ScanLine, ListChecks } from 'lucide-react'
import { cn } from '@/lib/cn'

const links = [
  { to: '/', label: 'Escanear', icon: ScanLine, end: true },
  { to: '/pedidos', label: 'Pedidos', icon: ListChecks, end: false },
]

export function AppShell() {
  return (
    <div className="flex min-h-[100svh] flex-col bg-primary-50 text-neutral-900 lg:flex-row">
      <aside className="hidden shrink-0 border-r border-neutral-100 bg-white lg:flex lg:w-64 lg:flex-col">
        <div className="flex items-center gap-3 px-6 py-7">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-500 text-white shadow-sm">
            <ScanLine size={22} />
          </div>
          <div>
            <p className="text-base font-bold text-neutral-900">Bartender</p>
            <p className="text-xs font-medium text-neutral-400">por Deenex</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-primary-100 text-neutral-900'
                    : 'text-neutral-500 hover:bg-primary-100/60 hover:text-neutral-800',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-500 text-white">
            <ScanLine size={18} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-neutral-900">Bartender</p>
            <p className="text-[11px] font-medium leading-tight text-neutral-400">por Deenex</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden pb-24 lg:pb-0">
        <Outlet />
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-3xl bg-primary-100 p-1.5 shadow-lg lg:hidden">
        <div className="flex items-center justify-around">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2.5 text-[11px] font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-neutral-600',
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
