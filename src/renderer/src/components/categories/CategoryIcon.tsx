import { resolveCategoryIcon } from '@/lib/category-icons'
import { cn } from '@/lib/utils'

interface CategoryIconProps {
  icon: string | null | undefined
  color: string
  /** `chip` desenha o quadrado colorido; `plain` desenha so o traco do icone. */
  variant?: 'chip' | 'plain'
  className?: string
}

/**
 * Icone de uma categoria.
 *
 * No modo `chip` a cor vira fundo suave em vez de preenchimento solido: com o
 * icone por cima, um fundo saturado deixaria o traco ilegivel — sobretudo nas
 * cores claras da paleta e no tema escuro.
 */
export function CategoryIcon({
  icon,
  color,
  variant = 'chip',
  className
}: CategoryIconProps): React.JSX.Element {
  const Icon = resolveCategoryIcon(icon)

  if (variant === 'plain') {
    return <Icon className={cn('size-4 shrink-0', className)} style={{ color }} />
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        'size-9 border',
        className
      )}
      style={{ backgroundColor: `${color}1f`, borderColor: `${color}40`, color }}
    >
      <Icon className="size-4.5" />
    </span>
  )
}
