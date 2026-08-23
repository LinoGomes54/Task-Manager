import { useMemo, useState } from 'react'
import { Search, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { searchIcons } from '@/lib/category-icons'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  value: string | null
  onChange: (key: string) => void
  /** Cor da categoria, usada para destacar o icone escolhido. */
  color: string
}

/**
 * Seletor de icone da categoria, com busca em pt-BR.
 *
 * A altura e fixa e a rolagem fica dentro da lista: sem isso o dialogo cresceria
 * conforme os resultados e o botao de salvar sairia da tela.
 */
export function IconPicker({ value, onChange, color }: IconPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const groups = useMemo(() => searchIcons(query), [query])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar ícone: dinheiro, academia, casa…"
          className="h-8 pl-8 text-sm"
        />
      </div>

      <ScrollArea className="h-56 rounded-md border">
        <div className="space-y-3 p-2">
          {groups.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-xs">
              Nenhum ícone encontrado para “{query}”.
            </p>
          )}

          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-muted-foreground mb-1.5 px-1 text-[11px] font-medium">
                {group.label}
              </p>
              <div className="grid grid-cols-8 gap-1">
                {group.icons.map((option) => {
                  const Icon = option.icon
                  const selected = value === option.key

                  return (
                    <button
                      key={option.key}
                      type="button"
                      title={option.key}
                      onClick={() => onChange(option.key)}
                      className={cn(
                        'relative flex aspect-square items-center justify-center rounded-md border transition-colors',
                        selected
                          ? 'border-transparent'
                          : 'hover:bg-accent border-transparent hover:border-border'
                      )}
                      style={
                        selected
                          ? { backgroundColor: `${color}26`, borderColor: color, color }
                          : undefined
                      }
                    >
                      <Icon className="size-4" />
                      {selected && (
                        <Check
                          className="absolute -top-0.5 -right-0.5 size-3 rounded-full p-px text-white"
                          style={{ backgroundColor: color }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
