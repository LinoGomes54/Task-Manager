import { useNavigate } from 'react-router-dom'
import { CalendarCheck, AlertTriangle, CheckCheck, Star, ListTodo, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { TaskGroup } from '@/components/tasks/TaskGroup'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { useStats, useTodayTasks } from '@/hooks/use-tasks'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

/** Visao geral do dia: numeros no topo, tarefas de hoje e distribuicao por categoria. */
export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.session?.user)
  const { data: stats, isLoading: loadingStats } = useStats()

  const { today, overdue, noDueDate, total, isLoading } = useTodayTasks()

  const cards = [
    {
      label: 'Para hoje',
      value: stats?.dueToday ?? 0,
      icon: CalendarCheck,
      tone: 'text-sky-500',
      to: '/hoje'
    },
    {
      label: 'Atrasadas',
      value: stats?.overdue ?? 0,
      icon: AlertTriangle,
      tone: 'text-destructive',
      to: '/hoje'
    },
    {
      label: 'Importantes',
      value: stats?.importantPending ?? 0,
      icon: Star,
      tone: 'text-amber-500',
      to: '/importantes'
    },
    {
      label: 'Concluídas no mês',
      value: stats?.completedThisMonth ?? 0,
      icon: CheckCheck,
      tone: 'text-emerald-500',
      to: '/tarefas'
    }
  ]

  const maxByCategory = Math.max(1, ...(stats?.byCategory.map((item) => item.count) ?? [1]))

  return (
    <>
      <PageHeader
        title={`Olá, ${user?.name.split(' ')[0] ?? ''}`}
        description={new Date().toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })}
      />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        {cards.map((card) => (
          <Card
            key={card.label}
            role="button"
            tabIndex={0}
            onClick={() => navigate(card.to)}
            onKeyDown={(event) => event.key === 'Enter' && navigate(card.to)}
            className="hover:border-primary/40 cursor-pointer transition-colors"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {card.label}
              </CardTitle>
              <card.icon className={cn('size-4', card.tone)} />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-3xl font-semibold tabular-nums">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 @2xl:grid-cols-[minmax(0,1.6fr)_minmax(240px,1fr)]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ListTodo className="size-4" />
              Tarefas de hoje
            </h2>
            {total > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/hoje')}>
                Ver todas
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
              ))}
            </div>
          )}

          {!isLoading && total === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
              <Inbox className="text-muted-foreground mb-3 size-8" />
              <p className="text-sm font-medium">Tudo em dia por aqui</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                Nada atrasado, nada marcado para hoje e nenhuma tarefa solta esperando prazo.
              </p>
            </div>
          )}

          {!isLoading && total > 0 && (
            <div className="space-y-5">
              <TaskGroup
                title="Atrasadas"
                tasks={overdue}
                tone="danger"
                icon={<AlertTriangle className="size-4" />}
              />
              <TaskGroup
                title="Para hoje"
                tasks={today}
                icon={<CalendarCheck className="size-4" />}
              />
              <TaskGroup
                title="Sem prazo"
                tasks={noDueDate}
                icon={<Inbox className="size-4" />}
              />
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Pendentes por categoria</h2>
          <Card>
            <CardContent className="space-y-4 pt-6">
              {loadingStats && <Skeleton className="h-24 w-full" />}

              {!loadingStats && (stats?.byCategory.length ?? 0) === 0 && (
                <p className="text-muted-foreground text-xs">
                  Nenhuma categoria cadastrada ainda.
                </p>
              )}

              {stats?.byCategory.map((item) => (
                <div key={item.categoryId ?? item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryIcon
                        icon={item.icon}
                        color={item.color}
                        variant="plain"
                        className="size-3.5"
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="text-muted-foreground tabular-nums">{item.count}</span>
                  </div>
                  <Progress value={(item.count / maxByCategory) * 100} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  )
}
