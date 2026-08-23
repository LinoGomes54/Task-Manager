import { useEffect, useState } from 'react'
import { useTimer, elapsedSeconds } from '@/stores/timer.store'

/**
 * Mantem a tela do cronometro atualizada e devolve os segundos decorridos.
 *
 * O store guarda o instante de inicio, nao um contador — entao o componente
 * precisa de um pulso para redesenhar. Meio segundo em vez de um: com pulso de
 * 1s, o arredondamento faz o relogio as vezes pular um numero.
 *
 * So corre com a sessao ativa; pausado, nao ha nada mudando para redesenhar.
 */
export function useTimerTick(): number {
  const startedAt = useTimer((s) => s.startedAt)
  const accumulated = useTimer((s) => s.accumulated)
  const [, force] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => force((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [startedAt])

  return elapsedSeconds({ startedAt, accumulated })
}
