/**
 * Som do alarme.
 *
 * O padrao e sintetizado pela Web Audio API: nao adiciona binario ao pacote,
 * respeita a CSP (que bloqueia `media-src` externo) e o volume fica previsivel
 * em qualquer maquina.
 *
 * Quem escolher um arquivo proprio em Configuracoes ouve o dele. O `data:` URI
 * fica guardado aqui porque o alarme toca a partir de um evento do processo
 * principal, fora de qualquer componente React — nao ha hook para consultar
 * nesse instante.
 */

let somEscolhido: string | null = null

/** Define (ou limpa) o som proprio. Chamado quando a personalizacao carrega. */
export function setCustomAlarmSound(dataUrl: string | null): void {
  somEscolhido = dataUrl
}

let context: AudioContext | null = null

function getContext(): AudioContext {
  context ??= new AudioContext()
  return context
}

/** Dois bipes curtos, discretos o bastante para nao assustar. */
export function playAlarmSound(): void {
  if (somEscolhido) {
    try {
      const audio = new Audio(somEscolhido)
      audio.volume = 0.8
      void audio.play()
      return
    } catch {
      // Arquivo invalido ou codec sem suporte: cai nos bipes sintetizados, que
      // sempre funcionam — ficar em silencio seria pior do que soar diferente.
    }
  }

  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') void ctx.resume()

    const beep = (startAt: number, frequency: number): void => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency

      gain.gain.setValueAtTime(0, startAt)
      gain.gain.linearRampToValueAtTime(0.18, startAt + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.28)

      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start(startAt)
      oscillator.stop(startAt + 0.3)
    }

    const now = ctx.currentTime
    beep(now, 880)
    beep(now + 0.32, 1174)
  } catch {
    // Sem contexto de audio disponivel, o toast do Windows ja avisa o usuario.
  }
}
