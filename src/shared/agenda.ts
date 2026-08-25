import type { Task } from './types'

/**
 * Agenda do dia, derivada das proprias tarefas.
 *
 * Cada tarefa com prazo tem um **inicio** (`dueAt`) e uma **duracao**; o fim sai
 * da soma dos dois. Nao existe uma tabela de agenda separada: a lista do dia e
 * simplesmente as tarefas daquele dia ordenadas por horario.
 *
 * Vive em `shared/` porque o renderer usa para desenhar a linha do tempo e o
 * processo principal usa para saber o que esta em andamento agora.
 */

export interface TaskBlock {
  task: Task
  start: Date
  end: Date
}

/** Intervalo ocioso entre duas tarefas — so aparece quando ha folga de verdade. */
export interface GapBlock {
  start: Date
  end: Date
  minutes: number
}

export function blockOf(task: Task): TaskBlock | null {
  if (!task.dueAt) return null
  // Lembrete avisa e some: nao ocupa faixa na linha do dia nem conta como tempo.
  if (task.kind === 'reminder') return null
  const start = new Date(task.dueAt)
  const end = new Date(start.getTime() + Math.max(1, task.durationMinutes) * 60_000)
  return { task, start, end }
}

/** Blocos do dia, em ordem cronologica. Tarefas sem prazo ficam de fora. */
export function buildDaySchedule(tasks: Task[]): TaskBlock[] {
  return tasks
    .map(blockOf)
    .filter((b): b is TaskBlock => b !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

/**
 * O que deveria estar acontecendo agora.
 *
 * Tarefas concluidas sao ignoradas: se voce ja terminou a academia antes da
 * hora, o app nao deve continuar dizendo que voce esta na academia.
 */
export function currentBlock(blocks: TaskBlock[], at: Date = new Date()): TaskBlock | null {
  const agora = at.getTime()
  return (
    blocks.find(
      (b) =>
        b.task.status !== 'done' && agora >= b.start.getTime() && agora < b.end.getTime()
    ) ?? null
  )
}

/** A proxima tarefa a comecar, para o app dizer o que vem depois. */
export function nextBlock(blocks: TaskBlock[], at: Date = new Date()): TaskBlock | null {
  const agora = at.getTime()
  return blocks.find((b) => b.task.status !== 'done' && b.start.getTime() > agora) ?? null
}

/** Folgas entre um bloco e o seguinte, para a linha do tempo mostrar os vazios. */
export function gapsBetween(blocks: TaskBlock[]): GapBlock[] {
  const gaps: GapBlock[] = []
  for (let i = 0; i < blocks.length - 1; i++) {
    const fim = blocks[i].end
    const proximo = blocks[i + 1].start
    const minutos = Math.round((proximo.getTime() - fim.getTime()) / 60_000)
    if (minutos > 0) gaps.push({ start: fim, end: proximo, minutes: minutos })
  }
  return gaps
}

/** `true` quando dois blocos se sobrepoem — a agenda esta pedindo o impossivel. */
export function hasOverlap(blocks: TaskBlock[]): boolean {
  for (let i = 0; i < blocks.length - 1; i++) {
    if (blocks[i].end.getTime() > blocks[i + 1].start.getTime()) return true
  }
  return false
}

export function totalMinutes(blocks: TaskBlock[]): number {
  return blocks.reduce((sum, b) => sum + Math.max(1, b.task.durationMinutes), 0)
}

export function formatHm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Duracao legivel: 25min, 1h, 1h30. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m}min`
  const horas = Math.floor(m / 60)
  const resto = m % 60
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`
}

/** Minutos que faltam para o bloco acabar. */
export function minutesLeft(block: TaskBlock, at: Date = new Date()): number {
  return Math.max(0, Math.ceil((block.end.getTime() - at.getTime()) / 60_000))
}

/** Quanto do bloco ja passou, de 0 a 100. */
export function progressOf(block: TaskBlock, at: Date = new Date()): number {
  const total = block.end.getTime() - block.start.getTime()
  if (total <= 0) return 0
  const passou = at.getTime() - block.start.getTime()
  return Math.min(100, Math.max(0, (passou / total) * 100))
}

/**
 * Blocos que ocupam alguma parte da janela, incluindo os que comecaram antes dela.
 *
 * Filtrar so pelo inicio perdia a tarefa que atravessa a meia-noite: "dormir"
 * das 23h as 7h comeca ontem, entao as 2h da manha o dia de hoje aparecia vazio
 * mesmo com a tarefa em andamento. O que decide e a sobreposicao — o bloco toca
 * a janela se termina depois do inicio dela e comeca antes do fim.
 */
export function blocksInWindow(blocks: TaskBlock[], from: Date, to: Date): TaskBlock[] {
  return blocks.filter(
    (b) => b.end.getTime() > from.getTime() && b.start.getTime() <= to.getTime()
  )
}

/** Limites do dia informado, para filtrar as tarefas daquela data. */
export function dayRange(date: Date = new Date()): { from: string; to: string } {
  const from = new Date(date)
  from.setHours(0, 0, 0, 0)
  const to = new Date(date)
  to.setHours(23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

/**
 * Janela de BUSCA do dia: comeca um dia antes.
 *
 * A consulta filtra por `dueAt`, que e o inicio da tarefa. Para nao perder um
 * bloco que comecou ontem a noite e so termina hoje, buscamos desde ontem e
 * recortamos depois com `blocksInWindow`. Um dia de folga cobre qualquer duracao
 * que o formulario aceita (o teto e 10h).
 */
export function daySearchRange(date: Date = new Date()): { from: string; to: string } {
  const { to } = dayRange(date)
  const from = new Date(date)
  from.setDate(from.getDate() - 1)
  from.setHours(0, 0, 0, 0)
  return { from: from.toISOString(), to }
}

/* ------------------------------------------------------------------ */
/* Encadeamento automatico                                             */
/* ------------------------------------------------------------------ */

export interface ChainedSlot {
  task: Task
  start: Date
  end: Date
  /** Minutos de descanso apos este bloco. Zero no ultimo. */
  breakAfter: number
}

/**
 * Distribui tarefas em sequencia a partir de um horario, inserindo descanso
 * entre elas.
 *
 * Serve para montar o dia sem digitar horario por tarefa: voce define a ordem e
 * o inicio, e o resto e aritmetica. O descanso nunca entra depois do ultimo
 * bloco — uma folga pendurada no fim da agenda nao representa nada.
 */
export function chainSchedule(
  tasks: Task[],
  options: { date: Date; startTime: string; breakMinutes: number }
): ChainedSlot[] {
  const [hora, minuto] = options.startTime.split(':').map(Number)
  const cursor = new Date(options.date)
  cursor.setHours(hora || 0, minuto || 0, 0, 0)

  return tasks.map((task, index) => {
    const minutos = Math.max(1, task.durationMinutes)
    const start = new Date(cursor)
    const end = new Date(start.getTime() + minutos * 60_000)

    const ultimo = index === tasks.length - 1
    const descanso = ultimo ? 0 : Math.max(0, options.breakMinutes)

    cursor.setTime(end.getTime() + descanso * 60_000)
    return { task, start, end, breakAfter: descanso }
  })
}
