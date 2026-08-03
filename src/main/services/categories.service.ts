import { queryAll, queryOne, execute, now, newId } from '../db/local'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@shared/types'

/** Categorias criadas junto com a conta, para o usuario nao comecar do zero. */
export const DEFAULT_CATEGORIES: Array<{ name: string; color: string; icon: string }> = [
  { name: 'Educação', color: '#6366f1', icon: 'graduation-cap' },
  { name: 'Financeiro', color: '#10b981', icon: 'wallet' },
  { name: 'Cuidado Pessoal', color: '#ec4899', icon: 'heart-pulse' },
  { name: 'Trabalho', color: '#f59e0b', icon: 'briefcase' },
  { name: 'Casa', color: '#0ea5e9', icon: 'house' },
  { name: 'Lazer', color: '#a855f7', icon: 'gamepad-2' }
]

type Row = Record<string, unknown>

function mapCategory(row: Row): Category {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    color: String(row.color),
    icon: row.icon === null ? null : String(row.icon),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

export function listCategories(userId: string): Category[] {
  return queryAll<Row>(
    `SELECT * FROM categories WHERE user_id = ? AND deleted_at IS NULL ORDER BY name COLLATE NOCASE`,
    [userId]
  ).map(mapCategory)
}

export function createCategory(userId: string, input: CreateCategoryInput): Category {
  const name = input.name.trim()
  if (!name) throw new Error('O nome da categoria é obrigatório.')

  const duplicate = queryOne<Row>(
    `SELECT id FROM categories
     WHERE user_id = ? AND deleted_at IS NULL AND lower(name) = lower(?)`,
    [userId, name]
  )
  if (duplicate) throw new Error('Já existe uma categoria com esse nome.')

  const id = newId()
  const timestamp = now()
  execute(
    `INSERT INTO categories (id, user_id, name, color, icon, created_at, updated_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, userId, name, input.color, input.icon ?? null, timestamp, timestamp]
  )

  return mapCategory(queryOne<Row>('SELECT * FROM categories WHERE id = ?', [id])!)
}

export function updateCategory(userId: string, input: UpdateCategoryInput): Category {
  const existing = queryOne<Row>(
    'SELECT * FROM categories WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [input.id, userId]
  )
  if (!existing) throw new Error('Categoria não encontrada.')

  const name = input.name?.trim() ?? String(existing.name)
  if (!name) throw new Error('O nome da categoria é obrigatório.')

  execute(
    `UPDATE categories SET name = ?, color = ?, icon = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND user_id = ?`,
    [
      name,
      input.color ?? String(existing.color),
      input.icon !== undefined ? input.icon : existing.icon,
      now(),
      input.id,
      userId
    ]
  )

  return mapCategory(queryOne<Row>('SELECT * FROM categories WHERE id = ?', [input.id])!)
}

/**
 * Exclusao logica (`deleted_at`) — e assim que a remocao viaja ate o Neon.
 * As tarefas da categoria sao preservadas e passam a ficar "sem categoria".
 */
export function removeCategory(userId: string, id: string): void {
  const timestamp = now()
  execute(
    'UPDATE categories SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ? AND user_id = ?',
    [timestamp, timestamp, id, userId]
  )
  execute(
    `UPDATE tasks SET category_id = NULL, updated_at = ?, dirty = 1
     WHERE category_id = ? AND user_id = ?`,
    [timestamp, id, userId]
  )
}

/** Cria as categorias padrao de uma conta nova. */
export function seedDefaultCategories(userId: string): void {
  const timestamp = now()
  for (const category of DEFAULT_CATEGORIES) {
    execute(
      `INSERT INTO categories (id, user_id, name, color, icon, created_at, updated_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [newId(), userId, category.name, category.color, category.icon, timestamp, timestamp]
    )
  }
}
