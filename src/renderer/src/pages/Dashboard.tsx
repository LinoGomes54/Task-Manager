import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarCheck, Inbox, PartyPopper } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { TaskGroup } from '@/components/tasks/TaskGroup'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { useStats, useTodayTasks } from '@/hooks/use-tasks'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

/**
 * Painel do dia, no formato do design: uma faixa de saudacao no topo e blocos
 * com contador no cabecalho.
 *
 * A ordem dos blocos segue o risco: atrasadas primeiro, depois o dia, depois o
 * que nao tem prazo.
 */
export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.session?.user)
  const { data: stats } = useStats()
  const { today, overdue, noDueDate, total, isLoading } = useTodayTasks()

  const agora = new Date()
  const hora = agora.getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = user?.name.split(' ')[0] ?? ''

  const maxPorCategoria = Math.max(1, ...(stats?.byCategory.map((i) => i.count) ?? [1]))

  return (
    <>
      <PageHeader
        title="Painel"
        description="Blocos e widgets numa tela só, para começar o dia."
        stats={
          stats
            ? `${stats.pendingTotal} abertas · ${stats.completedThisMonth} concluídas no mês`
            : undefined
        }
      />

      {/* Faixa de saudacao: contexto do dia a esquerda, relogio a direita. */}
      <div className="bg-card mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[21px] font-semibold tracking-tight">
            {saudacao}, {primeiroNome}
          </h2>
          <p className="mt-0.5 text-[12px] first-letter:uppercase" style={{ color: 'var(--faint)' }}>
            {format(agora, "EEEE, d 'de' MMMM", { locale: ptBR })}
            {stats ? ` · ${stats.dueToday} para hoje` : ''}
            {stats && stats.overdue > 0 ? ` · ${stats.overdue} atrasadas` : ''}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[21px] leading-none font-semibold tabular-nums">
            {format(agora, 'HH:mm')}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: 'var(--faint)' }}>
            agora
          </p>
        </div>
      </div>

      <div className="grid gap-4 @2xl:grid-cols-[minmax(0,1.5fr)_minmax(250px,1fr)]">
        <div className="min-w-0 space-y-4">
          <Panel
            title="Hoje"
            meta={total > 0 ? `${today.length + overdue.length + noDueDate.length}` : undefined}
            action={
              total > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11.5px]"
                  onClick={() => navigate('/hoje')}
                >
                  ver todas
                </Button>
              )
            }
          >
            {isLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-11 w-full rounded-[10px]" />
                ))}
              </div>
            )}

            {!isLoading && total === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <PartyPopper className="mb-2 size-7" style={{ color: 'var(--faint)' }} />
                <p className="text-[12.5px] font-medium">Tudo em dia por aqui</p>
                <p className="mt-1 max-w-xs text-[11.5px]" style={{ color: 'var(--faint)' }}>
                  Nada atrasado, nada marcado para hoje e nenhuma tarefa solta.
                </p>
              </div>
            )}

            {!isLoading && total > 0 && (
              <div className="space-y-4">
                <TaskGroup
                  title="Atrasadas"
                  tasks={overdue}
                  tone="danger"
                  icon={<AlertTriangle className="size-3.5" />}
                />
                <TaskGroup
                  title="Para hoje"
                  tasks={today}
                  icon={<CalendarCheck className="size-3.5" />}
                />
                <TaskGroup
                  title="Sem prazo"
                  tasks={noDueDate}
                  icon={<Inbox className="size-3.5" />}
                />
              </div>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title="Por categoria" meta={stats ? `${stats.pendingTotal}` : undefined}>
            {!stats && <Skeleton className="h-32 w-full" />}

            {stats && stats.byCategory.length === 0 && (
              <p className="py-6 text-center text-[11.5px]" style={{ color: 'var(--faint)' }}>
                Nenhuma categoria cadastrada.
              </p>
            )}

            <div className="space-y-2.5">
              {stats?.byCategory.map((item) => (
                <button
                  key={item.categoryId ?? item.name}
                  type="button"
                  onClick={() => navigate(`/tarefas?categoria=${item.categoryId}`)}
                  className="hover:bg-accent/60 -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-colors"
                >
                  <CategoryIcon
                    icon={item.icon}
                    color={item.color}
                    variant="plain"
                    className="size-3.5 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px]">{item.name}</span>
                  <span
                    className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'var(--border)' }}
                  >
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{
                        width: `${(item.count / maxPorCategoria) * 100}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </span>
                  <span
                    className="w-4 shrink-0 text-right font-mono text-[11px]"
                    style={{ color: 'var(--faint)' }}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Resumo">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Para hoje', value: stats?.dueToday ?? 0, to: '/hoje' },
                { label: 'Atrasadas', value: stats?.overdue ?? 0, to: '/hoje', alerta: true },
                { label: 'Importantes', value: stats?.importantPending ?? 0, to: '/importantes' },
                { label: 'No mês', value: stats?.completedThisMonth ?? 0, to: '/tarefas' }
              ].map((card) => (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => navigate(card.to)}
                  className="hover:border-ring/40 rounded-[10px] border px-2.5 py-2 text-left transition-colors"
                >
                  <p
                    className={cn(
                      'text-[19px] leading-none font-semibold tabular-nums',
                      card.alerta && card.value > 0 && 'text-destructive'
                    )}
                  >
                    {card.value}
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--faint)' }}>
                    {card.label}
                  </p>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
