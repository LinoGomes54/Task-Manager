interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

/** Cabecalho padrao das paginas — mantem o espacamento consistente entre elas. */
export function PageHeader({ title, description, action }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm first-letter:uppercase">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
