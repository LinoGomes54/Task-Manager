import { useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Check, Target, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { useTodayTasks, useToggleComplete } from '@/hooks/use-tasks'
import { useCategoryMap } from '@/hooks/use-categories'
import { useSettings } from '@/hooks/use-settings'
import { useTimerTick } from '@/hooks/use-timer-tick'
import { useTimer, PRESETS, formatClock } from '@/stores/timer.store'
import { playAlarmSound } from '@/lib/alarm'
import { cn } from '@/lib/utils'

/**
 * Playground: uma sessao de foco cronometrada sobre uma tarefa.
 *
 * O relogio conta **para tras** a partir do alvo escolhido, porque o que importa
 * durante a sessao e quanto falta, nao quanto ja passou. O tempo decorrido fica
 * na legenda, para quem quiser conferir.
 */
export function PlaygroundPage(): React.JSX.Element {
  const elapsed = useTimerTick()
  const { taskId, targetMinutes, startedAt, sessions, loggedSeconds } = useTimer()
  const { toggle, reset, finish, selectTask, setTarget } = useTimer()

  const { today, overdue, noDueDate, isLoading } = useTodayTasks()
  const categories = useCategoryMap()
  const { data: settings } = useSettings()
  const toggleComplete = useToggleComplete()

  const fila = [...overdue, ...today, ...noDueDate].filter((t) => t.status !== 'done')
  const emFoco = fila.find((t) => t.id === taskId) ?? null

  const totalSeconds = targetMinutes * 60
  const restante = Math.max(0, totalSeconds - elapsed)
  const progresso = Math.min(100, (elapsed / totalSeconds) * 100)
  const rodando = startedAt !== null
  const completou = elapsed >= totalSeconds

  // Avisa uma unica vez quando o alvo e atingido. O `useRef` evita que o toast
  // se repita a cada pulso do cronometro depois que o tempo estoura.
  const avisou = useRef(false)
  useEffect(() => {
    if (!completou) {
      avisou.current = false
      return
    }
    if (avisou.current) return
    avisou.current = true

    if (settings?.soundEnabled ?? true) playAlarmSound()
    toast.success(`Sessão de ${targetMinutes} min concluída!`, { duration: 8000 })
  }, [completou, targetMinutes, settings?.soundEnabled])

  function handleFinish(): void {
    const segundos = finish()

    if (emFoco) {
      toggleComplete.mutate(emFoco.id)
      selectTask(null)
    }

    if (segundos >= 60) {
      toast.success(`${formatClock(segundos)} de foco registrados`)
    }
  }

  return (
    <>
      <PageHeader
        title="Playground"
        description="Uma tarefa por vez, com o cronômetro correndo."
        stats={
          sessions > 0
            ? `${formatClock(loggedSeconds)} focados · ${sessions} ${sessions === 1 ? 'sessão' : 'sessões'}`
            : undefined
        }
      />

      <div className="grid gap-5 @2xl:grid-cols-[minmax(0,1fr)_minmax(300px,440px)]">
        <Panel title="Foco" meta={emFoco ? undefined : 'sessão livre'}>
          <div className="flex flex-col items-center py-4">
            <p
              className="mb-5 max-w-sm text-center text-[13px] font-medium"
              style={emFoco ? undefined : { color: 'var(--faint)' }}
            >
              {emFoco ? emFoco.title : 'Escolha uma tarefa na fila ao lado'}
            </p>

            {/* Anel de progresso com conic-gradient, como no design. */}
            <div
              className="flex size-[210px] items-center justify-center rounded-full transition-all"
              style={{
                background: `conic-gradient(var(--accent-base) ${progresso}%, var(--border) 0)`
              }}
            >
              <div className="bg-card flex size-[186px] flex-col items-center justify-center rounded-full">
                <p
                  className={cn(
                    'text-[38px] leading-none font-semibold tabular-nums',
                    completou && 'text-primary'
                  )}
                >
                  {formatClock(restante)}
                </p>
                <p className="mt-2 text-[11px]" style={{ color: 'var(--faint)' }}>
                  {rodando
                    ? `em andamento · ${formatClock(elapsed)}`
                    : elapsed > 0
                      ? `pausado · ${formatClock(elapsed)}`
                      : `sessão de ${targetMinutes} min`}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              {PRESETS.map((minutos) => (
                <button
                  key={minutos}
                  type="button"
                  onClick={() => setTarget(minutos)}
                  className={cn(
                    'rounded-full border px-3 py-[5px] text-[12px] transition-colors',
                    targetMinutes === minutos
                      ? 'border-[color:var(--accent-base)] bg-accent'
                      : 'hover:bg-accent/60 border-border'
                  )}
                >
                  {minutos} min
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button
                onClick={toggle}
                className="gap-1.5 px-5"
                variant={rodando ? 'destructive' : 'default'}
              >
                {rodando ? <Pause className="size-4" /> : <Play className="size-4" />}
                {rodando ? 'Pausar' : elapsed > 0 ? 'Continuar' : 'Iniciar'}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={reset}
                disabled={elapsed === 0}
                title="Zerar cronômetro"
                aria-label="Zerar cronômetro"
              >
                <RotateCcw className="size-4" />
              </Button>

              <Button
                variant="outline"
                className="gap-1.5"
                onClick={handleFinish}
                disabled={elapsed === 0}
                title={emFoco ? 'Concluir a tarefa e encerrar a sessão' : 'Encerrar a sessão'}
              >
                <Check className="size-4" />
                {emFoco ? 'Concluir' : 'Encerrar'}
              </Button>
            </div>

            {emFoco && (
              <p className="mt-3 text-[11px]" style={{ color: 'var(--faint)' }}>
                “Concluir” marca a tarefa como feita e registra o tempo.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Fila do dia" meta={fila.length || undefined}>
          {isLoading && (
            <p className="py-6 text-center text-[11.5px]" style={{ color: 'var(--faint)' }}>
              Carregando…
            </p>
          )}

          {!isLoading && fila.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Inbox className="mb-2 size-7" style={{ color: 'var(--faint)' }} />
              <p className="text-[12.5px] font-medium">Nada na fila</p>
              <p className="mt-1 max-w-xs text-[11.5px]" style={{ color: 'var(--faint)' }}>
                Tarefas atrasadas, de hoje e sem prazo aparecem aqui.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            {fila.map((task) => {
              const categoria = task.categoryId ? categories.get(task.categoryId) : undefined
              const ativa = task.id === taskId

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => selectTask(ativa ? null : task.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[10px] border px-[11px] py-2 text-left transition-colors',
                    ativa
                      ? 'border-[color:var(--accent-base)] bg-accent'
                      : 'hover:border-ring/40 bg-card'
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
                    <Target className="size-3.5 shrink-0" style={{ color: 'var(--faint)' }} />
                  )}

                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                    {task.title}
                  </span>

                  {ativa && (
                    <span
                      className="shrink-0 font-mono text-[10.5px]"
                      style={{ color: 'var(--accent-base)' }}
                    >
                      em foco
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Panel>
      </div>
    </>
  )
}
