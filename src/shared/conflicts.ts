import { blocksOf, formatHm, type TaskBlock } from './agenda'
import type { Task } from './types'

/**
 * Choque de horario entre tarefas.
 *
 * Vive em `shared/` como as outras regras: o processo principal usa para
 * **recusar** a gravacao e o formulario usa para **avisar antes** de salvar. Se
 * a checagem morasse so no formulario, uma tarefa criada pelo encadeamento do
 * dia ou vinda da sincronizacao entraria por cima de outra sem ninguem notar.
 */

export interface Conflito {
  /** A tarefa ja existente que ocupa o horario. */
  task: Task
  start: Date
  end: Date
}

/** Intervalo que a tarefa realmente ocupa, incluindo o descanso que ela pede. */
export interface Ocupacao {
  start: Date
  end: Date
  /** Fim do bloco sem contar o descanso, para as mensagens. */
  endSemDescanso: Date
}

/**
 * Quanto tempo a tarefa toma da agenda.
 *
 * O descanso entra na conta porque ele **e** tempo ocupado: encaixar a proxima
 * tarefa dentro da folga da anterior anula a folga, e a agenda volta a ser uma
 * fila sem respiro. Marcar descanso zero e o jeito de dizer "pode encostar".
 */
export function ocupacaoDe(task: Task): Ocupacao | null {
  const blocos = blocksOf(task)
  if (blocos.length === 0) return null

  const start = blocos[0].start
  const endSemDescanso = blocos[blocos.length - 1].end
  const descanso = Math.max(0, task.breakAfterMinutes) * 60_000

  return { start, end: new Date(endSemDescanso.getTime() + descanso), endSemDescanso }
}

function seCruzam(a: Ocupacao, b: Ocupacao): boolean {
  // Encostar nao e cruzar: uma tarefa que termina 10:00 e outra que comeca 10:00
  // convivem. So ha choque quando ha sobreposicao de verdade.
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime()
}

/**
 * Tarefas ja existentes cujo horario colide com o da tarefa informada.
 *
 * Lembretes e datas marcadas ficam de fora: nenhum dos dois ocupa tempo, entao
 * "tomar remedio as 14h" pode coexistir com qualquer coisa.
 */
export function conflitosDe(candidata: Task, existentes: Task[]): Conflito[] {
  const alvo = ocupacaoDe(candidata)
  if (!alvo) return []

  const conflitos: Conflito[] = []
  for (const outra of existentes) {
    if (outra.id === candidata.id) continue
    if (outra.status === 'done') continue

    const ocupacao = ocupacaoDe(outra)
    if (!ocupacao || !seCruzam(alvo, ocupacao)) continue

    conflitos.push({ task: outra, start: ocupacao.start, end: ocupacao.endSemDescanso })
  }

  return conflitos.sort((a, b) => a.start.getTime() - b.start.getTime())
}

/** A proxima tarefa a comecar depois do fim da candidata. */
export function proximaDepoisDe(candidata: Task, existentes: Task[]): TaskBlock | null {
  const alvo = ocupacaoDe(candidata)
  if (!alvo) return null

  const seguintes = existentes
    .filter((t) => t.id !== candidata.id && t.status !== 'done')
    .flatMap(blocksOf)
    .filter((b) => b.start.getTime() >= alvo.endSemDescanso.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  return seguintes[0] ?? null
}

export function mensagemDeConflito(conflitos: Conflito[]): string {
  if (conflitos.length === 0) return ''

  const primeiro = conflitos[0]
  const janela = `${formatHm(primeiro.start)}–${formatHm(primeiro.end)}`
  const resto =
    conflitos.length > 1
      ? ` (e mais ${conflitos.length - 1} ${conflitos.length === 2 ? 'tarefa' : 'tarefas'})`
      : ''

  return `Esse horário já é de “${primeiro.task.title}”, das ${janela}${resto}.`
}
