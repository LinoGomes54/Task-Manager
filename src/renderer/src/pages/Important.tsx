import { Star, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { TaskList } from '@/components/tasks/TaskList'
import { useTasks } from '@/hooks/use-tasks'
import { useTaskDialog } from '@/stores/task-dialog.store'

/** So o que foi marcado com a estrela — o "faca isso primeiro". */
export function ImportantPage(): React.JSX.Element {
  const openNew = useTaskDialog((store) => store.openNew)
  const { data: tasks, isLoading } = useTasks({ onlyImportant: true })

  return (
    <>
      <PageHeader
        title="Tarefas importantes"
        description="O que você marcou com a estrela, em um lugar só."
        action={
          <Button onClick={() => openNew({ isImportant: true })} className="gap-1.5">
            <Plus className="size-4" />
            Nova importante
          </Button>
        }
      />

      <TaskList
        tasks={tasks}
        loading={isLoading}
        empty={{
          icon: <Star className="size-8" />,
          title: 'Nenhuma tarefa importante',
          description:
            'Clique na estrela de qualquer tarefa para destacá-la aqui e no resumo do dashboard.'
        }}
      />
    </>
  )
}
