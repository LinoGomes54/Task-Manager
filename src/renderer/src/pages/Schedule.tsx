import { useMemo, useRef, useState } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Columns3, Inbox, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { useTasks, useUpdateTask } from '@/hooks/use-tasks'
import { useCategoryMap } from '@/hooks/use-categories'
import { useTaskDialog } from '@/stores/task-dialog.store'
import { blocksOf, formatDuration, formatHm } from '@shared/agenda'
import { cn } from '@/lib/utils'
import type { Task } from '@shared/types'

/**
 * Cronograma em blocos: o dia (ou a semana, ou o mes) como colunas empilhaveis.
 *
 * Cada tarefa vira um bloco arrastavel de uma coluna para outra. Soltar num dia
 * **muda o prazo** para aquele dia, mantendo o horario — e a mesma operacao que
 * editar a data no formulario, so que com a agenda inteira a vista.
 *
 * Os blocos sao ordenados por horario dentro da coluna e desenhados com altura
 * proporcional a duracao, ate um teto: sem o teto, dormir oito horas esmagaria
 * todo o resto do dia numa faixa de dois pixels.
 */

type Modo = 'dia' | 'semana' | 'mes'

const MODOS: Array<{ value: Modo; label: string }> = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' }
]

/** Altura do bloco: proporcional a duracao, com piso e teto legiveis. */
function alturaDe(minutos: number): number {
  return Math.round(Math.min(180, Math.max(52, minutos * 0.9)))
}

function chaveDoDia(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function SchedulePage(): React.JSX.Element {
  const [modo, setModo] = useState<Modo>('semana')
  const [ancora, setAncora] = useState(() => new Date())
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [alvo, setAlvo] = useState<string | null>(null)

  const categories = useCategoryMap()
  const openNew = useTaskDialog((store) => store.openNew)
  const openEdit = useTaskDialog((store) => store.openEdit)
  const updateTask = useUpdateTask()
  const arrastado = useRef<Task | null>(null)

  const dias = useMemo(() => {
    if (modo === 'dia') return [new Date(ancora)]
    if (modo === 'semana') {
      const inicio = startOfWeek(ancora, { locale: ptBR })
      return Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
    }
    const inicio = startOfMonth(ancora)
    const fim = endOfMonth(ancora)
    const total = fim.getDate()
    return Array.from({ length: total }, (_, i) => addDays(inicio, i))
  }, [modo, ancora])

  const janela = useMemo(() => {
    const de = new Date(dias[0])
    de.setHours(0, 0, 0, 0)
    const ate = new Date(dias[dias.length - 1])
    ate.setHours(23, 59, 59, 999)
    return { from: de.toISOString(), to: ate.toISOString() }
  }, [dias])

  const { data: tasks = [], isLoading } = useTasks({
    from: janela.from,
    to: janela.to,
    kind: 'task'
  })

  /** Tarefas por dia, já em ordem de horário. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, Task[]>()
    for (const task of tasks) {
      if (!task.dueAt) continue
      const chave = chaveDoDia(new Date(task.dueAt))
      const lista = mapa.get(chave) ?? []
      lista.push(task)
      mapa.set(chave, lista)
    }
    for (const lista of mapa.values()) {
      lista.sort(
        (a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()
      )
    }
    return mapa
  }, [tasks])

  function navegar(passo: number): void {
    if (modo === 'dia') setAncora(addDays(ancora, passo))
    else if (modo === 'semana') setAncora(addDays(ancora, passo * 7))
    else setAncora(addMonths(ancora, passo))
  }

  /**
   * Solta o bloco num dia: troca a DATA e preserva o horario.
   *
   * Mexer tambem no horario obrigaria a inventar um, e a coluna nao diz qual —
   * ela representa um dia inteiro, nao uma faixa da agenda.
   */
  function soltarEm(dia: Date): void {
    const task = arrastado.current
    arrastado.current = null
    setArrastando(null)
    setAlvo(null)
    if (!task?.dueAt) return

    const atual = new Date(task.dueAt)
    if (isSameDay(atual, dia)) return

    const novo = new Date(dia)
    novo.setHours(atual.getHours(), atual.getMinutes(), 0, 0)
    updateTask.mutate({ id: task.id, dueAt: novo.toISOString() })
  }

  const titulo =
    modo === 'dia'
      ? format(ancora, "EEEE, d 'de' MMMM", { locale: ptBR })
      : modo === 'semana'
        ? `${format(dias[0], "d 'de' MMM", { locale: ptBR })} — ${format(dias[6], "d 'de' MMM", { locale: ptBR })}`
        : format(ancora, "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <>
      <PageHeader
        title="Cronograma"
        description="Arraste os blocos entre os dias para remarcar."
        stats={titulo}
        action={
          <div className="flex items-center gap-2">
            <div className="bg-muted/60 flex items-center gap-1 rounded-lg p-1">
              {MODOS.map((opcao) => (
                <button
                  key={opcao.value}
                  type="button"
                  onClick={() => setModo(opcao.value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-[12.5px] transition-colors',
                    modo === opcao.value
                      ? 'bg-card font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opcao.label}
                </button>
              ))}
            </div>

            <Button variant="outline" size="icon" onClick={() => navegar(-1)} aria-label="Anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => setAncora(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => navegar(1)} aria-label="Próximo">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {!isLoading && (
        // Colunas rolam na horizontal quando nao cabem: no modo mes sao 28 a 31,
        // e espremer todas na largura da tela deixaria cada bloco ilegivel.
        <div className="flex gap-3 overflow-x-auto pb-3">
          {dias.map((dia) => {
            const chave = chaveDoDia(dia)
            const lista = porDia.get(chave) ?? []
            const hoje = isSameDay(dia, new Date())
            const recebendo = alvo === chave

            return (
              <section
                key={chave}
                onDragOver={(event) => {
                  event.preventDefault()
                  if (alvo !== chave) setAlvo(chave)
                }}
                onDragLeave={() => setAlvo((atual) => (atual === chave ? null : atual))}
                onDrop={() => soltarEm(dia)}
                className={cn(
                  'bg-card flex min-h-72 shrink-0 flex-col rounded-xl border p-2.5 transition-colors',
                  modo === 'dia' ? 'w-full' : 'w-[248px]',
                  hoje && 'border-[color:var(--accent-base)]',
                  recebendo && 'border-dashed bg-accent'
                )}
              >
                <header className="mb-2 flex items-baseline justify-between px-1">
                  <div className="min-w-0">
                    <p
                      className={cn('truncate text-[13px] font-semibold', hoje && 'text-foreground')}
                      style={!hoje ? { color: 'var(--faint)' } : undefined}
                    >
                      {format(dia, 'EEEE', { locale: ptBR })}
                    </p>
                    <p className="font-mono text-[11px]" style={{ color: 'var(--faint)' }}>
                      {format(dia, "d 'de' MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const quando = new Date(dia)
                      quando.setHours(9, 0, 0, 0)
                      openNew({ dueAt: quando.toISOString() })
                    }}
                    title={`Nova tarefa em ${format(dia, 'd/MM')}`}
                    className="hover:text-foreground shrink-0 transition-colors"
                    style={{ color: 'var(--faint)' }}
                  >
                    <Plus className="size-4" />
                  </button>
                </header>

                <div className="flex flex-1 flex-col gap-1.5">
                  {lista.length === 0 && (
                    <p
                      className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-[11.5px]"
                      style={{ color: 'var(--faint)' }}
                    >
                      {recebendo ? 'Soltar aqui' : 'Livre'}
                    </p>
                  )}

                  {lista.map((task) => {
                    const categoria = task.categoryId
                      ? categories.get(task.categoryId)
                      : undefined
                    const blocos = blocksOf(task)
                    const inicio = blocos[0]?.start ?? new Date(task.dueAt!)
                    const feita = task.status === 'done'

                    return (
                      <article
                        key={task.id}
                        draggable
                        onDragStart={() => {
                          arrastado.current = task
                          setArrastando(task.id)
                        }}
                        onDragEnd={() => {
                          arrastado.current = null
                          setArrastando(null)
                          setAlvo(null)
                        }}
                        onDoubleClick={() => openEdit(task)}
                        title={`${task.title} — duplo clique para editar`}
                        style={{ minHeight: alturaDe(task.durationMinutes) }}
                        className={cn(
                          'flex cursor-grab flex-col rounded-lg border px-2.5 py-2 transition-opacity active:cursor-grabbing',
                          feita && 'opacity-50',
                          arrastando === task.id && 'opacity-40',
                          task.isImportant && 'border-[color:var(--accent-base)]'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {categoria ? (
                            <CategoryIcon
                              icon={categoria.icon}
                              color={categoria.color}
                              variant="plain"
                              className="size-3.5 shrink-0"
                            />
                          ) : null}
                          <span
                            className="font-mono text-[11px]"
                            style={{ color: 'var(--faint)' }}
                          >
                            {formatHm(inicio)}
                          </span>
                          <span
                            className="ml-auto font-mono text-[10.5px]"
                            style={{ color: 'var(--faint)' }}
                          >
                            {formatDuration(task.durationMinutes)}
                          </span>
                        </div>

                        <p
                          className={cn(
                            'mt-1 text-[12.5px] leading-snug font-medium',
                            feita && 'line-through'
                          )}
                        >
                          {task.title}
                        </p>

                        {task.breakAfterMinutes > 0 && (
                          <p
                            className="mt-auto pt-1 text-[10.5px]"
                            style={{ color: 'var(--faint)' }}
                          >
                            +{task.breakAfterMinutes}min de descanso
                          </p>
                        )}
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {!isLoading && tasks.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
          <Inbox className="mb-2 size-7" style={{ color: 'var(--faint)' }} />
          <p className="text-[13px] font-medium">Nenhuma tarefa neste período</p>
          <p className="mt-1 max-w-sm text-[12px]" style={{ color: 'var(--faint)' }}>
            Use o <Columns3 className="inline size-3.5" /> de cada dia para criar uma tarefa já
            com a data certa.
          </p>
        </div>
      )}
    </>
  )
}
