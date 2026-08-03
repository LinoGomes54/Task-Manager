import { Cloud, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useRunSync, useSyncState } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

/**
 * Estado da sincronizacao no topo da janela.
 *
 * Mostrar isso e importante num app offline-first: o usuario precisa saber se o
 * que ele acabou de escrever ja chegou ao Neon ou ainda esta so na maquina dele.
 */
export function SyncIndicator(): React.JSX.Element {
  const { data: state } = useSyncState()
  const runSync = useRunSync()

  const pending = state?.pendingChanges ?? 0
  const syncing = state?.status === 'syncing' || runSync.isPending

  const { icon: Icon, label, tone } = describe(state, pending)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-2', tone)}
          onClick={() => runSync.mutate()}
          disabled={syncing}
        >
          {syncing ? <RefreshCw className="size-4 animate-spin" /> : <Icon className="size-4" />}
          <span className="hidden text-xs sm:inline">{syncing ? 'Sincronizando…' : label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {state?.lastSyncedAt
          ? `Última sincronização: ${new Date(state.lastSyncedAt).toLocaleString('pt-BR')}`
          : 'Ainda não sincronizado'}
        {pending > 0 && ` · ${pending} alteração(ões) pendente(s)`}
        <br />
        Clique para sincronizar agora
      </TooltipContent>
    </Tooltip>
  )
}

function describe(
  state: { configured: boolean; status: string } | undefined,
  pending: number
): { icon: typeof Cloud; label: string; tone: string } {
  if (!state?.configured) {
    return { icon: CloudOff, label: 'Somente local', tone: 'text-muted-foreground' }
  }
  if (state.status === 'offline') {
    return { icon: CloudOff, label: 'Sem conexão', tone: 'text-amber-500' }
  }
  if (state.status === 'error') {
    return { icon: TriangleAlert, label: 'Erro ao sincronizar', tone: 'text-destructive' }
  }
  if (pending > 0) {
    return { icon: Cloud, label: `${pending} pendente(s)`, tone: 'text-amber-500' }
  }
  return { icon: Cloud, label: 'Sincronizado', tone: 'text-muted-foreground' }
}
