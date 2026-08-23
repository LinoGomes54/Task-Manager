import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query'
import type {
  CreateTaskInput,
  DashboardStats,
  Task,
  TaskFilters,
  UpdateTaskInput
} from '@shared/types'

/** Acesso as tarefas. Toda escrita invalida a lista e as estatisticas. */

export function useTasks(filters: TaskFilters = {}) {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks(filters),
    queryFn: () => window.api.tasks.list(filters)
  })
}

export function useStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.stats(),
    queryFn: () => window.api.tasks.stats()
  })
}

/**
 * Os tres grupos que compoem a visao do dia.
 *
 * Sao consultas separadas de proposito: uma condicao unica nao consegue juntar
 * `due_at BETWEEN ...` com `due_at IS NULL`, porque qualquer comparacao com NULL
 * no SQL descarta a linha — era exatamente por isso que tarefas sem prazo nao
 * apareciam em lugar nenhum. Como o banco e local, as tres consultas custam
 * praticamente nada.
 */
export function useTodayTasks(): {
  today: Task[]
  overdue: Task[]
  noDueDate: Task[]
  total: number
  isLoading: boolean
} {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const todayQuery = useTasks({ from: start.toISOString(), to: end.toISOString() })
  const overdueQuery = useTasks({ dueScope: 'overdue' })
  const noDueQuery = useTasks({ dueScope: 'no_due', status: 'pending' })

  const today = todayQuery.data ?? []
  const overdue = overdueQuery.data ?? []
  const noDueDate = noDueQuery.data ?? []

  return {
    today,
    overdue,
    noDueDate,
    total: today.length + overdue.length + noDueDate.length,
    isLoading: todayQuery.isLoading || overdueQuery.isLoading || noDueQuery.isLoading
  }
}

function useInvalidateTasks(): () => void {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: ['tasks'] })
    void client.invalidateQueries({ queryKey: queryKeys.stats() })
  }
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => window.api.tasks.create(input),
    onSuccess: () => {
      invalidate()
      toast.success('Tarefa criada')
    },
    onError: (error: Error) => toast.error(error.message)
  })
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => window.api.tasks.update(input),
    onSuccess: () => {
      invalidate()
      toast.success('Tarefa atualizada')
    },
    onError: (error: Error) => toast.error(error.message)
  })
}

export function useRemoveTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (id: string) => window.api.tasks.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success('Tarefa removida')
    },
    onError: (error: Error) => toast.error(error.message)
  })
}

export function useToggleComplete() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (id: string) => window.api.tasks.toggleComplete(id),
    onSuccess: (task) => {
      invalidate()
      if (task.status === 'done' && task.recurrence !== 'none') {
        toast.success('Concluída — a próxima repetição já foi agendada')
      }
    },
    onError: (error: Error) => toast.error(error.message)
  })
}

export function useToggleImportant() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (id: string) => window.api.tasks.toggleImportant(id),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message)
  })
}
