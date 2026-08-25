import type { Task } from './types'

/**
 * Regras de negocio que os dois processos precisam aplicar.
 *
 * Vive em `shared/` porque o processo principal usa para **recusar** a operacao e
 * o renderer usa para **desabilitar** o controle antes de o usuario tentar. Se a
 * regra morasse so num lado, a interface ofereceria uma acao que o backend nega.
 */

/**
 * Uma repeticao so pode ser concluida quando ja chegou a vez dela.
 *
 * Sem isso, concluir a ocorrencia de amanha geraria a de depois de amanha, e a
 * fila de repeticoes andaria para frente sem o trabalho ter sido feito.
 *
 * Tarefas **atrasadas continuam liberadas** de proposito: uma diaria de ontem que
 * voce esqueceu de marcar ficaria travada para sempre.
 */
export function isFutureRecurrence(task: Task, lockEnabled: boolean): boolean {
  if (!lockEnabled) return false
  if (task.recurrence === 'none') return false
  if (task.status === 'done') return false // reabrir e sempre permitido
  if (!task.dueAt) return false

  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return new Date(task.dueAt).getTime() > endOfToday.getTime()
}

export const FUTURE_RECURRENCE_MESSAGE =
  'Esta repetição ainda não chegou. Você só pode concluí-la a partir do dia do prazo — ' +
  'para mudar isso, desative a trava em Configurações.'

/**
 * Uma tarefa de conclusao automatica so pode ser marcada depois que o tempo dela
 * acaba.
 *
 * Marcar antes contradiz o proprio motivo de existir da opcao: se voce ligou
 * "concluir automaticamente" em dormir, dizer as 2h da manha que ja dormiu as
 * oito horas e uma afirmacao falsa que o app aceitaria sem questionar.
 *
 * Reabrir continua liberado — como em toda regra daqui, o bloqueio e so no
 * sentido de concluir.
 */
export function isAutoCompleteRunning(task: Task, at: Date = new Date()): boolean {
  if (!task.autoComplete) return false
  if (task.status === 'done') return false
  if (!task.dueAt) return false

  const fim = new Date(task.dueAt).getTime() + Math.max(1, task.durationMinutes) * 60_000
  return fim > at.getTime()
}

export const AUTO_COMPLETE_MESSAGE =
  'Esta tarefa se conclui sozinha quando o tempo dela acabar. Para marcá-la na mão, ' +
  'desligue “Concluir automaticamente” na edição da tarefa.'

/**
 * Motivo pelo qual a tarefa nao pode ser concluida agora, ou `null` se pode.
 *
 * Reune as travas num lugar so para que interface e backend nunca discordem
 * sobre qual delas se aplica — e para o tooltip poder mostrar o motivo certo.
 */
export function completionBlock(task: Task, lockFutureRecurring: boolean): string | null {
  if (isFutureRecurrence(task, lockFutureRecurring)) return FUTURE_RECURRENCE_MESSAGE
  if (isAutoCompleteRunning(task)) return AUTO_COMPLETE_MESSAGE
  return null
}
