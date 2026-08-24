import { useNavigate } from 'react-router-dom'
import { Check, CircleDot } from 'lucide-react'
import { useCurrentTask } from '@/hooks/use-current-task'
import { useToggleComplete } from '@/hooks/use-tasks'
import { useCategoryMap } from '@/hooks/use-categories'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { formatHm, minutesLeft, progressOf, formatDuration } from '@shared/agenda'
import { cn } from '@/lib/utils'

/**
 * A tarefa que o horario diz estar acontecendo agora, no topo do app.
 *
 * Some quando nao ha nada em andamento — um espaco vazio permanente no cabecalho
 * so ocuparia lugar. Quando nao ha tarefa agora mas ha uma proxima, mostra a
 * proxima em tom discreto, para o dia continuar legivel de relance.
 */
export function CurrentTaskIndicator(): React.JSX.Element | null {
  const navigate = useNavigate()
  const { current, next } = useCurrentTask()
  const categories = useCategoryMap()
  const toggleComplete = useToggleComplete()

  if (!current && !next) return null

  const bloco = current ?? next!
  const emAndamento = current !== null
  const categoria = bloco.task.categoryId ? categories.get(bloco.task.categoryId) : undefined
  const restante = minutesLeft(bloco)
  const progresso = emAndamento ? progressOf(bloco) : 0

  return (
    <div
      className={cn(
        'relative flex min-w-0 max-w-[380px] items-center gap-2.5 overflow-hidden rounded-full border py-1 pr-1 pl-3',
        emAndamento ? 'border-[color:var(--accent-base)]' : 'border-border'
      )}
    >
      {/* Progresso do bloco pintado no fundo da pilula. */}
      {emAndamento && (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-1000"
          style={{
            width: `${progresso}%`,
            backgroundColor: 'color-mix(in srgb, var(--accent-base) 12%, transparent)'
          }}
        />
      )}

      <button
        type="button"
        onClick={() => navigate('/playground')}
        title={emAndamento ? 'Em andamento agora' : 'Próxima tarefa'}
        className="relative flex min-w-0 items-center gap-2"
      >
        {categoria ? (
          <CategoryIcon
            icon={categoria.icon}
            color={categoria.color}
            variant="plain"
            className="size-3.5 shrink-0"
          />
        ) : (
          <CircleDot
            className="size-3.5 shrink-0"
            style={{ color: emAndamento ? 'var(--accent-base)' : 'var(--faint)' }}
          />
        )}

        <span className="min-w-0 truncate text-[12.5px] font-medium">{bloco.task.title}</span>

        <span className="shrink-0 font-mono text-[11.5px]" style={{ color: 'var(--faint)' }}>
          {emAndamento
            ? `${formatDuration(restante)} · até ${formatHm(bloco.end)}`
            : `${formatHm(bloco.start)}`}
        </span>
      </button>

      {emAndamento && (
        <button
          type="button"
          onClick={() => toggleComplete.mutate(bloco.task.id)}
          title="Concluir esta tarefa"
          aria-label={`Concluir ${bloco.task.title}`}
          className="hover:bg-accent relative flex size-6 shrink-0 items-center justify-center rounded-full transition-colors"
        >
          <Check className="size-3.5" />
        </button>
      )}
    </div>
  )
}
