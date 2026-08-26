import { Outlet } from 'react-router-dom'
import { PanelLeft, Plus } from 'lucide-react'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from './AppSidebar'
import { SyncIndicator } from './SyncIndicator'
import { CurrentTaskIndicator } from './CurrentTaskIndicator'
import { HeaderClock } from './HeaderClock'
import { useTaskDialog } from '@/stores/task-dialog.store'
import { useMediaUrl } from '@/hooks/use-personalization'

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
    <header className="bg-background/80 relative z-[2] sticky top-0 flex h-[72px] shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
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

      {/*
        Grade de tres colunas em vez de `flex-1` nas pontas: as duas colunas `1fr`
        ficam com a mesma largura, entao o relogio fica no centro do cabecalho de
        verdade — e nao no meio do espaco que sobrou, que se desloca conforme o
        titulo da tarefa em andamento cresce.
      */}
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 justify-start">
          <CurrentTaskIndicator />
        </div>

        <HeaderClock />

        <div className="flex min-w-0 items-center justify-end gap-2">
          <SyncIndicator />
          <Button className="h-10 gap-1.5" onClick={() => openNewTask()}>
            <Plus className="size-4" />
            Nova
          </Button>
        </div>
      </div>
    </header>
  )
}

export function AppShell(): React.JSX.Element {
  const fundo = useMediaUrl('background')

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* `min-w-0` e essencial num filho de flex: sem ele o conteudo largo
          (tabelas, listas) empurra o container em vez de rolar dentro dele. */}
      <SidebarInset className="relative flex h-screen min-w-0 flex-col overflow-hidden">
        {/*
          A imagem de fundo fica numa camada propria atras do conteudo, com um
          veu por cima: aplicada direto no `background` do painel, ela competiria
          com o texto e deixaria as listas ilegiveis em qualquer foto clara.
        */}
        {fundo && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${fundo})`, opacity: 0.18 }}
          />
        )}
        <Topbar />
        <div className="relative z-[1] flex-1 overflow-x-hidden overflow-y-auto">
          {/*
            `@container` faz as paginas reagirem a largura REAL do conteudo, e nao
            a da janela. Sem isso, recolher a sidebar (que devolve ~200px) nao
            mudava nada, e uma janela de 1264px caia para uma coluna so por estar
            1px abaixo do breakpoint `xl`.
          */}
          <div className="@container mx-auto w-full max-w-[1700px] p-5 sm:p-7 2xl:p-9">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
