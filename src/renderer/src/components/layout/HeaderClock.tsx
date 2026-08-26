import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Relogio e data do dia, no topo do app.
 *
 * O pulso se alinha ao minuto seguinte em vez de bater a cada segundo: o relogio
 * mostra horas e minutos, entao um tique por segundo redesenharia sessenta vezes
 * para trocar um digito. Reagendar a cada virada tambem evita o desvio que um
 * `setInterval(60000)` acumula, que faria o minuto virar cada vez mais tarde.
 */
export function HeaderClock(): React.JSX.Element {
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>

    const agendar = (): void => {
      const restaNoMinuto = 60_000 - (Date.now() % 60_000)
      id = setTimeout(() => {
        setAgora(new Date())
        agendar()
      }, restaNoMinuto)
    }

    agendar()
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="flex min-w-0 flex-col items-center leading-none">
      <span className="text-[26px] font-semibold tabular-nums">{format(agora, 'HH:mm')}</span>
      <span className="mt-1 truncate text-[12px]" style={{ color: 'var(--faint)' }}>
        {format(agora, "EEEE, d 'de' MMMM", { locale: ptBR })}
      </span>
    </div>
  )
}
