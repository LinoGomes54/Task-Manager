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
  recurrenceInterval: 1
}

export function TaskDialog(): React.JSX.Element {
  const { open, editing, defaults, close } = useTaskDialog()
  const { data: categories = [] } = useCategories()
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
        recurrenceInterval: editing.recurrenceInterval
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
      dueTime: defaults?.dueAt ? extractTime(defaults.dueAt) : '09:00'
    })
  }, [open, editing, defaults])

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function buildPayload(): CreateTaskInput {
    return {
      title: form.title,
      description: form.description.trim() || null,
      categoryId: form.categoryId === NO_CATEGORY ? null : form.categoryId,
      priority: form.priority,
      status: form.status,
      isImportant: form.isImportant,
      dueAt:
        form.hasDueDate && form.dueDate ? combineDateTime(form.dueDate, form.dueTime) : null,
      remindMinutesBefore: form.remindMinutesBefore,
      recurrence: form.recurrence,
      recurrenceInterval: Math.max(1, form.recurrenceInterval)
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

            <div className="space-y-3 rounded-lg border p-3">
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
                  onCheckedChange={(value) => update('hasDueDate', value)}
                />
              </div>

              {form.hasDueDate && (
                <>
                  <div className="grid grid-cols-2 gap-3">
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
                </>
              )}
            </div>

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
              {form.recurrence !== 'none' && (
                <p className="text-muted-foreground text-xs">
                  Ao concluir, a próxima ocorrência é criada automaticamente.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-2">
            <Button type="button" variant="ghost" onClick={close}>
              <X className="size-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
