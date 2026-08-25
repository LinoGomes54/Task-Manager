import { useEffect, useState } from 'react'

/**
 * Contagem regressiva ate um instante, em segundos.
 *
 * O pulso e de 1 segundo — diferente do resto do app, que bate a cada 15 — porque
 * aqui o segundo e o que esta na tela: um cronometro que trava por quinze
 * segundos e depois pula parece quebrado.
 *
 * Nao ha play nem pause de proposito. O que manda e o relogio: a tarefa comeca e
 * termina no horario que ela tem, e um cronometro manual passaria a mentir no
 * instante em que alguem esquecesse de apertar o botao.
 */
export function useCountdown(target: Date | null): number {
  const alvo = target ? target.getTime() : null

  const [restante, setRestante] = useState(() =>
    alvo === null ? 0 : Math.max(0, Math.ceil((alvo - Date.now()) / 1000))
  )

  useEffect(() => {
    if (alvo === null) {
      setRestante(0)
      return
    }

    const calcular = (): number => Math.max(0, Math.ceil((alvo - Date.now()) / 1000))
    setRestante(calcular())

    // Recalculamos a partir do relogio a cada tique em vez de decrementar um
    // contador: com a aba em segundo plano o navegador atrasa os timers, e um
    // contador decrescido perderia segundos que nunca voltariam.
    const id = setInterval(() => setRestante(calcular()), 1000)
    return () => clearInterval(id)
  }, [alvo])

  return restante
}

/** `1h04:07`, `24:31`, `0:09` — a maior unidade so aparece quando existe. */
export function formatCountdown(totalSeconds: number): string {
  const seguro = Math.max(0, Math.floor(totalSeconds))
  const horas = Math.floor(seguro / 3600)
  const minutos = Math.floor((seguro % 3600) / 60)
  const segundos = seguro % 60

  const mm = String(minutos).padStart(2, '0')
  const ss = String(segundos).padStart(2, '0')

  return horas > 0 ? `${horas}h${mm}:${ss}` : `${minutos}:${ss}`
}
