import { useEffect, useState } from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useTaskDialog } from '@/stores/task-dialog.store'
import { useCategories } from '@/hooks/use-categories'
import { useCreateTask, useUpdateTask } from '@/hooks/use-tasks'
import { CategoryIcon } from '@/components/categories/CategoryIcon'
import {
  PRIORITY_LABELS,
  RECURRENCE_LABELS,
  REMINDER_OPTIONS,
  STATUS_LABELS,
  combineDateTime,
  extractTime
} from '@/lib/format'
import {
  WEEKDAYS,
  scheduleFieldsFor,
  firstOccurrence,
  describeSchedule
} from '@/lib/schedule'
import { cn } from '@/lib/utils'
import { formatHm, formatDuration } from '@shared/agenda'
import { useSettings } from '@/hooks/use-settings'

/** Duracoes sugeridas: um pomodoro, meio, dois e uma hora. */
const DURATION_PRESETS = [15, 25, 50, 60]
import type { CreateTaskInput, RecurrenceRule, TaskPriority, TaskStatus } from '@shared/types'

/** Formulario unico de criar e editar tarefa. */

interface FormState {
  title: string
  description: string
  categoryId: string
  priority: TaskPriority
  status: TaskStatus
  isImportant: boolean
  hasDueDate: boolean
  dueDate: Date | undefined
  dueTime: string
  remindMinutesBefore: number
  recurrence: RecurrenceRule
  recurrenceInterval: number
  recurrenceWeekdays: number[]
  /** Dia do mes de uma repeticao mensal. */
  monthDay: number
  /** Quanto tempo a tarefa ocupa, em minutos. */
  durationMinutes: number
}

const NO_CATEGORY = '__none__'

const EMPTY: FormState = {
  title: '',
  description: '',
  categoryId: NO_CATEGORY,
  priority: 'medium',
  status: 'pending',
  isImportant: false,
  hasDueDate: false,
  dueDate: undefined,
  dueTime: '09:00',
  remindMinutesBefore: 15,
  recurrence: 'none',
  recurrenceInterval: 1,
  recurrenceWeekdays: [],
  monthDay: new Date().getDate(),
  durationMinutes: 25
}

export function TaskDialog(): React.JSX.Element {
  const { open, editing, defaults, close } = useTaskDialog()
  const { data: categories = [] } = useCategories()
  const { data: settings } = useSettings()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Recarrega o formulario sempre que o dialogo abre, com os dados da tarefa
  // em edicao ou com os valores sugeridos pela tela que abriu.
  useEffect(() => {
    if (!open) return

    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description ?? '',
        categoryId: editing.categoryId ?? NO_CATEGORY,
        priority: editing.priority,
        status: editing.status,
        isImportant: editing.isImportant,
        hasDueDate: editing.dueAt !== null,
        dueDate: editing.dueAt ? parseISO(editing.dueAt) : undefined,
        dueTime: extractTime(editing.dueAt),
        remindMinutesBefore: editing.remindMinutesBefore,
        recurrence: editing.recurrence,
        recurrenceInterval: editing.recurrenceInterval,
        recurrenceWeekdays: editing.recurrenceWeekdays,
        monthDay: editing.dueAt ? parseISO(editing.dueAt).getDate() : new Date().getDate(),
        durationMinutes: editing.durationMinutes
      })
      return
    }

    // Repeticao precisa de prazo para o agendamento da proxima ocorrencia fazer
    // sentido, entao ao abrir ja com uma regra sugerida marcamos hoje por padrao.
    const suggestedRecurrence = defaults?.recurrence ?? 'none'
    const needsDueDate = Boolean(defaults?.dueAt) || suggestedRecurrence !== 'none'

    setForm({
      ...EMPTY,
      categoryId: defaults?.categoryId ?? NO_CATEGORY,
      isImportant: defaults?.isImportant ?? false,
      recurrence: suggestedRecurrence,
      hasDueDate: needsDueDate,
      dueDate: defaults?.dueAt ? parseISO(defaults.dueAt) : needsDueDate ? new Date() : undefined,
      dueTime: defaults?.dueAt ? extractTime(defaults.dueAt) : '09:00',
      // Uma semanal sem dia marcado nao teria quando acontecer: sugerimos hoje.
      recurrenceWeekdays: suggestedRecurrence === 'weekly' ? [new Date().getDay()] : [],
      durationMinutes: settings?.pomodoroMinutes ?? 25
    })
  }, [open, editing, defaults])

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function buildPayload(): CreateTaskInput {
    // Numa tarefa repetida o app calcula a primeira ocorrencia a partir da regra;
    // so a tarefa avulsa (e a anual) usa a data escolhida na mao.
    const dueAt =
      form.recurrence === 'none'
        ? form.hasDueDate
          ? combineDateTime(form.dueDate ?? new Date(), form.dueTime)
          : null
        : (editing?.dueAt ??
          firstOccurrence({
            rule: form.recurrence,
            time: form.dueTime,
            weekdays: form.recurrenceWeekdays,
            monthDay: form.monthDay,
            date: form.dueDate
          }))

    return {
      title: form.title,
      description: form.description.trim() || null,
      categoryId: form.categoryId === NO_CATEGORY ? null : form.categoryId,
      priority: form.priority,
      status: form.status,
      isImportant: form.isImportant,
      dueAt,
      remindMinutesBefore: form.remindMinutesBefore,
      recurrence: form.recurrence,
      recurrenceInterval: Math.max(1, form.recurrenceInterval),
      recurrenceWeekdays: form.recurrence === 'weekly' ? form.recurrenceWeekdays : [],
      durationMinutes: Math.max(1, form.durationMinutes)
    }
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!form.title.trim()) return

    const payload = buildPayload()
    if (editing) await updateTask.mutateAsync({ id: editing.id, ...payload })
    else await createTask.mutateAsync(payload)

    close()
  }

  const saving = createTask.isPending || updateTask.isPending
  const campos = scheduleFieldsFor(form.recurrence)
  const resumo = describeSchedule({
    rule: form.recurrence,
    time: form.dueTime,
    weekdays: form.recurrenceWeekdays,
    monthDay: form.monthDay,
    interval: form.recurrenceInterval
  })

  // Uma semanal sem nenhum dia marcado nao tem quando acontecer.
  const semDiaMarcado = form.recurrence === 'weekly' && form.recurrenceWeekdays.length === 0

  // Horario de termino, mostrado ao lado da duracao: e o que responde na hora
  // "se comeco as 14h e levo uma hora, quando acaba?".
  const termina = (() => {
    const [h, m] = form.dueTime.split(':').map(Number)
    if (Number.isNaN(h)) return null
    const fim = new Date()
    fim.setHours(h, m || 0, 0, 0)
    fim.setMinutes(fim.getMinutes() + Math.max(1, form.durationMinutes))
    return formatHm(fim)
  })()

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="flex max-h-[calc(100vh-4rem)] flex-col gap-0 sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 pb-1">
            <DialogTitle>{editing ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'As alterações são salvas localmente e sincronizadas em seguida.'
                : 'A tarefa fica disponível na hora, mesmo sem internet.'}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-1 grid min-h-0 flex-1 gap-4 overflow-y-auto px-1 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="O que precisa ser feito?"
                autoFocus
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Detalhes, links, contexto…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => update('categoryId', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="flex items-center gap-2">
                          <CategoryIcon
                            icon={category.icon}
                            color={category.color}
                            variant="plain"
                            className="size-3.5"
                          />
                          {category.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) => update('priority', value as TaskPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editing && (
              <div className="grid gap-2">
                <Label>Situação</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => update('status', value as TaskStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="important">Marcar como importante</Label>
                <p className="text-muted-foreground text-xs">
                  Aparece na aba Importantes e no resumo do dashboard
                </p>
              </div>
              <Switch
                id="important"
                checked={form.isImportant}
                onCheckedChange={(value) => update('isImportant', value)}
              />
            </div>

            {/*
              A repeticao vem ANTES do agendamento porque e ela que decide o que
              perguntar: diaria pede horario, semanal pede os dias, mensal pede o
              dia do mes. Perguntar "data + hora" para todas obrigava a escolher
              um dia que o app ja sabe calcular.
            */}
            <div className="grid gap-2">
              <Label>Repetição</Label>
              <div className="flex gap-3">
                <Select
                  value={form.recurrence}
                  onValueChange={(value) => update('recurrence', value as RecurrenceRule)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {form.recurrence !== 'none' && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">a cada</span>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      className="w-16"
                      value={form.recurrenceInterval}
                      onChange={(event) =>
                        update('recurrenceInterval', Number(event.target.value))
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              {form.recurrence === 'none' ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="has-due">Definir prazo</Label>
                    <p className="text-muted-foreground text-xs">
                      Necessário para o alarme e para aparecer no calendário
                    </p>
                  </div>
                  <Switch
                    id="has-due"
                    checked={form.hasDueDate}
                    onCheckedChange={(value) => {
                      // Ligar o prazo ja assume hoje: sem isso, quem preenchia
                      // so o horario salvava a tarefa sem prazo nenhum, e ela
                      // sumia da agenda e do calendario sem explicacao.
                      if (value && !form.dueDate) update('dueDate', new Date())
                      update('hasDueDate', value)
                    }}
                  />
                </div>
              ) : (
                <p className="text-sm font-medium">Quando</p>
              )}

              {(form.recurrence !== 'none' || form.hasDueDate) && (
                <>
                  {campos.needsWeekdays && (
                    <div className="grid gap-2">
                      <Label>Dias da semana</Label>
                      <div className="flex gap-1.5">
                        {WEEKDAYS.map((dia) => {
                          const marcado = form.recurrenceWeekdays.includes(dia.value)
                          return (
                            <button
                              key={dia.value}
                              type="button"
                              title={dia.label}
                              aria-pressed={marcado}
                              onClick={() =>
                                update(
                                  'recurrenceWeekdays',
                                  marcado
                                    ? form.recurrenceWeekdays.filter((d) => d !== dia.value)
                                    : [...form.recurrenceWeekdays, dia.value]
                                )
                              }
                              className={cn(
                                'size-9 rounded-lg border text-[13px] font-medium transition-colors',
                                marcado
                                  ? 'border-[color:var(--accent-base)] bg-accent'
                                  : 'hover:bg-accent/60 border-border text-muted-foreground'
                              )}
                            >
                              {dia.short}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {campos.needsDate && (
                      <div className="grid gap-2">
                        <Label>Data</Label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start font-normal">
                              <CalendarIcon className="mr-2 size-4" />
                              {form.dueDate
                                ? format(form.dueDate, "dd 'de' MMM", { locale: ptBR })
                                : 'Escolher'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              locale={ptBR}
                              selected={form.dueDate}
                              onSelect={(date) => {
                                update('dueDate', date)
                                setCalendarOpen(false)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {campos.needsMonthDay && (
                      <div className="grid gap-2">
                        <Label htmlFor="month-day">Dia do mês</Label>
                        <Input
                          id="month-day"
                          type="number"
                          min={1}
                          max={31}
                          value={form.monthDay}
                          onChange={(event) => update('monthDay', Number(event.target.value))}
                        />
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="due-time">Horário</Label>
                      <Input
                        id="due-time"
                        type="time"
                        value={form.dueTime}
                        onChange={(event) => update('dueTime', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="duration">Duração</Label>
                      {termina && (
                        <span className="text-muted-foreground text-xs">
                          termina às <span className="font-mono">{termina}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {DURATION_PRESETS.map((minutos) => (
                        <button
                          key={minutos}
                          type="button"
                          onClick={() => update('durationMinutes', minutos)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-[12px] transition-colors',
                            form.durationMinutes === minutos
                              ? 'border-[color:var(--accent-base)] bg-accent'
                              : 'hover:bg-accent/60 border-border text-muted-foreground'
                          )}
                        >
                          {formatDuration(minutos)}
                        </button>
                      ))}

                      <div className="flex items-center gap-1.5">
                        <Input
                          id="duration"
                          type="number"
                          min={1}
                          max={600}
                          className="w-20"
                          value={form.durationMinutes}
                          onChange={(event) =>
                            update('durationMinutes', Number(event.target.value))
                          }
                        />
                        <span className="text-muted-foreground text-xs">min</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Lembrete</Label>
                    <Select
                      value={String(form.remindMinutesBefore)}
                      onValueChange={(value) => update('remindMinutesBefore', Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.recurrence !== 'none' && (
                    <p className="text-muted-foreground text-xs">{resumo}</p>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-2">
            <Button type="button" variant="ghost" onClick={close}>
              <X className="size-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim() || semDiaMarcado}>
              {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
