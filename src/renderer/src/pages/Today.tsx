import { AlertTriangle, CalendarCheck, Inbox, Plus, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { TaskGroup } from '@/components/tasks/TaskGroup'
import { useTodayTasks } from '@/hooks/use-tasks'
import { useTaskDialog } from '@/stores/task-dialog.store'
import { combineDateTime } from '@/lib/format'

/**
 * O que merece atencao agora: atrasadas primeiro, depois o dia, depois o que nao
 * tem prazo. A ordem e proposital — atrasado e o que corre risco de ser esquecido.
 */
export function TodayPage(): React.JSX.Element {
  const openNew = useTaskDialog((store) => store.openNew)
  const { today, overdue, noDueDate, total, isLoading } = useTodayTasks()

  const hoje = new Date()

  return (
    <>
      <PageHeader
        title="Tarefas de Hoje"
        description={hoje.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })}
        action={
          <Button
            onClick={() => openNew({ dueAt: combineDateTime(hoje, '09:00') })}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Nova tarefa
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <PartyPopper className="text-muted-foreground mb-3 size-8" />
          <p className="text-sm font-medium">Tudo em dia por aqui</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs">
            Nada atrasado, nada marcado para hoje e nenhuma tarefa solta esperando prazo.
          </p>
        </div>
      )}

      {!isLoading && total > 0 && (
        <div className="space-y-6">
          <TaskGroup
            title="Atrasadas"
            tasks={overdue}
            tone="danger"
            icon={<AlertTriangle className="size-4" />}
            hint="o prazo já passou"
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
            hint="defina um prazo para ativar o alarme"
          />
        </div>
      )}
    </>
  )
}
