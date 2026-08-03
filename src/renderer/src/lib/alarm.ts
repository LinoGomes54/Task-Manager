/**
 * Som do alarme, gerado pela Web Audio API.
 *
 * Optamos por sintetizar em vez de embutir um .mp3: nao adiciona binario ao
 * pacote, respeita a CSP (que bloqueia `media-src` externo) e o volume fica
 * previsivel em qualquer maquina.
 */

let context: AudioContext | null = null

function getContext(): AudioContext {
  context ??= new AudioContext()
  return context
}

/** Dois bipes curtos, discretos o bastante para nao assustar. */
export function playAlarmSound(): void {
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
