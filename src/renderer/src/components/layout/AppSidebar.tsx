import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CalendarClock, CalendarDays, CalendarHeart, CalendarRange, LayoutDashboard, ListChecks, LogOut, Palette, PanelLeft, Repeat, Search, Settings, Star, Sun, Tags, Timer } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth.store'
import { useStats } from '@/hooks/use-tasks'
import { useMediaUrl } from '@/hooks/use-personalization'
import { useCategories } from '@/hooks/use-categories'
import { useSettings } from '@/hooks/use-settings'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Navegacao principal, no formato do design.
 *
 * Cada item mostra o rotulo a esquerda e uma **meta a direita** — um contador ou
 * uma legenda curta. E o que da o ritmo da barra: a coluna da direita alinha os
 * numeros e faz a lista ser lida de relance.
 *
 * Continua usando o bloco `sidebar` do shadcn por baixo, que ja traz o modo
 * recolhido em icones, o atalho Ctrl+B e a persistencia do estado.
 */

const WORKSPACE = [
  { to: '/', label: 'Painel', meta: 'visão do dia', icon: LayoutDashboard, end: true },
  { to: '/tarefas', label: 'Tarefas', meta: 'lista completa', icon: ListChecks },
  { to: '/calendario', label: 'Calendário', meta: 'mês', icon: CalendarDays },
  { to: '/playground', label: 'Playground', meta: 'agenda do dia', icon: Timer }
]

const RECURRENCE = [
  { to: '/diariamente', label: 'Diariamente', icon: Repeat },
  { to: '/semanalmente', label: 'Semanalmente', icon: CalendarRange },
  { to: '/mensalmente', label: 'Mensalmente', icon: CalendarClock }
]

export function AppSidebar(): React.JSX.Element {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { toggleSidebar, state } = useSidebar()
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)
  const { data: stats } = useStats()
  const { data: categories = [] } = useCategories()
  const { data: settings } = useSettings()
  const avatar = useMediaUrl('avatar')

  const isActive = (to: string, end?: boolean): boolean =>
    end ? pathname === to : pathname.startsWith(to)

  async function handleLogout(): Promise<void> {
    await window.api.auth.logout()
    setSession(null)
    navigate('/entrar', { replace: true })
  }

  const collapsed = state === 'collapsed'

  return (
    /*
      `offcanvas` some por completo; `icon` deixa a regua de icones. A escolha e do
      usuario porque as duas leituras de "recolher" sao legitimas: liberar a tela
      inteira, ou manter a navegacao ao alcance.
    */
    <Sidebar collapsible={settings?.miniSidebar ? 'icon' : 'offcanvas'}>
      <SidebarHeader className="gap-3">
        <div className="flex items-center gap-2.5 px-1">
          <div
            className="text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-lg text-[12.5px] font-bold"
            style={{ backgroundColor: 'var(--accent-base)' }}
          >
            T
          </div>
          <span className="flex-1 truncate text-[15px] font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Tarefas
          </span>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Recolher barra lateral (Ctrl+B)"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="border-border bg-card text-muted-foreground hover:text-foreground flex size-[26px] shrink-0 items-center justify-center rounded-lg border transition-colors group-data-[collapsible=icon]:hidden"
          >
            <PanelLeft className="size-[15px]" />
          </button>
        </div>

        <SidebarSearch />
      </SidebarHeader>

      <SidebarContent>
        <NavSection label="Espaço de trabalho">
          {WORKSPACE.map((item) => (
            <NavRow
              key={item.to}
              to={item.to}
              label={item.label}
              meta={item.meta}
              icon={<item.icon className="size-4" />}
              active={isActive(item.to, item.end)}
            />
          ))}
        </NavSection>

        <NavSection label="Visões">
          <NavRow
            to="/hoje"
            label="Hoje"
            meta={stats?.dueToday}
            icon={<Sun className="size-4" />}
            active={isActive('/hoje')}
          />
          <NavRow
            to="/importantes"
            label="Importantes"
            meta={stats?.importantPending}
            icon={<Star className="size-4" />}
            active={isActive('/importantes')}
          />
          <NavRow
            to="/datas"
            label="Datas"
            icon={<CalendarHeart className="size-4" />}
            active={isActive('/datas')}
          />
        </NavSection>

        <NavSection label="Repetições">
          {RECURRENCE.map((item) => (
            <NavRow
              key={item.to}
              to={item.to}
              label={item.label}
              icon={<item.icon className="size-4" />}
              active={isActive(item.to)}
            />
          ))}
        </NavSection>

        <NavSection label="Gerenciar">
          <NavRow
            to="/categorias"
            label="Categorias"
            meta={categories.length || undefined}
            active={isActive('/categorias')}
            icon={<Tags className="size-4" />}
          />
          <NavRow
            to="/configuracoes"
            label="Configurações"
            active={isActive('/configuracoes')}
            icon={<Settings className="size-4" />}
          />
        </NavSection>
      </SidebarContent>

      <SidebarFooter className="gap-1">
        <NavRow
          to="/configuracoes"
          label="Aparência"
          meta={
            settings
              ? settings.theme === 'dark'
                ? 'escuro'
                : settings.theme === 'light'
                  ? 'claro'
                  : 'sistema'
              : 'tema · cor'
          }
          active={false}
          icon={<Palette className="size-4" />}
        />

        <div className="border-border bg-card mt-1.5 flex items-center gap-2.5 rounded-[10px] border p-[7px_8px] group-data-[collapsible=icon]:hidden">
          {/* A foto escolhida substitui as iniciais; sem foto, as iniciais ficam. */}
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="size-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
              style={{ backgroundColor: 'var(--accent-base)' }}
            >
              {initials(session?.user.name ?? '?')}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold">{session?.user.name}</p>
            <p className="text-muted-foreground truncate text-[11.5px]">{session?.user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            aria-label="Sair"
            className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        {/* No modo icone o cartao some, entao o botao de sair precisa aparecer. */}
        <SidebarMenu className="hidden group-data-[collapsible=icon]:block">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

/* ------------------------------------------------------------------ */

function NavSection({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <SidebarGroup className="gap-1 py-1">
      <SidebarGroupLabel className="section-label h-auto px-2 pb-0.5 group-data-[collapsible=icon]:hidden">
        {label}
      </SidebarGroupLabel>
      {/* Recolhida, a barra troca o rotulo por um separador: o texto nao cabe,
          mas sem nenhuma marca os grupos viram uma fileira unica de icones. */}
      <div className="bg-sidebar-border mx-auto hidden h-px w-5 group-data-[collapsible=icon]:block" />
      <SidebarGroupContent>
        <div className="flex flex-col gap-0.5">{children}</div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

interface NavRowProps {
  to: string
  label: string
  /** Contador (numero) ou legenda curta (texto) alinhado a direita. */
  meta?: number | string
  active: boolean
  icon?: React.ReactNode
}

/**
 * Linha de navegacao do design: rotulo a esquerda, meta a direita.
 * Numeros saem em monospace para as colunas ficarem alinhadas entre si.
 */
function NavRow({ to, label, meta, active, icon }: NavRowProps): React.JSX.Element {
  const showMeta = meta !== undefined && meta !== null && meta !== 0

  return (
    <NavLink
      to={to}
      title={label}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
        // No modo icone a linha vira um quadrado com o icone centralizado.
        'group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0',
        active
          ? 'bg-sidebar-accent nav-active font-semibold'
          : 'hover:bg-sidebar-accent/60 font-medium'
      )}
    >
      <span className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:gap-0">
        {icon}
        <span className="truncate group-data-[collapsible=icon]:hidden">{label}</span>
      </span>
      {showMeta && (
        <span
          className={cn(
            'shrink-0 text-[12px] group-data-[collapsible=icon]:hidden',
            typeof meta === 'number' ? 'font-mono' : '',
            'text-muted-foreground'
          )}
          style={{ color: 'var(--faint)' }}
        >
          {meta}
        </span>
      )}
    </NavLink>
  )
}

/**
 * Busca da barra lateral.
 *
 * Ctrl+K foca o campo de qualquer tela; Enter leva para a lista de tarefas ja
 * filtrada. E busca de verdade, e nao enfeite: o design coloca o campo em
 * destaque no topo, entao ele precisa levar a algum lugar.
 */
function SidebarSearch(): React.JSX.Element {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    const query = term.trim()
    if (!query) return
    navigate(`/tarefas?q=${encodeURIComponent(query)}`)
  }

  return (
    <form onSubmit={submit}>
      <div className="border-border bg-card focus-within:border-ring flex items-center gap-2 rounded-[9px] border px-3 py-2 transition-colors group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Search className="size-3.5 shrink-0" style={{ color: 'var(--faint)' }} />
        <input
          ref={inputRef}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[color:var(--faint)] group-data-[collapsible=icon]:hidden"
        />
        <kbd
          className="shrink-0 font-mono text-[10.5px] group-data-[collapsible=icon]:hidden"
          style={{ color: 'var(--faint)' }}
        >
          Ctrl K
        </kbd>
      </div>
    </form>
  )
}
