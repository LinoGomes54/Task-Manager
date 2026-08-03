import { useState } from 'react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/PageHeader'
import {
  useCategories,
  useCreateCategory,
  useRemoveCategory,
  useUpdateCategory
} from '@/hooks/use-categories'
import { useStats } from '@/hooks/use-tasks'
import { cn } from '@/lib/utils'
import type { Category } from '@shared/types'

/** Paleta sugerida — cores que funcionam nos dois temas sem virar borrão. */
const PALETTE = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#a855f7',
  '#64748b'
]

export function CategoriesPage(): React.JSX.Element {
  const { data: categories = [], isLoading } = useCategories()
  const { data: stats } = useStats()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const removeCategory = useRemoveCategory()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [deleting, setDeleting] = useState<Category | null>(null)

  const countByCategory = new Map(
    (stats?.byCategory ?? []).map((item) => [item.categoryId, item.count])
  )

  function openCreate(): void {
    setEditing(null)
    setName('')
    setColor(PALETTE[0])
    setDialogOpen(true)
  }

  function openEdit(category: Category): void {
    setEditing(category)
    setName(category.name)
    setColor(category.color)
    setDialogOpen(true)
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim()) return

    if (editing) await updateCategory.mutateAsync({ id: editing.id, name, color })
    else await createCategory.mutateAsync({ name, color })

    setDialogOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Agrupe suas tarefas por área da vida: educação, financeiro, cuidado pessoal…"
        action={
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" />
            Nova categoria
          </Button>
        }
      />

      {isLoading && <p className="text-muted-foreground text-sm">Carregando…</p>}

      {!isLoading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
          <Tags className="text-muted-foreground mb-3 size-8" />
          <p className="text-sm font-medium">Nenhuma categoria</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Crie categorias para filtrar e visualizar suas tarefas por área.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id} className="group">
            <CardContent className="flex items-center gap-3 py-4">
              <span
                className="size-9 shrink-0 rounded-lg"
                style={{ backgroundColor: category.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{category.name}</p>
                <p className="text-muted-foreground text-xs">
                  {countByCategory.get(category.id) ?? 0} pendente(s)
                </p>
              </div>
              <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => openEdit(category)}
                  aria-label={`Editar ${category.name}`}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-destructive size-8"
                  onClick={() => setDeleting(category)}
                  aria-label={`Excluir ${category.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
              <DialogDescription>
                O nome e a cor aparecem nos filtros, nas tarefas e no calendário.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category-name">Nome</Label>
                <Input
                  id="category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex.: Educação"
                  autoFocus
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      aria-label={`Cor ${option}`}
                      className={cn(
                        'size-8 rounded-lg border-2 transition-transform',
                        color === option
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: option }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              As tarefas desta categoria não são apagadas — elas apenas ficam sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) removeCategory.mutate(deleting.id)
                setDeleting(null)
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
