import { pgTable, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core'

/**
 * Schema do Neon (Postgres). Espelha 1:1 o schema local em `schema.ts`.
 *
 * Serve a dois propositos:
 *  - `npm run db:push` cria/atualiza as tabelas no Neon a partir daqui;
 *  - documenta os tipos reais das colunas, ja que o motor de sync usa SQL cru
 *    (mais direto para os UPSERTs com condicao de last-write-wins).
 */

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (t) => [index('idx_users_updated').on(t.updatedAt)]
)

export const categories = pgTable(
  'categories',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    color: text('color').notNull().default('#64748b'),
    icon: text('icon'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (t) => [index('idx_categories_user_updated').on(t.userId, t.updatedAt)]
)

export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    categoryId: text('category_id'),
    title: text('title').notNull(),
    description: text('description'),
    priority: text('priority').notNull().default('medium'),
    status: text('status').notNull().default('pending'),
    isImportant: boolean('is_important').notNull().default(false),
    dueAt: timestamp('due_at', { withTimezone: true }),
    remindMinutesBefore: integer('remind_minutes_before').notNull().default(15),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    recurrence: text('recurrence').notNull().default('none'),
    recurrenceInterval: integer('recurrence_interval').notNull().default(1),
    recurrenceUntil: timestamp('recurrence_until', { withTimezone: true }),
    parentTaskId: text('parent_task_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (t) => [
    index('idx_tasks_user_updated').on(t.userId, t.updatedAt),
    index('idx_tasks_user_due').on(t.userId, t.dueAt)
  ]
)

export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey(),
  autoLaunch: boolean('auto_launch').notNull().default(false),
  startMinimized: boolean('start_minimized').notNull().default(false),
  closeToTray: boolean('close_to_tray').notNull().default(true),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  soundEnabled: boolean('sound_enabled').notNull().default(true),
  reminderLeadMinutes: integer('reminder_lead_minutes').notNull().default(15),
  theme: text('theme').notNull().default('system'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
})
