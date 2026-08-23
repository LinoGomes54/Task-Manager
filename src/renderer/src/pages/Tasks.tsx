import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Inbox, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { PageHeader } from '@/components/PageHeader'
import { TaskList } from '@/components/tasks/TaskList'
import { useTasks } from '@/hooks/use-tasks'
import { useCategories } from '@/hooks/use-categories'
import { useTaskDialog } from '@/stores/task-dialog.store'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/format'
import type { TaskFilters, TaskPriority, TaskStatus } from '@shared/types'

const ALL = 'all'

/** Lista completa com busca e filtros. E tambem o alvo dos atalhos da bandeja. */
export function TasksPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const openNew = useTaskDialog((store) => store.openNew)
  const { data: categories = [] } = useCategories()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>(ALL)
  const [status, setStatus] = useState<TaskStatus | typeof ALL>(ALL)
  const [priority, setPriority] = useState<TaskPriority | typeof ALL>(ALL)

  // `?nova=1` vem do menu da bandeja: abre o dialogo direto.
  useEffect(() => {
    if (searchParams.get('nova') === '1') {
      openNew()
      searchParams.delete('nova')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, openNew])

  const filters: TaskFilters = {
    search: search || undefined,
    categoryId: categoryId === ALL ? undefined : categoryId,
    status: status === ALL ? undefined : status,
    priority: priority === ALL ? undefined : priority
  }

  const { data: tasks, isLoading } = useTasks(filters)

  return (
    <>
      <PageHeader
        title="Tarefas"
        description="Busque, filtre e organize tudo que você anotou."
        action={
          <Button onClick={() => openNew()} className="gap-1.5">
            <Plus className="size-4" />
            Nova tarefa
          </Button>
        }
      />

      {/* Os filtros quebram linha antes de espremer: cada um tem largura minima
          propria e a busca ocupa o espaco que sobra. */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1 basis-56">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título ou descrição…"
            className="pl-9"
          />
        </div>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-48 shrink-0">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
          <SelectTrigger className="w-48 shrink-0">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as situações</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TaskList
        tasks={tasks}
        loading={isLoading}
        empty={{
          icon: <Inbox className="size-8" />,
          title: 'Nenhuma tarefa encontrada',
          description:
            'Ajuste os filtros ou crie uma tarefa nova — ela é salva na hora, mesmo sem internet.'
        }}
      />
    </>
  )
}
