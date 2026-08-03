import { useNavigate } from 'react-router-dom'
import { CalendarCheck, AlertTriangle, CheckCheck, Star, ListTodo, Inbox } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { TaskList } from '@/components/tasks/TaskList'
import { useStats, useTasks } from '@/hooks/use-tasks'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

/** Visao geral do dia: numeros no topo, tarefas de hoje e distribuicao por categoria. */
export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.session?.user)
  const { data: stats, isLoading: loadingStats } = useStats()

  const today = new Date()
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setHours(23, 59, 59, 999)

  const { data: todayTasks, isLoading } = useTasks({
    from: start.toISOString(),
    to: end.toISOString()
  })

  const cards = [
    {
      label: 'Para hoje',
      value: stats?.dueToday ?? 0,
      icon: CalendarCheck,
      tone: 'text-sky-500',
      to: '/calendario'
    },
    {
      label: 'Atrasadas',
      value: stats?.overdue ?? 0,
      icon: AlertTriangle,
      tone: 'text-destructive',
      to: '/tarefas'
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ListTodo className="size-4" />
            Tarefas de hoje
          </h2>
          <TaskList
            tasks={todayTasks}
            loading={isLoading}
            empty={{
              icon: <Inbox className="size-8" />,
              title: 'Nada marcado para hoje',
              description:
                'Crie uma tarefa com prazo para hoje e ela aparece aqui — junto com o alarme, se você definir um lembrete.'
            }}
          />
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
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
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
