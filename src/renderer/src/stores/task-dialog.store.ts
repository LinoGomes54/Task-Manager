import { create } from 'zustand'
import type { RecurrenceRule, Task, TaskKind } from '@shared/types'

/**
 * Controla o dialogo de criar/editar tarefa.
 *
 * Fica num store global porque o dialogo e aberto de varios lugares que nao tem
 * relacao de parentesco: o botao do topo, cada item da lista, um dia do
 * calendario e ate o menu da bandeja (via evento de navegacao).
 */

interface TaskDialogStore {
  open: boolean
  /** Tarefa em edicao; `null` quando e criacao. */
  editing: Task | null
  /** Valores iniciais ao criar (ex.: o dia clicado no calendario). */
  defaults: {
    dueAt?: string
    categoryId?: string
    isImportant?: boolean
    recurrence?: RecurrenceRule
    kind?: TaskKind
  } | null
  openNew: (defaults?: TaskDialogStore['defaults']) => void
  openEdit: (task: Task) => void
  close: () => void
}

export const useTaskDialog = create<TaskDialogStore>((set) => ({
  open: false,
  editing: null,
  defaults: null,
  openNew: (defaults = null) => set({ open: true, editing: null, defaults }),
  openEdit: (task) => set({ open: true, editing: task, defaults: null }),
  close: () => set({ open: false, editing: null, defaults: null })
}))
