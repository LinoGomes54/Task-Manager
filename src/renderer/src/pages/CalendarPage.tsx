import { useMemo, useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  format,
  parseISO
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { TaskList } from '@/components/tasks/TaskList'
import { useTasks } from '@/hooks/use-tasks'
import { useCategoryMap } from '@/hooks/use-categories'
import { useTaskDialog } from '@/stores/task-dialog.store'
import { formatMonth, combineDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Task } from '@shared/types'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/**
 * Grade mensal das tarefas com prazo.
 *
 * A consulta traz o mes inteiro de uma vez e o agrupamento por dia acontece em
 * memoria: sao poucas dezenas de registros e evita uma ida ao banco por celula.
 */
export function CalendarPage(): React.JSX.Element {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date>(() => new Date())
  const categories = useCategoryMap()
  const openNew = useTaskDialog((store) => store.openNew)

  const gridStart = startOfWeek(startOfMonth(month), { locale: ptBR })
  const gridEnd = endOfWeek(endOfMonth(month), { locale: ptBR })

  const { data: tasks, isLoading } = useTasks({
    from: gridStart.toISOString(),
    to: gridEnd.toISOString()
  })

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks ?? []) {
      if (!task.dueAt) continue
      const key = format(parseISO(task.dueAt), 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(task)
      map.set(key, list)
    }
    return map
  }, [tasks])

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const selectedKey = format(selected, 'yyyy-MM-dd')
  const selectedTasks = byDay.get(selectedKey) ?? []

  const monthTaskCount = (tasks ?? []).filter(
    (task) => task.dueAt && isSameMonth(parseISO(task.dueAt), month)
  ).length

  return (
    <>
      <PageHeader
        title="Calendário"
        description={`${monthTaskCount} tarefa(s) com prazo em ${formatMonth(month)}`}
        action={
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(addMonths(month, -1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setMonth(startOfMonth(new Date()))
                setSelected(new Date())
              }}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardContent className="p-3">
            {/* `first-letter:uppercase` e nao `capitalize`: o date-fns devolve
                "agosto de 2026" e o capitalize viraria "Agosto De 2026". */}
            <p className="mb-3 text-center text-sm font-medium first-letter:uppercase">
              {formatMonth(month)}
            </p>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-muted-foreground py-1 text-center text-[11px] font-medium"
                >
                  {day}
                </div>
              ))}

              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayTasks = byDay.get(key) ?? []
                const outside = !isSameMonth(day, month)
                const isSelected = isSameDay(day, selected)

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(day)}
                    onDoubleClick={() =>
                      openNew({ dueAt: combineDateTime(day, '09:00') })
                    }
                    className={cn(
                      'hover:bg-accent flex min-h-16 flex-col items-start gap-1 rounded-md border border-transparent p-1.5 text-left transition-colors',
                      outside && 'opacity-35',
                      isSelected && 'border-primary bg-accent',
                      isToday(day) && !isSelected && 'border-primary/40'
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        isToday(day) && 'text-primary font-semibold'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    <div className="flex w-full flex-wrap gap-0.5">
                      {dayTasks.slice(0, 4).map((task) => (
                        <span
                          key={task.id}
                          title={task.title}
                          className={cn(
                            'size-1.5 rounded-full',
                            task.status === 'done' && 'opacity-40'
                          )}
                          style={{
                            backgroundColor: task.categoryId
                              ? (categories.get(task.categoryId)?.color ?? '#64748b')
                              : '#64748b'
                          }}
                        />
                      ))}
                      {dayTasks.length > 4 && (
                        <span className="text-muted-foreground text-[9px] leading-none">
                          +{dayTasks.length - 4}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-muted-foreground mt-3 text-center text-[11px]">
              Clique em um dia para ver as tarefas · dê dois cliques para criar uma
            </p>
          </CardContent>
        </Card>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold first-letter:uppercase">
              {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => openNew({ dueAt: combineDateTime(selected, '09:00') })}
            >
              <Plus className="size-3.5" />
              Adicionar
            </Button>
          </div>

          <TaskList
            tasks={selectedTasks}
            loading={isLoading}
            empty={{
              icon: <CalendarDays className="size-8" />,
              title: 'Nenhuma tarefa neste dia',
              description: 'Use o botão Adicionar para criar uma tarefa já com este prazo.'
            }}
          />
        </section>
      </div>
    </>
  )
}
