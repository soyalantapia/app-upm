import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Operator } from './types'

type AuthContextValue = {
  operator: Operator | null
  ready: boolean
  signIn: (operator: Operator, token?: string) => Operator
  signOut: () => void
  updateOperator: (patch: Partial<Operator>) => void
}

const AUTH_KEY = 'upm.app.operator'
// Misma key que usa el sync (lib/sync.ts) para el JWT → al loguear por OTP
// guardamos acá el token y el sync lo usa sin pedir un login extra.
const SYNC_TOKEN_KEY = 'upm.sync.token.v1'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readOperator(): Operator | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Operator
  } catch {
    return null
  }
}

// Detecta si localStorage está bloqueado (modo incógnito, cuota llena, etc).
// Cuando lo está, la sesión no persiste y RequireAuth genera un loop login→home.
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const k = '__upm_storage_test__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [ready, setReady] = useState(false)
  const [storageBlocked, setStorageBlocked] = useState(false)

  useEffect(() => {
    if (!isStorageAvailable()) {
      setStorageBlocked(true)
      setReady(true)
      return
    }
    setOperator(readOperator())
    setReady(true)
  }, [])

  // Si el navegador bloquea localStorage, mostrar fallback amigable
  // antes de cualquier child que dependa de auth.
  if (ready && storageBlocked) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-[40px]">🔒</div>
        <h1 className="text-[20px] font-bold text-ink-900">Almacenamiento bloqueado</h1>
        <p className="text-[13.5px] leading-relaxed text-ink-600">
          UPM necesita guardar tu sesión y preferencias en este dispositivo. Detectamos que el
          navegador bloquea esto (probablemente <strong>modo incógnito</strong> o
          cookies/almacenamiento deshabilitados).
        </p>
        <p className="text-[12.5px] leading-relaxed text-ink-500">
          Salí del modo privado, habilitá cookies para este sitio, y recargá.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-upm-700 px-4 py-2 text-[13px] font-bold text-white shadow-cta hover:bg-upm-800"
        >
          Reintentar
        </button>
      </div>
    )
  }

  // Login real: el operador y el JWT vienen del backend (/auth/verify por OTP).
  const signIn = useCallback((op: Operator, token?: string) => {
    const stored: Operator = { ...op, loggedAt: op.loggedAt || new Date().toISOString() }
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(stored))
    if (token) window.localStorage.setItem(SYNC_TOKEN_KEY, token)
    setOperator(stored)
    return stored
  }, [])

  const signOut = useCallback(() => {
    window.localStorage.removeItem(AUTH_KEY)
    window.localStorage.removeItem(SYNC_TOKEN_KEY)
    setOperator(null)
  }, [])

  const updateOperator = useCallback((patch: Partial<Operator>) => {
    setOperator(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ operator, ready, signIn, signOut, updateOperator }),
    [operator, ready, signIn, signOut, updateOperator],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { operator, ready } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!operator) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}
