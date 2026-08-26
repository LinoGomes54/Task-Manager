import { create } from 'zustand'
import type { Session } from '@shared/types'

/**
 * Sessao no renderer. E apenas um espelho: quem manda e o processo principal,
 * que persiste a sessao em disco. Aqui guardamos para as rotas saberem se
 * mostram o app ou a tela de login.
 */

interface AuthStore {
  session: Session | null
  loading: boolean
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  loading: true,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading })
}))
