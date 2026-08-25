import { useNavigate } from 'react-router-dom'
import { Check, CircleDot } from 'lucide-react'
import { useCurrentTask } from '@/hooks/use-current-task'
import { useToggleComplete } from '@/hooks/use-tasks'
import { useCategoryMap } from '@/hooks/use-categories'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { formatHm, minutesLeft, progressOf, formatDuration } from '@shared/agenda'
import { isAutoCompleteRunning } from '@shared/task-rules'
import { cn } from '@/lib/utils'

/**
 * Card da tarefa que o horario diz estar acontecendo agora, no topo do app.
 *
 * O card inteiro leva ao Playground — e ali que o dia esta detalhado, entao
 * qualquer canto do card e um caminho para ele. O botao de concluir para a
 * propagacao: quem clica no visto quer marcar a tarefa, nao trocar de tela.
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
  // Sem visto quando a tarefa se fecha sozinha: oferecer o botao e prometer uma
  // acao que o backend recusa.
  const podeConcluir = emAndamento && !isAutoCompleteRunning(bloco.task)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate('/playground')}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigate('/playground')
        }
      }}
      title={emAndamento ? 'Em andamento agora — abrir o Playground' : 'Próxima tarefa'}
      className={cn(
        'relative flex min-w-0 max-w-[380px] cursor-pointer items-center gap-2.5 overflow-hidden rounded-full border py-1.5 pl-3.5 transition-colors',
        // Sem o botao de concluir, o `pr` curto existia so para acomoda-lo: o
        // horario encostava na borda. Com botao, ele mesmo faz o espaco.
        podeConcluir ? 'pr-1.5' : 'pr-3.5',
        emAndamento ? 'border-[color:var(--accent-base)]' : 'border-border hover:border-ring/40'
      )}
    >
      {/* Progresso do bloco pintado no fundo do card. */}
      {emAndamento && (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-1000"
          style={{
            width: `${progresso}%`,
            backgroundColor: 'color-mix(in srgb, var(--accent-base) 12%, transparent)'
          }}
        />
      )}

      {categoria ? (
        <CategoryIcon
          icon={categoria.icon}
          color={categoria.color}
          variant="plain"
          className="relative size-3.5 shrink-0"
        />
      ) : (
        <CircleDot
          className="relative size-3.5 shrink-0"
          style={{ color: emAndamento ? 'var(--accent-base)' : 'var(--faint)' }}
        />
      )}

      <span className="relative min-w-0 truncate text-[12.5px] font-medium">
        {bloco.task.title}
      </span>

      <span
        className="relative shrink-0 font-mono text-[11.5px]"
        style={{ color: 'var(--faint)' }}
      >
        {emAndamento
          ? `${formatDuration(restante)} · até ${formatHm(bloco.end)}`
          : `${formatHm(bloco.start)}`}
      </span>

      {podeConcluir && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            toggleComplete.mutate(bloco.task.id)
          }}
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
