import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ListChecks,
  Star,
  Sun,
  Repeat,
  CalendarRange,
  CalendarClock,
  CalendarDays,
  Tags,
  Settings,
  LogOut,
  CheckCircle2
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth.store'
import { useStats } from '@/hooks/use-tasks'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Navegacao principal.
 *
 * Usa o bloco `sidebar` do shadcn, que ja traz o modo recolhido em icones, o
 * atalho Ctrl+B e a persistencia do estado em cookie — o botao no topo apenas
 * dispara o `toggleSidebar` desse contexto.
 */

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tarefas', label: 'Tarefas', icon: ListChecks },
  { to: '/hoje', label: 'Tarefas de Hoje', icon: Sun, badge: 'today' as const },
  { to: '/importantes', label: 'Importantes', icon: Star, badge: 'important' as const },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays }
]

/** Repeticoes, agrupadas a parte para nao alongar demais a lista principal. */
const RECURRENCE_ITEMS = [
  { to: '/diariamente', label: 'Diariamente', icon: Repeat },
  { to: '/semanalmente', label: 'Semanalmente', icon: CalendarRange },
  { to: '/mensalmente', label: 'Mensalmente', icon: CalendarClock }
]

const MANAGE_ITEMS = [
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/configuracoes', label: 'Configurações', icon: Settings }
]

export function AppSidebar(): React.JSX.Element {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)
  const { data: stats } = useStats()

  const isActive = (to: string, end?: boolean): boolean =>
    end ? pathname === to : pathname.startsWith(to)

  async function handleLogout(): Promise<void> {
    await window.api.auth.logout()
    setSession(null)
    navigate('/entrar', { replace: true })
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Task Manager">
              <NavLink to="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <CheckCircle2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Task Manager</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {stats ? `${stats.pendingTotal} pendentes` : 'Carregando…'}
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tarefas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to, item.end)}
                    tooltip={item.label}
                  >
                    <NavLink to={item.to} end={item.end}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.badge === 'important' && stats && stats.importantPending > 0 && (
                    <SidebarMenuBadge>{stats.importantPending}</SidebarMenuBadge>
                  )}
                  {item.badge === 'today' && stats && stats.dueToday > 0 && (
                    <SidebarMenuBadge>{stats.dueToday}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Repetições</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {RECURRENCE_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                    <NavLink to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gerenciar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MANAGE_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                    <NavLink to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={session?.user.name}>
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">
                  {initials(session?.user.name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{session?.user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {session?.user.email}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={handleLogout}
              className={cn('text-muted-foreground hover:text-destructive')}
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
