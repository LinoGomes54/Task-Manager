import { Outlet } from 'react-router-dom'
import { PanelLeft, Plus } from 'lucide-react'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from './AppSidebar'
import { SyncIndicator } from './SyncIndicator'
import { useTaskDialog } from '@/stores/task-dialog.store'

/**
 * Estrutura visual do app logado: sidebar + area de conteudo.
 *
 * O botao do painel no topo chama `toggleSidebar` do contexto do shadcn, que
 * alterna entre a sidebar expandida e o modo so-icones (e lembra a escolha).
 */

function Topbar(): React.JSX.Element {
  const { toggleSidebar, state } = useSidebar()
  const openNewTask = useTaskDialog((store) => store.openNew)

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label={state === 'expanded' ? 'Recolher menu' : 'Expandir menu'}
        title="Recolher/expandir menu (Ctrl+B)"
      >
        <PanelLeft className="size-4" />
      </Button>

      <Separator orientation="vertical" className="mr-1 h-5" />

      <div className="flex-1" />

      <SyncIndicator />

      <Button size="sm" className="gap-1.5" onClick={() => openNewTask()}>
        <Plus className="size-4" />
        Nova tarefa
      </Button>
    </header>
  )
}

export function AppShell(): React.JSX.Element {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-screen flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl p-6">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
