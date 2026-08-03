import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@shared/types'

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: queryKeys.categories(),
    queryFn: () => window.api.categories.list()
  })
}

function useInvalidate(): () => void {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.categories() })
    void client.invalidateQueries({ queryKey: ['tasks'] })
    void client.invalidateQueries({ queryKey: queryKeys.stats() })
  }
}

export function useCreateCategory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => window.api.categories.create(input),
    onSuccess: () => {
      invalidate()
      toast.success('Categoria criada')
    },
    onError: (error: Error) => toast.error(error.message)
  })
}

export function useUpdateCategory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => window.api.categories.update(input),
    onSuccess: () => {
      invalidate()
      toast.success('Categoria atualizada')
    },
    onError: (error: Error) => toast.error(error.message)
  })
}

export function useRemoveCategory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => window.api.categories.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success('Categoria removida — as tarefas dela ficaram sem categoria')
    },
    onError: (error: Error) => toast.error(error.message)
  })
}

/** Mapa id → categoria, para a lista de tarefas resolver nome e cor sem varrer o array. */
export function useCategoryMap(): Map<string, Category> {
  const { data } = useCategories()
  return new Map((data ?? []).map((category) => [category.id, category]))
}
