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
      {/* So aparece com a barra recolhida: expandida, o botao de recolher fica
          dentro dela, como no design. */}
      {state === 'collapsed' && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Expandir menu"
            title="Expandir menu (Ctrl+B)"
          >
            <PanelLeft className="size-4" />
          </Button>
          <Separator orientation="vertical" className="mr-1 h-5" />
        </>
      )}

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
      {/* `min-w-0` e essencial num filho de flex: sem ele o conteudo largo
          (tabelas, listas) empurra o container em vez de rolar dentro dele. */}
      <SidebarInset className="flex h-screen min-w-0 flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          {/*
            `@container` faz as paginas reagirem a largura REAL do conteudo, e nao
            a da janela. Sem isso, recolher a sidebar (que devolve ~200px) nao
            mudava nada, e uma janela de 1264px caia para uma coluna so por estar
            1px abaixo do breakpoint `xl`.
          */}
          <div className="@container mx-auto w-full max-w-6xl p-4 sm:p-6">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
