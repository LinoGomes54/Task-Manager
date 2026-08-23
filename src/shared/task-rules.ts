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
