import { Repeat, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { TaskList } from '@/components/tasks/TaskList'
import { useTasks } from '@/hooks/use-tasks'
import { useTaskDialog } from '@/stores/task-dialog.store'

/**
 * Tarefas que se repetem.
 *
 * A proxima ocorrencia so nasce quando a atual e concluida — assim o historico
 * do que foi feito fica preservado e nunca ha uma fila de repeticoes futuras
 * poluindo as outras listas.
 */
export function RecurringPage(): React.JSX.Element {
  const openNew = useTaskDialog((store) => store.openNew)
  const { data: tasks, isLoading } = useTasks({ onlyRecurring: true })

  return (
    <>
      <PageHeader
        title="Tarefas recorrentes"
        description="Ao concluir uma repetição, a próxima é agendada automaticamente."
        action={
          <Button onClick={() => openNew()} className="gap-1.5">
            <Plus className="size-4" />
            Nova recorrente
          </Button>
        }
      />

      <TaskList
        tasks={tasks}
        loading={isLoading}
        empty={{
          icon: <Repeat className="size-8" />,
          title: 'Nenhuma tarefa recorrente',
          description:
            'Ao criar uma tarefa, escolha uma repetição (diária, semanal, mensal ou anual) para ela aparecer aqui.'
        }}
      />
    </>
  )
}
