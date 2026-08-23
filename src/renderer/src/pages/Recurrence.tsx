import { Repeat, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { TaskList } from '@/components/tasks/TaskList'
import { useTasks } from '@/hooks/use-tasks'
import { useTaskDialog } from '@/stores/task-dialog.store'
import type { RecurrenceRule } from '@shared/types'

/**
 * Tela das repeticoes de uma periodicidade (diaria, semanal ou mensal).
 *
 * As tres rotas usam este mesmo componente, mudando so a regra — evita triplicar
 * uma tela que difere apenas no filtro e no texto.
 *
 * A proxima ocorrencia so nasce quando a atual e concluida, entao o historico do
 * que foi feito fica preservado e nao ha uma fila de repeticoes futuras poluindo
 * as outras listas.
 */

interface RecurrencePageProps {
  rule: Exclude<RecurrenceRule, 'none'>
  title: string
  description: string
  emptyHint: string
}

export function RecurrencePage({
  rule,
  title,
  description,
  emptyHint
}: RecurrencePageProps): React.JSX.Element {
  const openNew = useTaskDialog((store) => store.openNew)
  const { data: tasks, isLoading } = useTasks({ recurrence: rule })

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={() => openNew({ recurrence: rule })} className="gap-1.5">
            <Plus className="size-4" />
            Nova tarefa
          </Button>
        }
      />

      <TaskList
        tasks={tasks}
        loading={isLoading}
        empty={{
          icon: <Repeat className="size-8" />,
          title: `Nenhuma tarefa ${title.toLowerCase()}`,
          description: emptyHint
        }}
      />
    </>
  )
}

export function DailyPage(): React.JSX.Element {
  return (
    <RecurrencePage
      rule="daily"
      title="Diariamente"
      description="Tarefas que se repetem todo dia. Ao concluir, a próxima é agendada automaticamente."
      emptyHint="Ao criar uma tarefa, escolha a repetição “Diariamente” para ela aparecer aqui."
    />
  )
}

export function WeeklyPage(): React.JSX.Element {
  return (
    <RecurrencePage
      rule="weekly"
      title="Semanalmente"
      description="Tarefas que se repetem toda semana, no mesmo dia."
      emptyHint="Ao criar uma tarefa, escolha a repetição “Semanalmente” para ela aparecer aqui."
    />
  )
}

export function MonthlyPage(): React.JSX.Element {
  return (
    <RecurrencePage
      rule="monthly"
      title="Mensalmente"
      description="Tarefas que se repetem todo mês — contas, aluguel, revisões."
      emptyHint="Ao criar uma tarefa, escolha a repetição “Mensalmente” para ela aparecer aqui."
    />
  )
}
