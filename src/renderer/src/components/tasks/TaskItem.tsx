import { useState } from 'react'
import { Star, MoreHorizontal, Pencil, Trash2, Repeat, Clock, AlarmClock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
import { useRemoveTask, useToggleComplete, useToggleImportant } from '@/hooks/use-tasks'
import { useTaskDialog } from '@/stores/task-dialog.store'
import { useCategoryMap } from '@/hooks/use-categories'
import { useSettings } from '@/hooks/use-settings'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { isFutureRecurrence, FUTURE_RECURRENCE_MESSAGE } from '@shared/task-rules'
import { PRIORITY_LABELS, RECURRENCE_LABELS, formatDueDate, isOverdue } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Task } from '@shared/types'

/** Linha de uma tarefa: concluir, favoritar, editar e excluir sem sair da lista. */
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

  // Repeticao futura fica travada: quem manda e a mesma regra que o processo
  // principal aplica, importada de `shared/` para os dois lados nao divergirem.
  const locked = isFutureRecurrence(task, settings?.lockFutureRecurring ?? true)

  return (
    <>
      <div
        className={cn(
          'group hover:bg-accent/50 flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
          done && 'opacity-60'
        )}
      >
        {locked ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* O span existe porque um controle desabilitado nao dispara os
                  eventos de mouse que o tooltip precisa para abrir. */}
              <span className="mt-0.5 flex cursor-not-allowed">
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
            className="mt-0.5"
            aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
          />
        )}

        <button
          type="button"
          onClick={() => openEdit(task)}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <p className={cn('truncate text-sm font-medium', done && 'line-through')}>
            {task.title}
          </p>

          {task.description && (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">{task.description}</p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {category && (
              <Badge variant="outline" className="gap-1 text-[11px] font-normal">
                <CategoryIcon
                  icon={category.icon}
                  color={category.color}
                  variant="plain"
                  className="size-3"
                />
                {category.name}
              </Badge>
            )}

            {task.dueAt && (
              <Badge
                variant={late ? 'destructive' : 'secondary'}
                className="gap-1 text-[11px] font-normal"
              >
                <Clock className="size-3" />
                {formatDueDate(task.dueAt)}
              </Badge>
            )}

            {task.priority !== 'medium' && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[11px] font-normal',
                  task.priority === 'high' && 'border-destructive/40 text-destructive'
                )}
              >
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            )}

            {task.recurrence !== 'none' && (
              <Badge variant="outline" className="gap-1 text-[11px] font-normal">
                <Repeat className="size-3" />
                {RECURRENCE_LABELS[task.recurrence]}
                {task.recurrenceInterval > 1 && ` (${task.recurrenceInterval}x)`}
              </Badge>
            )}

            {task.dueAt && !done && task.notifiedAt === null && (
              <Badge variant="outline" className="gap-1 text-[11px] font-normal">
                <AlarmClock className="size-3" />
                Alarme ativo
              </Badge>
            )}
          </div>
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => toggleImportant.mutate(task.id)}
          aria-label={task.isImportant ? 'Remover dos importantes' : 'Marcar como importante'}
        >
          <Star
            className={cn('size-4', task.isImportant && 'fill-amber-400 text-amber-400')}
          />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0">
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
