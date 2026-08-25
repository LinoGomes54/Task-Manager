import { useState } from 'react'
import { Bell, CalendarClock, Check, CircleDot, Clock, Coffee, Inbox, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { useCurrentTask } from '@/hooks/use-current-task'
import { useToggleComplete, useTasks } from '@/hooks/use-tasks'
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
  dayRange,
  type TaskBlock
} from '@shared/agenda'
import { combineDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PlanDayDialog } from '@/components/tasks/PlanDayDialog'

/**
 * Playground: a agenda do dia.
 *
 * **Nao cronometra nada.** O que manda e o relogio: a tarefa em andamento e
 * aquela cujo horario ja comecou e ainda nao terminou. Um cronometro manual
 * exigiria lembrar de apertar play, e a agenda deixaria de refletir o dia real
 * no instante em que alguem esquecesse.
 */
export function PlaygroundPage(): React.JSX.Element {
  const [montandoDia, setMontandoDia] = useState(false)
  const { current, next, blocks, isLoading } = useCurrentTask()
  const { from, to } = dayRange()
  const { data: lembretes = [] } = useTasks({ from, to, kind: 'reminder' })
  const categories = useCategoryMap()
  const toggleComplete = useToggleComplete()
  const openNew = useTaskDialog((store) => store.openNew)

  const agora = new Date()
  const inicioDoDia = new Date(agora)
  inicioDoDia.setHours(0, 0, 0, 0)
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
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setMontandoDia(true)}>
              <CalendarClock className="size-4" />
              Montar o dia
            </Button>
            <Button
              onClick={() => openNew({ dueAt: combineDateTime(agora, formatHm(agora)) })}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Nova tarefa
            </Button>
          </div>
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
              // Um bloco que atravessou a meia-noite comeca no dia anterior. Sem
              // avisar, "23:00" na linha de hoje se le como hoje a noite.
              const comecouOntem = block.start.getTime() < inicioDoDia.getTime()

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
                      className="flex w-11 shrink-0 flex-col font-mono text-[11.5px] leading-tight"
                      style={{ color: ehAgora ? 'var(--accent-base)' : 'var(--faint)' }}
                    >
                      {formatHm(block.start)}
                      {comecouOntem && (
                        <span className="text-[9.5px]" style={{ color: 'var(--faint)' }}>
                          ontem
                        </span>
                      )}
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

      {/*
        Lembretes ficam numa faixa propria, fora da linha do dia: sao avisos
        pontuais, e coloca-los na agenda faria "tomar remedio" reservar um bloco
        de tempo que ele nao ocupa.
      */}
      <div className="mt-5">
        <Panel
          title="Lembretes de hoje"
          meta={lembretes.length || undefined}
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11.5px]"
              onClick={() =>
                openNew({ kind: 'reminder', dueAt: combineDateTime(agora, formatHm(agora)) })
              }
            >
              <Plus className="size-3.5" />
              novo
            </Button>
          }
        >
          {lembretes.length === 0 && (
            <p className="py-5 text-center text-[12px]" style={{ color: 'var(--faint)' }}>
              Nenhum lembrete hoje. Use para avisos rápidos: tomar remédio, beber água,
              alongar.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {lembretes.map((lembrete) => {
              const categoria = lembrete.categoryId
                ? categories.get(lembrete.categoryId)
                : undefined
              const feito = lembrete.status === 'done'
              const hora = lembrete.dueAt ? formatHm(new Date(lembrete.dueAt)) : null
              const passou = lembrete.dueAt
                ? new Date(lembrete.dueAt).getTime() < agora.getTime()
                : false

              return (
                <button
                  key={lembrete.id}
                  type="button"
                  onClick={() => toggleComplete.mutate(lembrete.id)}
                  title={feito ? 'Marcar como não feito' : 'Marcar como feito'}
                  className={cn(
                    'flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-2.5 transition-colors',
                    feito
                      ? 'opacity-45'
                      : passou
                        ? 'border-[color:var(--accent-base)]'
                        : 'hover:border-ring/40'
                  )}
                >
                  {categoria ? (
                    <CategoryIcon
                      icon={categoria.icon}
                      color={categoria.color}
                      variant="plain"
                      className="size-3.5 shrink-0"
                    />
                  ) : (
                    <Bell className="size-3.5 shrink-0" style={{ color: 'var(--faint)' }} />
                  )}

                  <span className={cn('text-[12.5px]', feito && 'line-through')}>
                    {lembrete.title}
                  </span>

                  {hora && (
                    <span className="font-mono text-[11px]" style={{ color: 'var(--faint)' }}>
                      {hora}
                    </span>
                  )}

                  {feito && <Check className="size-3.5 shrink-0" />}
                </button>
              )
            })}
          </div>
        </Panel>
      </div>
      <PlanDayDialog open={montandoDia} onOpenChange={setMontandoDia} />
    </>
  )
}
