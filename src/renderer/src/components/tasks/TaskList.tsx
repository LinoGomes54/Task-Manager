import { Skeleton } from '@/components/ui/skeleton'
import { TaskItem } from './TaskItem'
import type { Task } from '@shared/types'

interface TaskListProps {
  tasks: Task[] | undefined
  loading?: boolean
  /** Mensagem mostrada quando nao ha nenhuma tarefa. */
  empty: { title: string; description: string; icon?: React.ReactNode }
}

export function TaskList({ tasks, loading, empty }: TaskListProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[68px] w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
        {empty.icon && <div className="text-muted-foreground mb-3">{empty.icon}</div>}
        <p className="text-sm font-medium">{empty.title}</p>
        <p className="text-muted-foreground mt-1 max-w-sm text-xs">{empty.description}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  )
}
