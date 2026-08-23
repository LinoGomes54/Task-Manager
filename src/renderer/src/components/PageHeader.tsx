interface PageHeaderProps {
  title: string
  description?: string
  /** Resumo numerico alinhado a direita — "11 abertas · 3 atrasadas". */
  stats?: React.ReactNode
  action?: React.ReactNode
}

/**
 * Cabecalho no formato do design: titulo e descricao **na mesma linha**, com o
 * resumo numerico empurrado para a direita.
 *
 * Empilhar titulo sobre descricao (o padrao anterior) gastava altura em toda
 * tela; inline, a faixa fica com a mesma altura de uma barra de ferramentas e
 * sobra espaco para o conteudo.
 */
export function PageHeader({
  title,
  description,
  stats,
  action
}: PageHeaderProps): React.JSX.Element {
  return (
    <div className="border-border/70 mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b pb-4">
      <h1 className="text-[18px] font-semibold tracking-tight">{title}</h1>

      {description && (
        <p
          className="min-w-0 flex-1 truncate text-[13px] first-letter:uppercase"
          style={{ color: 'var(--faint)' }}
          title={description}
        >
          {description}
        </p>
      )}

      {stats && (
        <p className="shrink-0 text-[12.5px]" style={{ color: 'var(--faint)' }}>
          {stats}
        </p>
      )}

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
