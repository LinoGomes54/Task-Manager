import { CalendarHeart, Cake, Plus, Pencil, Trash2 } from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { useTasks, useRemoveTask } from '@/hooks/use-tasks'
import { useCategoryMap } from '@/hooks/use-categories'
import { useTaskDialog } from '@/stores/task-dialog.store'
import { cn } from '@/lib/utils'
import type { Task } from '@shared/types'

/**
 * Datas marcadas: aniversarios, consultas, provas.
 *
 * Ordenadas por **quanto falta**, e nao por data absoluta, porque a pergunta que
 * se faz a essa lista e sempre "o que vem primeiro?". Uma ordenacao por dia do
 * mes colocaria o aniversario de janeiro no topo em dezembro.
 */

/** Dias que faltam ate a data, contados por dia de calendario. */
function diasAte(task: Task): number {
  if (!task.dueAt) return Number.MAX_SAFE_INTEGER
  return differenceInCalendarDays(new Date(task.dueAt), new Date())
}

function quandoTexto(dias: number): string {
  if (dias < 0) return `há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  return `em ${dias} dias`
}

export function DatesPage(): React.JSX.Element {
  const openNew = useTaskDialog((store) => store.openNew)
  const openEdit = useTaskDialog((store) => store.openEdit)
  const removeTask = useRemoveTask()
  const categories = useCategoryMap()
  const { data: datas = [], isLoading } = useTasks({ kind: 'date' })

  const ordenadas = [...datas].sort((a, b) => diasAte(a) - diasAte(b))
  const proximas = ordenadas.filter((t) => diasAte(t) >= 0)
  const passadas = ordenadas.filter((t) => diasAte(t) < 0)

  const linha = (task: Task): React.JSX.Element => {
    const dias = diasAte(task)
    const data = task.dueAt ? new Date(task.dueAt) : null
    const categoria = task.categoryId ? categories.get(task.categoryId) : undefined
    const anual = task.recurrence === 'yearly'
    const ehHoje = dias === 0

    return (
      <div
        key={task.id}
        className={cn(
          'group bg-card flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
          ehHoje ? 'border-[color:var(--accent-base)]' : 'hover:border-ring/40',
          dias < 0 && 'opacity-50'
        )}
      >
        {categoria ? (
          <CategoryIcon icon={categoria.icon} color={categoria.color} />
        ) : (
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
            style={{ color: ehHoje ? 'var(--accent-base)' : 'var(--faint)' }}
          >
            {anual ? <Cake className="size-4" /> : <CalendarHeart className="size-4" />}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" style={{ fontSize: 'var(--text-base-size)' }}>
            {task.title}
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--faint)' }}>
            {data && format(data, "d 'de' MMMM", { locale: ptBR })}
            {anual && ' · todo ano'}
            {task.description && ` · ${task.description}`}
          </p>
        </div>

        <span
          className={cn('shrink-0 text-[12.5px]', ehHoje && 'font-semibold')}
          style={{ color: ehHoje ? 'var(--accent-base)' : 'var(--faint)' }}
        >
          {quandoTexto(dias)}
        </span>

        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => openEdit(task)}
            aria-label={`Editar ${task.title}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:text-destructive size-8"
            onClick={() => removeTask.mutate(task.id)}
            aria-label={`Remover ${task.title}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Datas importantes"
        description="Aniversários, consultas, provas — dias marcados que não ocupam tempo na agenda."
        stats={proximas.length > 0 ? `${proximas.length} pela frente` : undefined}
        action={
          <Button onClick={() => openNew({ kind: 'date' })} className="gap-1.5">
            <Plus className="size-4" />
            Nova data
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && datas.length === 0 && (
        <Panel title="Nenhuma data marcada">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Cake className="mb-2 size-7" style={{ color: 'var(--faint)' }} />
            <p className="text-[13px] font-medium">Sem datas por aqui</p>
            <p className="mt-1 max-w-sm text-[12px]" style={{ color: 'var(--faint)' }}>
              Use para o que acontece num dia específico e não toma tempo do dia: aniversário,
              consulta, vencimento. O aviso pode chegar com semanas de antecedência.
            </p>
          </div>
        </Panel>
      )}

      {!isLoading && proximas.length > 0 && (
        <div className="space-y-2">{proximas.map(linha)}</div>
      )}

      {!isLoading && passadas.length > 0 && (
        <div className="mt-6">
          <p className="section-label mb-2">Já passaram</p>
          <div className="space-y-2">{passadas.map(linha)}</div>
        </div>
      )}
    </>
  )
}
