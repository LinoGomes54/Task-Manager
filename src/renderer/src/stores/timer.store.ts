import { create } from 'zustand'

/**
 * Cronometro de foco do Playground.
 *
 * O estado vive num store global, e nao na pagina, para a sessao **continuar
 * correndo enquanto o usuario navega** pelo app — sair da tela do cronometro
 * para consultar o calendario nao pode zerar a contagem.
 *
 * O tempo nao e guardado em um contador que decrementa: guardamos o instante em
 * que a sessao comecou (`startedAt`) e quanto ja havia sido acumulado antes da
 * ultima pausa. O decorrido e sempre derivado do relogio do sistema, entao a
 * contagem nao atrasa se a aba ficar em segundo plano ou o `setInterval` for
 * estrangulado pelo navegador.
 *
 * A sessao e proposital **nao persistida** entre aberturas do app: um cronometro
 * que retoma sozinho horas depois, contando um tempo em que ninguem trabalhou,
 * registraria um foco que nao existiu.
 */

export const PRESETS = [15, 25, 50] as const

interface TimerStore {
  /** Tarefa em foco. `null` = sessao livre, sem tarefa associada. */
  taskId: string | null
  targetMinutes: number
  /** `Date.now()` do inicio do trecho atual; `null` quando pausado. */
  startedAt: number | null
  /** Segundos acumulados nos trechos anteriores. */
  accumulated: number
  /** Sessoes concluidas nesta abertura do app. */
  sessions: number
  /** Total de segundos focados nesta abertura do app. */
  loggedSeconds: number

  start: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  /** Encerra a sessao e devolve os segundos focados, para quem chamou registrar. */
  finish: () => number
  selectTask: (taskId: string | null) => void
  setTarget: (minutes: number) => void
}

export const useTimer = create<TimerStore>((set, get) => ({
  taskId: null,
  targetMinutes: 25,
  startedAt: null,
  accumulated: 0,
  sessions: 0,
  loggedSeconds: 0,

  start: () => {
    if (get().startedAt) return
    set({ startedAt: Date.now() })
  },

  pause: () => {
    const { startedAt, accumulated } = get()
    if (!startedAt) return
    set({ accumulated: accumulated + (Date.now() - startedAt) / 1000, startedAt: null })
  },

  toggle: () => (get().startedAt ? get().pause() : get().start()),

  reset: () => set({ startedAt: null, accumulated: 0 }),

  finish: () => {
    const elapsed = elapsedSeconds(get())
    set((s) => ({
      startedAt: null,
      accumulated: 0,
      // Menos de um minuto nao conta como sessao — normalmente e um clique errado.
      sessions: s.sessions + (elapsed >= 60 ? 1 : 0),
      loggedSeconds: s.loggedSeconds + elapsed
    }))
    return elapsed
  },

  selectTask: (taskId) => set({ taskId, startedAt: null, accumulated: 0 }),

  setTarget: (targetMinutes) => set({ targetMinutes, startedAt: null, accumulated: 0 })
}))

/** Segundos decorridos, derivados do relogio — nunca de um contador acumulado. */
export function elapsedSeconds(state: {
  startedAt: number | null
  accumulated: number
}): number {
  const running = state.startedAt ? (Date.now() - state.startedAt) / 1000 : 0
  return Math.floor(state.accumulated + running)
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
