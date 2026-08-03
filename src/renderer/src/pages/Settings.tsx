import { useQuery } from '@tanstack/react-query'
import { Power, Bell, Palette, Cloud, RefreshCw, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { PageHeader } from '@/components/PageHeader'
import { useSettings, useUpdateSettings, useSyncState, useRunSync } from '@/hooks/use-settings'
import { REMINDER_OPTIONS } from '@/lib/format'
import type { AppSettings, ThemePreference } from '@shared/types'

/** Preferencias do app: inicializacao com o Windows, alarmes, tema e sincronizacao. */
export function SettingsPage(): React.JSX.Element {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const { data: sync } = useSyncState()
  const runSync = useRunSync()

  // Le o autostart direto do SO: se o usuario desativar pelo Windows, a tela reflete.
  const { data: systemAutoLaunch } = useQuery({
    queryKey: ['auto-launch'],
    queryFn: () => window.api.system.getAutoLaunch()
  })

  function patch(values: Partial<AppSettings>): void {
    updateSettings.mutate(values)
  }

  if (isLoading || !settings) {
    return <p className="text-muted-foreground text-sm">Carregando configurações…</p>
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Ajuste o comportamento do app no seu computador."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Power className="size-4" />
              Inicialização
            </CardTitle>
            <CardDescription>
              Faça o Task Manager subir junto com o Windows, como os outros aplicativos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row
              id="auto-launch"
              label="Iniciar com o Windows"
              hint="Registra o app na inicialização do sistema (a mesma lista do Gerenciador de Tarefas)."
              checked={settings.autoLaunch}
              onChange={(value) => patch({ autoLaunch: value })}
            />

            {systemAutoLaunch !== undefined && systemAutoLaunch !== settings.autoLaunch && (
              <p className="text-amber-500 text-xs">
                O Windows está reportando um estado diferente ({systemAutoLaunch ? 'ativo' : 'inativo'}).
                Alterne o botão para sincronizar.
              </p>
            )}

            <Separator />

            <Row
              id="start-minimized"
              label="Iniciar minimizado na bandeja"
              hint="Ao subir com o Windows, o app fica só no ícone da bandeja, sem abrir a janela."
              checked={settings.startMinimized}
              onChange={(value) => patch({ startMinimized: value })}
            />

            <Separator />

            <Row
              id="close-to-tray"
              label="Fechar para a bandeja"
              hint="O botão de fechar esconde a janela em vez de sair — os alarmes continuam funcionando."
              checked={settings.closeToTray}
              onChange={(value) => patch({ closeToTray: value })}
            />

            <p className="text-muted-foreground flex items-start gap-2 text-xs">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Em modo de desenvolvimento o atalho aponta para o executável do Electron. A
              inicialização automática só funciona de verdade depois de instalar o app.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4" />
              Alarmes e notificações
            </CardTitle>
            <CardDescription>
              Avisos quando uma tarefa com prazo está chegando ou já venceu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row
              id="notifications"
              label="Ativar notificações"
              hint="Mostra o aviso nativo do Windows no horário do lembrete."
              checked={settings.notificationsEnabled}
              onChange={(value) => patch({ notificationsEnabled: value })}
            />

            <Separator />

            <Row
              id="sound"
              label="Tocar som de alerta"
              hint="Um bipe curto junto com a notificação."
              checked={settings.soundEnabled}
              onChange={(value) => patch({ soundEnabled: value })}
              disabled={!settings.notificationsEnabled}
            />

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Antecedência padrão do lembrete</Label>
                <p className="text-muted-foreground text-xs">
                  Usado quando a tarefa não define uma antecedência própria.
                </p>
              </div>
              <Select
                value={String(settings.reminderLeadMinutes)}
                onValueChange={(value) => patch({ reminderLeadMinutes: Number(value) })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.filter((option) => option.value > 0).map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-4" />
              Aparência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Tema</Label>
                <p className="text-muted-foreground text-xs">
                  “Sistema” acompanha o tema do Windows automaticamente.
                </p>
              </div>
              <Select
                value={settings.theme}
                onValueChange={(value) => patch({ theme: value as ThemePreference })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="size-4" />
              Sincronização com o Neon
            </CardTitle>
            <CardDescription>
              Suas tarefas ficam salvas no computador e são replicadas no banco.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <Badge variant={sync?.configured ? 'secondary' : 'outline'}>
                {!sync?.configured
                  ? 'Não configurado'
                  : sync.status === 'offline'
                    ? 'Sem conexão'
                    : sync.status === 'error'
                      ? 'Erro'
                      : sync.status === 'syncing'
                        ? 'Sincronizando'
                        : 'Em dia'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Alterações pendentes</span>
              <span className="text-muted-foreground text-sm tabular-nums">
                {sync?.pendingChanges ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Última sincronização</span>
              <span className="text-muted-foreground text-sm">
                {sync?.lastSyncedAt
                  ? new Date(sync.lastSyncedAt).toLocaleString('pt-BR')
                  : 'Nunca'}
              </span>
            </div>

            {sync?.lastError && (
              <p className="text-destructive text-xs break-words">{sync.lastError}</p>
            )}

            {!sync?.configured && (
              <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
                Para ativar, copie o arquivo <code>.env.example</code> para <code>.env</code> e
                preencha a variável <code>DATABASE_URL</code> com a connection string do Neon.
                Depois reinicie o app. Sem isso, tudo continua funcionando — só fica salvo
                apenas neste computador.
              </p>
            )}

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => runSync.mutate()}
              disabled={runSync.isPending || !sync?.configured}
            >
              <RefreshCw className={runSync.isPending ? 'size-4 animate-spin' : 'size-4'} />
              Sincronizar agora
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

interface RowProps {
  id: string
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

function Row({ id, label, hint, checked, onChange, disabled }: RowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}
