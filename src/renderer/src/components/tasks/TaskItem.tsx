import { useState } from 'react'
import { Star, MoreHorizontal, Pencil, Trash2, Repeat } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useRemoveTask, useToggleComplete, useToggleImportant } from '@/hooks/use-tasks'
import { useTaskDialog } from '@/stores/task-dialog.store'
import { useCategoryMap } from '@/hooks/use-categories'
import { useSettings } from '@/hooks/use-settings'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { formatDueDate, isOverdue, RECURRENCE_LABELS } from '@/lib/format'
import { isFutureRecurrence, FUTURE_RECURRENCE_MESSAGE } from '@shared/task-rules'
import { cn } from '@/lib/utils'
import type { Task, TaskPriority } from '@shared/types'

/**
 * Linha de tarefa no formato do design: uma linha so, com o titulo ocupando o
 * espaco e os metadados alinhados a direita.
 *
 * A meta secundaria (categoria, repeticao) fica numa segunda linha discreta e
 * so aparece quando existe — assim uma lista de tarefas simples permanece densa,
 * e so as que tem contexto extra ocupam mais altura.
 */

/** Prioridade no formato do design: etiqueta curta em monospace. */
const PRIORITY_TAG: Record<TaskPriority, { label: string; color: string } | null> = {
  high: { label: 'P1', color: '#d1495b' },
  // Media e o padrao de toda tarefa nova: etiquetar todas nao informa nada e so
  // polui a lista. Baixa tambem fica sem etiqueta, por ser o caso tranquilo.
  medium: null,
  low: null
}

export function TaskItem({ task }: { task: Task }): React.JSX.Element {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const categories = useCategoryMap()
  const { data: settings } = useSettings()
  const openEdit = useTaskDialog((store) => store.openEdit)
  const toggleComplete = useToggleComplete()
  const toggleImportant = useToggleImportant()
  const removeTask = useRemoveTask()

  const category = task.categoryId ? categories.get(task.categoryId) : undefined
  const done = task.status === 'done'
  const late = isOverdue(task.dueAt, task.status)
  const locked = isFutureRecurrence(task, settings?.lockFutureRecurring ?? true)
  const priority = PRIORITY_TAG[task.priority]

  const hasSubline = Boolean(category) || task.recurrence !== 'none' || Boolean(task.description)

  return (
    <>
      <div
        className={cn(
          'group bg-card hover:border-ring/40 flex items-center gap-3 rounded-xl border px-4 transition-colors',
          done && 'opacity-55'
        )}
        style={{ paddingBlock: 'var(--row-padding)' }}
      >
        {locked ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* O span existe porque um controle desabilitado nao dispara os
                  eventos de mouse que o tooltip precisa para abrir. */}
              <span className="flex cursor-not-allowed self-start pt-0.5">
                <Checkbox checked={false} disabled aria-label="Repetição ainda não disponível" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-64">
              {FUTURE_RECURRENCE_MESSAGE}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Checkbox
            checked={done}
            onCheckedChange={() => toggleComplete.mutate(task.id)}
            className="self-start mt-0.5"
            aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
          />
        )}

        <button
          type="button"
          onClick={() => openEdit(task)}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <p
            className={cn(
              'truncate font-medium',
              done ? 'text-muted-foreground line-through' : 'text-foreground'
            )}
            style={{ fontSize: 'var(--text-base-size)' }}
          >
            {task.title}
          </p>

          {hasSubline && (
            <p
              className="mt-1 flex items-center gap-1.5 truncate text-[12.5px]"
              style={{ color: 'var(--faint)' }}
            >
              {category && (
                <span className="flex shrink-0 items-center gap-1">
                  <CategoryIcon
                    icon={category.icon}
                    color={category.color}
                    variant="plain"
                    className="size-3"
                  />
                  {category.name}
                </span>
              )}
              {category && task.recurrence !== 'none' && <span>·</span>}
              {task.recurrence !== 'none' && (
                <span className="flex shrink-0 items-center gap-1">
                  <Repeat className="size-3" />
                  {RECURRENCE_LABELS[task.recurrence]}
                </span>
              )}
              {task.description && (hasSubline ? <span>·</span> : null)}
              {task.description && <span className="truncate">{task.description}</span>}
            </p>
          )}
        </button>

        {/* Metadados a direita, na ordem do design: horario, prioridade, acoes. */}
        {task.dueAt && (
          <span
            className={cn('shrink-0 font-mono text-[12.5px]', late && 'text-destructive')}
            style={late ? undefined : { color: 'var(--faint)' }}
            title={formatDueDate(task.dueAt)}
          >
            {format(parseISO(task.dueAt), 'HH:mm')}
          </span>
        )}

        {priority && !done && (
          <span
            className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium text-white"
            style={{ backgroundColor: priority.color }}
            title={`Prioridade ${priority.label === 'P1' ? 'alta' : 'média'}`}
          >
            {priority.label}
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleImportant.mutate(task.id)}
          aria-label={task.isImportant ? 'Remover dos importantes' : 'Marcar como importante'}
          className={cn(
            'shrink-0 transition-opacity',
            task.isImportant ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Star
            className={cn(
              'size-[17px]',
              task.isImportant ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
            )}
          />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Ações da tarefa</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(task)}>
              <Pencil className="size-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="size-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{task.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa some das listas e a exclusão é replicada no Neon na próxima
              sincronização. Esta ação não pode ser desfeita pelo app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeTask.mutate(task.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
