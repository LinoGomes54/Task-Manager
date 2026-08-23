import { useEffect } from 'react'
import { create } from 'zustand'
import type { DensityPreference, ThemePreference } from '@shared/types'

/**
 * Aparencia da interface: tema, densidade e cor de destaque.
 *
 * As tres preferencias moram nas configuracoes do usuario (e portanto sincronizam
 * entre maquinas). Aqui so mantemos os valores em memoria e refletimos no
 * documento — `.dark` no `<html>`, `data-density` e a variavel `--accent-base`,
 * que e de onde toda a paleta de destaque deriva.
 *
 * O `next-themes` (dependencia padrao do bloco `sonner` do shadcn) nao foi usado:
 * ele assume Next.js e um provider proprio, e a fonte da verdade aqui e o banco.
 */

export const DEFAULT_ACCENT = '#5b5bd6'

/** Cores de destaque sugeridas — as do design, mais variacoes de matiz. */
export const ACCENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '#5b5bd6', label: 'Índigo' },
  { value: '#2a78d6', label: 'Azul' },
  { value: '#0d9488', label: 'Verde-azulado' },
  { value: '#16a34a', label: 'Verde' },
  { value: '#d97706', label: 'Âmbar' },
  { value: '#dc2626', label: 'Vermelho' },
  { value: '#db2777', label: 'Rosa' },
  { value: '#7c3aed', label: 'Roxo' },
  { value: '#475569', label: 'Ardósia' }
]

interface AppearanceStore {
  theme: ThemePreference
  density: DensityPreference
  accentColor: string
  setTheme: (theme: ThemePreference) => void
  setDensity: (density: DensityPreference) => void
  setAccentColor: (color: string) => void
  /** Aplica as tres de uma vez, ao restaurar a sessao ou salvar as configuracoes. */
  applyAll: (values: {
    theme: ThemePreference
    density: DensityPreference
    accentColor: string
  }) => void
}

export const useThemeStore = create<AppearanceStore>((set) => ({
  theme: 'system',
  density: 'compacto',
  accentColor: DEFAULT_ACCENT,
  setTheme: (theme) => set({ theme }),
  setDensity: (density) => set({ density }),
  setAccentColor: (accentColor) => set({ accentColor }),
  applyAll: ({ theme, density, accentColor }) => set({ theme, density, accentColor })
}))

function resolve(theme: ThemePreference): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Reflete a aparencia no documento e reage a mudanca do tema do Windows. */
export function useApplyAppearance(): void {
  const theme = useThemeStore((state) => state.theme)
  const density = useThemeStore((state) => state.density)
  const accentColor = useThemeStore((state) => state.accentColor)

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

  useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-base', accentColor)
  }, [accentColor])
}

export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useThemeStore((state) => state.theme)
  return resolve(theme)
}
