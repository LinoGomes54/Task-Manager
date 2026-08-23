import { cn } from '@/lib/utils'

interface PanelProps {
  title: string
  /** Contador ou legenda curta alinhada a direita do titulo — "0/2", "5 abertas". */
  meta?: React.ReactNode
  /** Link ou botao discreto no canto do cabecalho. */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/**
 * Bloco de conteudo do design: cartao com um cabecalho enxuto onde o titulo fica
 * a esquerda e o contador a direita.
 *
 * Substitui o `Card` + `CardHeader` + `CardTitle` do shadcn nas telas de
 * conteudo: aquele conjunto tem padding generoso pensado para paginas web, e
 * aqui o design pede algo mais proximo de um painel de aplicativo.
 */
export function Panel({
  title,
  meta,
  action,
  className,
  children
}: PanelProps): React.JSX.Element {
  return (
    <section className={cn('bg-card rounded-2xl border p-3.5', className)}>
      <header className="mb-2.5 flex items-center justify-between gap-3 px-0.5">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {meta && (
            <span className="font-mono text-[11px]" style={{ color: 'var(--faint)' }}>
              {meta}
            </span>
          )}
          {action}
        </div>
      </header>
      {children}
    </section>
  )
}
