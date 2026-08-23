import { TaskItem } from './TaskItem'
import { cn } from '@/lib/utils'
import type { Task } from '@shared/types'

interface TaskGroupProps {
  title: string
  tasks: Task[]
  icon: React.ReactNode
  /** Destaca o cabecalho — usado no grupo de atrasadas. */
  tone?: 'default' | 'danger'
  hint?: string
}

/**
 * Bloco de tarefas com cabecalho e contador.
 *
 * Some por completo quando esta vazio: numa visao com tres grupos, mostrar
 * "nenhuma tarefa atrasada" so ocuparia espaco util com uma nao-informacao.
 */
export function TaskGroup({
  title,
  tasks,
  icon,
  tone = 'default',
  hint
}: TaskGroupProps): React.JSX.Element | null {
  if (tasks.length === 0) return null

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={cn(tone === 'danger' ? 'text-destructive' : 'text-muted-foreground')}>
          {icon}
        </span>
        <h2 className={cn('text-[14px] font-semibold', tone === 'danger' && 'text-destructive')}>
          {title}
        </h2>
        <span className="text-muted-foreground text-[12.5px] tabular-nums">{tasks.length}</span>
        {hint && <span className="text-muted-foreground ml-1 text-xs">· {hint}</span>}
      </div>

      <div className="space-y-2.5">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </section>
  )
}
