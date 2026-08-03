import { QueryClient } from '@tanstack/react-query'

/**
 * Cliente do React Query.
 *
 * Os dados vem do SQLite local via IPC — leitura instantanea e sem rede. Por
 * isso `staleTime` e baixo e `retry` e zero: nao ha latencia para amortizar nem
 * falha transitoria de rede para tentar de novo. Quando o sync traz novidades do
 * Neon, o processo principal emite `dataChanged` e invalidamos tudo de uma vez.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: false,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: false
    }
  }
})

export const queryKeys = {
  tasks: (filters?: unknown) => ['tasks', filters ?? {}] as const,
  stats: () => ['stats'] as const,
  categories: () => ['categories'] as const,
  settings: () => ['settings'] as const,
  sync: () => ['sync'] as const
}
