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
import { dayRange } from '@shared/agenda'
import type { TaskFilters, TaskPriority, TaskStatus } from '@shared/types'

const ALL = 'all'

/**
 * Recorte de prazo da lista.
 *
 * O padrao e **hoje**: a lista completa cresce sem parar, e abrir a aba para
 * encarar tudo o que ja foi anotado esconde justamente o que precisa ser feito
 * agora. Os outros recortes ficam a um clique — e, ao contrario de um filtro
 * implicito, este aparece na tela, entao nada some sem explicacao.
 */
const PERIODOS = {
  hoje: 'Hoje',
  tudo: 'Todos os prazos',
  atrasadas: 'Atrasadas',
  sem_prazo: 'Sem prazo'
} as const

type Periodo = keyof typeof PERIODOS

/** Lista completa com busca e filtros. E tambem o alvo dos atalhos da bandeja. */
export function TasksPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const openNew = useTaskDialog((store) => store.openNew)
  const { data: categories = [] } = useCategories()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>(ALL)
  const [status, setStatus] = useState<TaskStatus | typeof ALL>(ALL)
  const [priority, setPriority] = useState<TaskPriority | typeof ALL>(ALL)
  const [periodo, setPeriodo] = useState<Periodo>('hoje')

  // Parametros de URL: `nova=1` vem do menu da bandeja, `q` da busca da barra
  // lateral e `categoria` do clique numa categoria no painel ou na navegacao.
  useEffect(() => {
    let mudou = false

    if (searchParams.get('nova') === '1') {
      openNew()
      searchParams.delete('nova')
      mudou = true
    }

    // Buscar ou filtrar por categoria vindo de fora e um pedido para procurar em
    // tudo. Manter o recorte de hoje devolveria "nada encontrado" para uma tarefa
    // que existe, e a busca pareceria quebrada.
    const q = searchParams.get('q')
    if (q !== null) {
      setSearch(q)
      setPeriodo('tudo')
      searchParams.delete('q')
      mudou = true
    }

    const categoria = searchParams.get('categoria')
    if (categoria !== null) {
      setCategoryId(categoria || ALL)
      setPeriodo('tudo')
      searchParams.delete('categoria')
      mudou = true
    }

    if (mudou) setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams, openNew])

  const hoje = dayRange()
  const filters: TaskFilters = {
    search: search || undefined,
    categoryId: categoryId === ALL ? undefined : categoryId,
    status: status === ALL ? undefined : status,
    priority: priority === ALL ? undefined : priority,
    from: periodo === 'hoje' ? hoje.from : undefined,
    to: periodo === 'hoje' ? hoje.to : undefined,
    dueScope:
      periodo === 'atrasadas' ? 'overdue' : periodo === 'sem_prazo' ? 'no_due' : undefined
  }

  const { data: tasks, isLoading } = useTasks(filters)

  return (
    <>
      <PageHeader
        title="Tarefas"
        description={
          periodo === 'hoje'
            ? 'O que tem prazo para hoje. Troque o período para ver o resto.'
            : 'Busque, filtre e organize tudo que você anotou.'
        }
        stats={tasks ? `${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'}` : undefined}
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

        <Select value={periodo} onValueChange={(value) => setPeriodo(value as Periodo)}>
          <SelectTrigger className="w-44 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERIODOS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
          title: periodo === 'hoje' ? 'Nada com prazo para hoje' : 'Nenhuma tarefa encontrada',
          description:
            periodo === 'hoje'
              ? 'Troque o período para “Todos os prazos” para ver o que ficou para depois — ou crie uma tarefa nova.'
              : 'Ajuste os filtros ou crie uma tarefa nova — ela é salva na hora, mesmo sem internet.'
        }}
      />
    </>
  )
}
