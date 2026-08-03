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
