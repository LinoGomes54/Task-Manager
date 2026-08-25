import { useEffect, useState } from 'react'
import { useTasks } from './use-tasks'
import {
  buildDaySchedule,
  blocksInWindow,
  currentBlock,
  nextBlock,
  dayRange,
  daySearchRange,
  type TaskBlock
} from '@shared/agenda'

/**
 * O que deveria estar acontecendo agora, segundo o relogio.
 *
 * O pulso e de 15 segundos, e nao de 1: a interface mostra minutos, entao um
 * pulso por segundo redesenharia 15 vezes a toa. Meio minuto ja seria tarde
 * demais para virar o bloco na hora certa.
 */
export function useCurrentTask(): {
  current: TaskBlock | null
  next: TaskBlock | null
  blocks: TaskBlock[]
  isLoading: boolean
} {
  const { from, to } = dayRange()
  // Busca desde ontem e recorta na janela de hoje: sem isso, uma tarefa que
  // atravessa a meia-noite sumia do dia em que ainda esta acontecendo.
  const busca = daySearchRange()
  const { data: tasks, isLoading } = useTasks({ from: busca.from, to: busca.to, kind: 'task' })
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  const blocks = blocksInWindow(buildDaySchedule(tasks ?? []), new Date(from), new Date(to))

  return {
    current: currentBlock(blocks),
    next: nextBlock(blocks),
    blocks,
    isLoading
  }
}
