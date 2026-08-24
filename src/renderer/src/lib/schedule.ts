import type { RecurrenceRule } from '@shared/types'

/**
 * Resolve **quando** uma tarefa acontece, a partir do que o formulario pergunta.
 *
 * Cada repeticao pede uma coisa diferente: uma tarefa diaria precisa de horario,
 * nao de data; uma semanal precisa dos dias da semana; uma mensal, do dia do mes.
 * Pedir "data + hora" para todas obrigava o usuario a escolher um dia que o app
 * ja sabia calcular.
 */

export const WEEKDAYS = [
  { value: 0, short: 'D', label: 'domingo' },
  { value: 1, short: 'S', label: 'segunda' },
  { value: 2, short: 'T', label: 'terça' },
  { value: 3, short: 'Q', label: 'quarta' },
  { value: 4, short: 'Q', label: 'quinta' },
  { value: 5, short: 'S', label: 'sexta' },
  { value: 6, short: 'S', label: 'sábado' }
]

/** O que o formulario precisa perguntar para cada tipo de repeticao. */
export function scheduleFieldsFor(rule: RecurrenceRule): {
  needsDate: boolean
  needsWeekdays: boolean
  needsMonthDay: boolean
} {
  return {
    needsDate: rule === 'none' || rule === 'yearly',
    needsWeekdays: rule === 'weekly',
    needsMonthDay: rule === 'monthly'
  }
}

function withTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  const result = new Date(date)
  result.setHours(h || 0, m || 0, 0, 0)
  return result
}

/**
 * Primeira ocorrencia de uma tarefa repetida.
 *
 * Sempre no futuro: se o horario de hoje ja passou, cai na proxima data valida.
 * Sem isso, uma tarefa diaria criada as 18h com horario das 9h nasceria atrasada.
 */
export function firstOccurrence(options: {
  rule: RecurrenceRule
  time: string
  weekdays: number[]
  monthDay: number
  date?: Date
}): string | null {
  const { rule, time, weekdays, monthDay, date } = options
  const agora = new Date()

  switch (rule) {
    case 'daily': {
      const hoje = withTime(agora, time)
      if (hoje.getTime() > agora.getTime()) return hoje.toISOString()
      const amanha = new Date(hoje)
      amanha.setDate(amanha.getDate() + 1)
      return amanha.toISOString()
    }

    case 'weekly': {
      const dias = [...new Set(weekdays)].sort((a, b) => a - b)
      if (dias.length === 0) return withTime(agora, time).toISOString()

      // Procura, a partir de hoje, o primeiro dia marcado que ainda nao passou.
      for (let offset = 0; offset < 8; offset++) {
        const candidato = new Date(agora)
        candidato.setDate(candidato.getDate() + offset)
        if (!dias.includes(candidato.getDay())) continue

        const comHorario = withTime(candidato, time)
        if (comHorario.getTime() > agora.getTime()) return comHorario.toISOString()
      }
      return null
    }

    case 'monthly': {
      const dia = Math.min(Math.max(1, monthDay), 31)
      for (let offset = 0; offset < 13; offset++) {
        const alvo = new Date(agora.getFullYear(), agora.getMonth() + offset, 1)
        // Dia 31 nao existe em todo mes: cai no ultimo dia disponivel.
        const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
        alvo.setDate(Math.min(dia, ultimoDia))

        const comHorario = withTime(alvo, time)
        if (comHorario.getTime() > agora.getTime()) return comHorario.toISOString()
      }
      return null
    }

    case 'yearly':
    case 'none':
    default:
      return date ? withTime(date, time).toISOString() : null
  }
}

/** Resumo em texto do agendamento, mostrado abaixo dos campos. */
export function describeSchedule(options: {
  rule: RecurrenceRule
  time: string
  weekdays: number[]
  monthDay: number
  interval: number
}): string {
  const { rule, time, weekdays, monthDay, interval } = options
  const cada = interval > 1 ? `a cada ${interval} ` : 'todo'

  switch (rule) {
    case 'daily':
      return interval > 1 ? `A cada ${interval} dias às ${time}.` : `Todo dia às ${time}.`

    case 'weekly': {
      const dias = [...new Set(weekdays)].sort((a, b) => a - b)
      if (dias.length === 0) return 'Escolha ao menos um dia da semana.'
      const nomes = dias.map((d) => WEEKDAYS[d].label)
      const lista =
        nomes.length === 1
          ? nomes[0]
          : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
      return interval > 1
        ? `${lista}, a cada ${interval} semanas, às ${time}.`
        : `Toda ${lista}, às ${time}.`
    }

    case 'monthly':
      return interval > 1
        ? `Dia ${monthDay}, ${cada}meses, às ${time}.`
        : `Todo dia ${monthDay} do mês, às ${time}.`

    case 'yearly':
      return `Uma vez por ano, às ${time}.`

    default:
      return ''
  }
}
