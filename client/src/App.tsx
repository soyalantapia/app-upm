import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth, useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { UIProvider } from '@/lib/ui-provider'
import { AppShell } from '@/layouts/AppShell'
import { Toasts } from '@/components/Toasts'

// Páginas pequeñas · carga sincrónica (login flow)
import { LoginPage } from '@/pages/Login'
import { SignupPage } from '@/pages/Signup'
import { CheckoutPage } from '@/pages/Checkout'
import { AccountActivatedPage } from '@/pages/AccountActivated'
import { OnboardingPage } from '@/pages/Onboarding'

// Páginas pesadas · lazy chunks (code split por ruta)
const HomePage = lazy(() => import('@/pages/Home').then(m => ({ default: m.HomePage })))
const AssistantPage = lazy(() => import('@/pages/Assistant').then(m => ({ default: m.AssistantPage })))
const RadarPage = lazy(() => import('@/pages/Radar').then(m => ({ default: m.RadarPage })))
const NewsConversationPage = lazy(() => import('@/pages/NewsConversation').then(m => ({ default: m.NewsConversationPage })))
const LawsPage = lazy(() => import('@/pages/Laws').then(m => ({ default: m.LawsPage })))
const LibraryPage = lazy(() => import('@/pages/Library').then(m => ({ default: m.LibraryPage })))
const FoldersPage = lazy(() => import('@/pages/Folders').then(m => ({ default: m.FoldersPage })))
const ProfilePage = lazy(() => import('@/pages/Profile').then(m => ({ default: m.ProfilePage })))
const BriefingPage = lazy(() => import('@/pages/Briefing').then(m => ({ default: m.BriefingPage })))
const LegisladorProfilePage = lazy(() => import('@/pages/LegisladorProfile').then(m => ({ default: m.LegisladorProfilePage })))
const StatsPage = lazy(() => import('@/pages/Stats').then(m => ({ default: m.StatsPage })))

// Fallback mínimo para Suspense (no bloquea layout)
function PageLoader() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-upm-200 border-t-upm-600" />
    </div>
  )
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const onboarded = useStore(s => s.onboarded)
  const { operator } = useAuth()
  if (!operator) return <>{children}</>
  if (!onboarded) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <UIProvider>
        <Toasts />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<SignupPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/cuenta-activada" element={<AccountActivatedPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            element={
              <RequireAuth>
                <OnboardingGate>
                  <AppShell />
                </OnboardingGate>
              </RequireAuth>
            }
          >
            <Route index element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
            <Route path="asistente" element={<Suspense fallback={<PageLoader />}><AssistantPage /></Suspense>} />
            <Route path="radar" element={<Suspense fallback={<PageLoader />}><RadarPage /></Suspense>} />
            <Route path="radar/:id" element={<Suspense fallback={<PageLoader />}><NewsConversationPage /></Suspense>} />
            <Route path="leyes" element={<Suspense fallback={<PageLoader />}><LawsPage /></Suspense>} />
            <Route path="briefing" element={<Suspense fallback={<PageLoader />}><BriefingPage /></Suspense>} />
            <Route path="legislador/:id" element={<Suspense fallback={<PageLoader />}><LegisladorProfilePage /></Suspense>} />
            <Route path="estadisticas" element={<Suspense fallback={<PageLoader />}><StatsPage /></Suspense>} />
            <Route path="biblioteca" element={<Suspense fallback={<PageLoader />}><LibraryPage /></Suspense>} />
            <Route path="carpetas" element={<Suspense fallback={<PageLoader />}><FoldersPage /></Suspense>} />
            <Route path="perfil" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </UIProvider>
      </HashRouter>
    </AuthProvider>
  )
}
