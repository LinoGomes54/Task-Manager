import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query'
import { playAlarmSound } from '@/lib/alarm'

/**
 * Assina os eventos que o processo principal empurra para a UI.
 *
 * Sem isso a tela ficaria desatualizada sempre que algo mudasse fora do fluxo
 * do React: um pull do Neon trazendo tarefas de outra maquina, um alarme
 * disparando ou o clique no menu da bandeja.
 */
export function useMainEvents(): void {
  const client = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribers = [
      window.api.events.onDataChanged(() => {
        void client.invalidateQueries({ queryKey: ['tasks'] })
        void client.invalidateQueries({ queryKey: queryKeys.categories() })
        void client.invalidateQueries({ queryKey: queryKeys.stats() })
      }),

      window.api.events.onSyncStateChanged((state) => {
        client.setQueryData(queryKeys.sync(), state)
      }),

      window.api.events.onPlayAlarm(({ title }) => {
        playAlarmSound()
        toast.warning(`Lembrete: ${title}`, { duration: 8000 })
      }),

      window.api.events.onNavigate((route) => navigate(route))
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [client, navigate])
}
