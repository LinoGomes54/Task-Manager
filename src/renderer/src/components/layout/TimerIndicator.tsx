import { useNavigate } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { useTimerTick } from '@/hooks/use-timer-tick'
import { useTimer, formatClock } from '@/stores/timer.store'
import { cn } from '@/lib/utils'

/**
 * Sessao de foco em andamento, visivel de qualquer tela.
 *
 * Sem isso, sair do Playground faria a sessao virar invisivel — ela continuaria
 * correndo, mas o usuario nao teria como saber nem pausar sem voltar la.
 *
 * Some quando nao ha sessao: um cronometro zerado no topo seria so ruido.
 */
export function TimerIndicator(): React.JSX.Element | null {
  const elapsed = useTimerTick()
  const navigate = useNavigate()
  const { startedAt, targetMinutes, toggle } = useTimer()

  const rodando = startedAt !== null
  if (!rodando && elapsed === 0) return null

  const restante = Math.max(0, targetMinutes * 60 - elapsed)

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-1 py-1 pl-2.5',
        rodando ? 'border-[color:var(--accent-base)]' : 'border-border'
      )}
    >
      <button
        type="button"
        onClick={() => navigate('/playground')}
        title="Abrir o Playground"
        className="font-mono text-[12px] tabular-nums"
        style={rodando ? { color: 'var(--accent-base)' } : { color: 'var(--faint)' }}
      >
        {formatClock(restante)}
      </button>

      <button
        type="button"
        onClick={toggle}
        aria-label={rodando ? 'Pausar sessão' : 'Continuar sessão'}
        title={rodando ? 'Pausar sessão' : 'Continuar sessão'}
        className="hover:bg-accent flex size-6 items-center justify-center rounded-full transition-colors"
      >
        {rodando ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </button>
    </div>
  )
}
