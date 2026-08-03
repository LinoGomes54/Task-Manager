interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

/** Cabecalho padrao das paginas — mantem o espacamento consistente entre elas. */
export function PageHeader({ title, description, action }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {action}
    </div>
  )
}
