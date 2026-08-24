import { Check, CircleDot, Clock, Coffee, Inbox, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { useCurrentTask } from '@/hooks/use-current-task'
import { useToggleComplete } from '@/hooks/use-tasks'
import { useCategoryMap } from '@/hooks/use-categories'
import { useTaskDialog } from '@/stores/task-dialog.store'
import {
  formatHm,
  formatDuration,
  minutesLeft,
  progressOf,
  gapsBetween,
  totalMinutes,
  hasOverlap,
  type TaskBlock
} from '@shared/agenda'
import { combineDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Playground: a agenda do dia.
 *
 * **Nao cronometra nada.** O que manda e o relogio: a tarefa em andamento e
 * aquela cujo horario ja comecou e ainda nao terminou. Um cronometro manual
 * exigiria lembrar de apertar play, e a agenda deixaria de refletir o dia real
 * no instante em que alguem esquecesse.
 */
export function PlaygroundPage(): React.JSX.Element {
  const { current, next, blocks, isLoading } = useCurrentTask()
  const categories = useCategoryMap()
  const toggleComplete = useToggleComplete()
  const openNew = useTaskDialog((store) => store.openNew)

  const agora = new Date()
  const gaps = gapsBetween(blocks)
  const minutosPlanejados = totalMinutes(blocks)
  const sobreposto = hasOverlap(blocks)

  const gapAntesDe = (block: TaskBlock): number =>
    gaps.find((g) => g.end.getTime() === block.start.getTime())?.minutes ?? 0

  return (
    <>
      <PageHeader
        title="Playground"
        description={format(agora, "EEEE, d 'de' MMMM", { locale: ptBR })}
        stats={
          blocks.length > 0
            ? `${blocks.length} ${blocks.length === 1 ? 'tarefa' : 'tarefas'} · ${formatDuration(minutosPlanejados)} planejados`
            : undefined
        }
        action={
          <Button
            onClick={() => openNew({ dueAt: combineDateTime(agora, formatHm(agora)) })}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Nova tarefa
          </Button>
        }
      />

      <div className="grid gap-5 @2xl:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
        <Panel title="Agora" meta={current ? formatHm(agora) : undefined}>
          {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

          {!isLoading && !current && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Coffee className="mb-2 size-7" style={{ color: 'var(--faint)' }} />
              <p className="text-[13px] font-medium">Nada agendado para agora</p>
              <p className="mt-1 max-w-sm text-[12px]" style={{ color: 'var(--faint)' }}>
                {next
                  ? `A próxima é “${next.task.title}”, às ${formatHm(next.start)}.`
                  : 'Crie uma tarefa com horário e duração para ela aparecer aqui.'}
              </p>
            </div>
          )}

          {!isLoading && current && (
            <div className="py-2">
              <div className="mb-4 flex items-start gap-3">
                {current.task.categoryId && categories.get(current.task.categoryId) ? (
                  <CategoryIcon
                    icon={categories.get(current.task.categoryId)!.icon}
                    color={categories.get(current.task.categoryId)!.color}
                  />
                ) : (
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
                    style={{ color: 'var(--accent-base)' }}
                  >
                    <CircleDot className="size-4" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-[19px] leading-tight font-semibold">{current.task.title}</p>
                  <p className="mt-1 text-[12.5px]" style={{ color: 'var(--faint)' }}>
                    <span className="font-mono">{formatHm(current.start)}</span> às{' '}
                    <span className="font-mono">{formatHm(current.end)}</span> ·{' '}
                    {formatDuration(current.task.durationMinutes)}
                  </p>
                </div>
              </div>

              {current.task.description && (
                <p className="mb-4 text-[13px]" style={{ color: 'var(--faint)' }}>
                  {current.task.description}
                </p>
              )}

              {/* Barra do tempo decorrido do bloco. */}
              <div
                className="mb-2 h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--border)' }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-1000"
                  style={{
                    width: `${progressOf(current)}%`,
                    backgroundColor: 'var(--accent-base)'
                  }}
                />
              </div>

              <div className="mb-5 flex items-baseline justify-between text-[12px]">
                <span style={{ color: 'var(--faint)' }}>
                  faltam <span className="font-mono">{formatDuration(minutesLeft(current))}</span>
                </span>
                <span style={{ color: 'var(--faint)' }}>
                  termina às <span className="font-mono">{formatHm(current.end)}</span>
                </span>
              </div>

              <Button
                className="w-full gap-1.5"
                onClick={() => toggleComplete.mutate(current.task.id)}
              >
                <Check className="size-4" />
                Concluir
              </Button>
            </div>
          )}
        </Panel>

        <Panel title="Linha do dia" meta={blocks.length || undefined}>
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!isLoading && blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Inbox className="mb-2 size-7" style={{ color: 'var(--faint)' }} />
              <p className="text-[12.5px] font-medium">Dia sem horários</p>
              <p className="mt-1 max-w-xs text-[11.5px]" style={{ color: 'var(--faint)' }}>
                Só tarefas com horário e duração entram na agenda.
              </p>
            </div>
          )}

          {sobreposto && (
            <p className="text-destructive mb-3 text-[11.5px]">
              Há tarefas com horários sobrepostos — duas coisas ao mesmo tempo.
            </p>
          )}

          <div className="space-y-1">
            {blocks.map((block) => {
              const categoria = block.task.categoryId
                ? categories.get(block.task.categoryId)
                : undefined
              const ehAgora = current?.task.id === block.task.id
              const passou = block.end.getTime() < agora.getTime()
              const concluida = block.task.status === 'done'
              const folga = gapAntesDe(block)

              return (
                <div key={block.task.id}>
                  {folga > 0 && (
                    <p
                      className="flex items-center gap-1.5 py-1 pl-[52px] text-[11px]"
                      style={{ color: 'var(--faint)' }}
                    >
                      <Coffee className="size-3" />
                      {formatDuration(folga)} livre
                    </p>
                  )}

                  <div
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors',
                      ehAgora
                        ? 'border-[color:var(--accent-base)] bg-accent'
                        : 'border-transparent',
                      (passou || concluida) && !ehAgora && 'opacity-45'
                    )}
                  >
                    <span
                      className="w-11 shrink-0 font-mono text-[11.5px]"
                      style={{ color: ehAgora ? 'var(--accent-base)' : 'var(--faint)' }}
                    >
                      {formatHm(block.start)}
                    </span>

                    {categoria ? (
                      <CategoryIcon
                        icon={categoria.icon}
                        color={categoria.color}
                        variant="plain"
                        className="size-3.5 shrink-0"
                      />
                    ) : (
                      <Clock className="size-3.5 shrink-0" style={{ color: 'var(--faint)' }} />
                    )}

                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[12.5px]',
                        ehAgora && 'font-semibold',
                        concluida && 'line-through'
                      )}
                    >
                      {block.task.title}
                    </span>

                    <span
                      className="shrink-0 font-mono text-[11px]"
                      style={{ color: 'var(--faint)' }}
                    >
                      {formatDuration(block.task.durationMinutes)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </>
  )
}
