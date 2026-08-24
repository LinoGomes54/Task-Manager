import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Coffee, Plus, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import { useTasks } from '@/hooks/use-tasks'
import { useCategoryMap } from '@/hooks/use-categories'
import { useSettings } from '@/hooks/use-settings'
import { chainSchedule, formatHm, formatDuration, dayRange } from '@shared/agenda'
import { queryKeys } from '@/lib/query'
import { cn } from '@/lib/utils'
import type { Task } from '@shared/types'

/**
 * Monta o dia encadeando tarefas a partir de um horario.
 *
 * Voce escolhe a ordem; os horarios sao aritmetica — inicio, duracao, descanso.
 * Digitar horario tarefa por tarefa obrigava a refazer a conta inteira sempre
 * que algo mudava de lugar ou de duracao.
 *
 * A ordem e ajustada por botoes de subir e descer, e nao por arrastar: o teclado
 * alcanca, e nao ha estado de arraste para se perder no meio.
 */
export function PlanDayDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const client = useQueryClient()
  const { data: settings } = useSettings()
  const categories = useCategoryMap()

  const { from, to } = dayRange()
  // Candidatas: tarefas de hoje e tarefas soltas, sem contar lembretes.
  const { data: doDia = [] } = useTasks({ from, to, kind: 'task', status: 'pending' })
  const { data: semPrazo = [] } = useTasks({ dueScope: 'no_due', kind: 'task', status: 'pending' })

  const [ordem, setOrdem] = useState<Task[]>([])
  const [inicio, setInicio] = useState('09:00')
  const [descanso, setDescanso] = useState(5)
  const [salvando, setSalvando] = useState(false)

  // Recarrega ao abrir: as tarefas do dia entram na ordem do horario atual.
  useEffect(() => {
    if (!open) return
    setOrdem(doDia)
    setInicio(settings?.agendaStartTime ?? '09:00')
    setDescanso(settings?.breakMinutes ?? 5)
    // Só ao abrir — mudanças na lista durante a edição não devem
    // sobrescrever a ordem que o usuário está montando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const disponiveis = semPrazo.filter((t) => !ordem.some((o) => o.id === t.id))
  const slots = chainSchedule(ordem, { date: new Date(), startTime: inicio, breakMinutes: descanso })
  const fim = slots.length > 0 ? slots[slots.length - 1].end : null

  function mover(index: number, delta: number): void {
    const destino = index + delta
    if (destino < 0 || destino >= ordem.length) return
    const copia = [...ordem]
    const [item] = copia.splice(index, 1)
    copia.splice(destino, 0, item)
    setOrdem(copia)
  }

  async function aplicar(): Promise<void> {
    if (slots.length === 0) return
    setSalvando(true)
    try {
      const hoje = new Date()
      const data = [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, '0'),
        String(hoje.getDate()).padStart(2, '0')
      ].join('-')

      await window.api.agenda.applySchedule(
        data,
        slots.map((slot) => ({ taskId: slot.task.id, dueAt: slot.start.toISOString() }))
      )

      void client.invalidateQueries({ queryKey: ['tasks'] })
      void client.invalidateQueries({ queryKey: queryKeys.stats() })
      toast.success(`Dia montado: ${slots.length} tarefas até ${formatHm(slots[slots.length - 1].end)}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível montar o dia')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-4rem)] flex-col gap-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 pb-1">
          <DialogTitle>Montar o dia</DialogTitle>
          <DialogDescription>
            Escolha a ordem — os horários são calculados a partir do início, da duração de cada
            tarefa e do descanso.
          </DialogDescription>
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-2 gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="plan-start">Começar às</Label>
            <Input
              id="plan-start"
              type="time"
              value={inicio}
              onChange={(event) => setInicio(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="plan-break">Descanso entre tarefas</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="plan-break"
                type="number"
                min={0}
                max={120}
                value={descanso}
                onChange={(event) => setDescanso(Number(event.target.value))}
              />
              <span className="text-muted-foreground text-xs">min</span>
            </div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 rounded-lg border">
          <div className="space-y-1 p-2">
            {slots.length === 0 && (
              <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--faint)' }}>
                Nenhuma tarefa na sequência. Adicione abaixo.
              </p>
            )}

            {slots.map((slot, index) => {
              const categoria = slot.task.categoryId
                ? categories.get(slot.task.categoryId)
                : undefined

              return (
                <div key={slot.task.id}>
                  <div className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2">
                    <span
                      className="w-24 shrink-0 font-mono text-[11.5px]"
                      style={{ color: 'var(--faint)' }}
                    >
                      {formatHm(slot.start)}–{formatHm(slot.end)}
                    </span>

                    {categoria && (
                      <CategoryIcon
                        icon={categoria.icon}
                        color={categoria.color}
                        variant="plain"
                        className="size-3.5 shrink-0"
                      />
                    )}

                    <span className="min-w-0 flex-1 truncate text-[12.5px]">
                      {slot.task.title}
                    </span>

                    <span
                      className="shrink-0 font-mono text-[11px]"
                      style={{ color: 'var(--faint)' }}
                    >
                      {formatDuration(slot.task.durationMinutes)}
                    </span>

                    <div className="flex shrink-0 items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === 0}
                        onClick={() => mover(index, -1)}
                        aria-label="Subir"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === slots.length - 1}
                        onClick={() => mover(index, 1)}
                        aria-label="Descer"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="hover:text-destructive size-7"
                        onClick={() => setOrdem(ordem.filter((t) => t.id !== slot.task.id))}
                        aria-label="Tirar da sequência"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {slot.breakAfter > 0 && (
                    <p
                      className="flex items-center gap-1.5 py-1 pl-4 text-[11px]"
                      style={{ color: 'var(--faint)' }}
                    >
                      <Coffee className="size-3" />
                      {slot.breakAfter}min de descanso
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {disponiveis.length > 0 && (
          <div className="shrink-0 pt-3">
            <p className="section-label mb-2">Sem horário — clique para incluir</p>
            <div className="flex flex-wrap gap-1.5">
              {disponiveis.slice(0, 12).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setOrdem([...ordem, task])}
                  className="hover:border-ring/40 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors"
                >
                  <Plus className="size-3" />
                  <span className="max-w-40 truncate">{task.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 items-center pt-4 sm:justify-between">
          <span className={cn('text-[12px]', !fim && 'invisible')} style={{ color: 'var(--faint)' }}>
            {slots.length} {slots.length === 1 ? 'tarefa' : 'tarefas'} · termina às{' '}
            <span className="font-mono">{fim ? formatHm(fim) : ''}</span>
          </span>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={aplicar} disabled={salvando || slots.length === 0}>
              {salvando ? 'Aplicando…' : 'Aplicar horários'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
