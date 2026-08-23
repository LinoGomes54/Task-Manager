import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query'
import { useThemeStore } from './use-theme'
import { useAuthStore } from '@/stores/auth.store'
import type { AppSettings, SyncState } from '@shared/types'

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: queryKeys.settings(),
    queryFn: () => window.api.settings.get()
  })
}

export function useUpdateSettings() {
  const client = useQueryClient()
  const applyAppearance = useThemeStore((state) => state.applyAll)
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) => window.api.settings.update(patch),
    onSuccess: (settings) => {
      client.setQueryData(queryKeys.settings(), settings)
      applyAppearance(settings)
      if (session) setSession({ ...session, settings })
      toast.success('Configurações salvas')
    },
    onError: (error: Error) => toast.error(error.message)
  })
}

export function useSyncState() {
  return useQuery<SyncState>({
    queryKey: queryKeys.sync(),
    queryFn: () => window.api.sync.getState(),
    refetchInterval: 30_000
  })
}

export function useRunSync() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => window.api.sync.runNow(),
    onSuccess: (state) => {
      client.setQueryData(queryKeys.sync(), state)
      void client.invalidateQueries({ queryKey: ['tasks'] })
      void client.invalidateQueries({ queryKey: queryKeys.categories() })
      void client.invalidateQueries({ queryKey: queryKeys.stats() })

      if (!state.configured) toast.info('Sincronização desativada: configure a DATABASE_URL')
      else if (state.status === 'offline') toast.warning('Sem conexão — suas tarefas estão salvas localmente')
      else if (state.status === 'error') toast.error(`Falha ao sincronizar: ${state.lastError}`)
      else toast.success('Sincronizado com o Neon')
    },
    onError: (error: Error) => toast.error(error.message)
  })
}
