import { useEffect } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/layout/AppShell'
import { TaskDialog } from '@/components/tasks/TaskDialog'
import { AuthPage } from '@/pages/Auth'
import { DashboardPage } from '@/pages/Dashboard'
import { TasksPage } from '@/pages/Tasks'
import { ImportantPage } from '@/pages/Important'
import { RecurringPage } from '@/pages/Recurring'
import { CalendarPage } from '@/pages/CalendarPage'
import { CategoriesPage } from '@/pages/Categories'
import { SettingsPage } from '@/pages/Settings'
import { useAuthStore } from '@/stores/auth.store'
import { useApplyTheme, useThemeStore } from '@/hooks/use-theme'
import { useMainEvents } from '@/hooks/use-main-events'
import { queryClient } from '@/lib/query'

/**
 * `HashRouter` e nao `BrowserRouter`: no build empacotado a UI e servida por
 * `file://`, onde rotas com caminho de verdade quebram no reload.
 */

function Protected(): React.JSX.Element {
  const session = useAuthStore((state) => state.session)
  const loading = useAuthStore((state) => state.loading)

  useMainEvents()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/entrar" replace />

  return (
    <>
      <Outlet />
      <TaskDialog />
    </>
  )
}

function Root(): React.JSX.Element {
  const setSession = useAuthStore((state) => state.setSession)
  const setLoading = useAuthStore((state) => state.setLoading)
  const setTheme = useThemeStore((state) => state.setTheme)

  useApplyTheme()

  // Restaura a sessao salva no processo principal antes de decidir a rota.
  useEffect(() => {
    window.api.auth
      .getSession()
      .then((session) => {
        setSession(session)
        if (session) setTheme(session.settings.theme)
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [setSession, setLoading, setTheme])

  return (
    <Routes>
      <Route path="/entrar" element={<AuthPage />} />
      <Route element={<Protected />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="tarefas" element={<TasksPage />} />
          <Route path="importantes" element={<ImportantPage />} />
          <Route path="recorrentes" element={<RecurringPage />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <HashRouter>
          <Root />
        </HashRouter>
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
