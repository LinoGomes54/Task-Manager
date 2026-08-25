import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MediaKind, Personalization } from '@shared/types'

/**
 * Som e imagens escolhidos pelo usuario, guardados so nesta maquina.
 *
 * O conteudo vem do processo principal como `data:` URI, e nao como caminho de
 * arquivo: a CSP do renderer bloqueia `file://`, e assim o renderer continua sem
 * qualquer acesso ao disco.
 *
 * Cada item tem sua propria query para uma foto de fundo grande nao atrasar o
 * carregamento do som do alarme.
 */

const CHAVE = ['personalization'] as const

export function usePersonalization(): {
  data: Personalization | undefined
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: CHAVE,
    queryFn: () => window.api.personalization.get()
  })
  return { data, isLoading }
}

/** Conteudo de um item, pronto para `<img src>` ou `new Audio()`. */
export function useMediaUrl(kind: MediaKind): string | null {
  const { data: config } = usePersonalization()
  const nome = config?.[kind] ?? null

  const { data } = useQuery({
    // O nome do arquivo entra na chave: trocar a imagem troca a query, e o cache
    // antigo nao volta a aparecer depois da troca.
    queryKey: [...CHAVE, 'media', kind, nome],
    queryFn: () => window.api.personalization.getMedia(kind),
    enabled: Boolean(nome),
    staleTime: Infinity
  })

  return nome ? (data ?? null) : null
}

export function usePickMedia(): ReturnType<typeof useMutation<Personalization, Error, MediaKind>> {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (kind: MediaKind) => window.api.personalization.pick(kind),
    onSuccess: (data) => {
      client.setQueryData(CHAVE, data)
      void client.invalidateQueries({ queryKey: CHAVE })
    }
  })
}

export function useClearMedia(): ReturnType<typeof useMutation<Personalization, Error, MediaKind>> {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (kind: MediaKind) => window.api.personalization.clear(kind),
    onSuccess: (data) => {
      client.setQueryData(CHAVE, data)
      void client.invalidateQueries({ queryKey: CHAVE })
    }
  })
}
