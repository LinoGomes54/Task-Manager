import { useEffect } from 'react'
import { create } from 'zustand'
import type { ThemePreference } from '@shared/types'

/**
 * Tema da interface.
 *
 * A preferencia mora nas configuracoes do usuario (e portanto sincroniza entre
 * maquinas). Aqui so mantemos o valor em memoria e aplicamos a classe `.dark`
 * no `<html>`, que e o que os tokens do shadcn observam.
 *
 * O `next-themes` (dependencia padrao do bloco `sonner` do shadcn) nao foi usado:
 * ele assume Next.js e um provider proprio, e a fonte da verdade aqui e o banco.
 */

interface ThemeStore {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme })
}))

function resolve(theme: ThemePreference): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Aplica o tema no documento e reage a mudanca do tema do Windows. */
export function useApplyTheme(): void {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    const apply = (): void => {
      document.documentElement.classList.toggle('dark', resolve(theme) === 'dark')
    }
    apply()

    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useThemeStore((state) => state.theme)
  return resolve(theme)
}
