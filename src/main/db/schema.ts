/**
 * DDL do cache local (SQLite).
 *
 * As tabelas espelham exatamente o schema do Neon (`schema.remote.ts`), com tres
 * colunas a mais que so existem localmente e nunca sao enviadas ao Postgres:
 *
 * - `dirty`   → 1 quando a linha tem alteracoes locais ainda nao enviadas.
 * - `_sync_state` → guarda o cursor `last_pulled_at` de cada tabela.
 *
 * Datas sao gravadas como TEXT no formato ISO 8601 UTC (`2026-08-03T12:00:00.000Z`),
 * o que torna a comparacao lexicografica equivalente a comparacao cronologica —
 * essencial para o last-write-wins do motor de sincronizacao.
 */
export const LOCAL_SCHEMA_SQL = /* sql */ `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT,
  dirty         INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#64748b',
  icon       TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tasks (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  category_id           TEXT,
  title                 TEXT NOT NULL,
  description           TEXT,
  priority              TEXT NOT NULL DEFAULT 'medium',
  status                TEXT NOT NULL DEFAULT 'pending',
  is_important          INTEGER NOT NULL DEFAULT 0,
  due_at                TEXT,
  remind_minutes_before INTEGER NOT NULL DEFAULT 15,
  notified_at           TEXT,
  completed_at          TEXT,
  recurrence            TEXT NOT NULL DEFAULT 'none',
  recurrence_interval   INTEGER NOT NULL DEFAULT 1,
  recurrence_until      TEXT,
  parent_task_id        TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  deleted_at            TEXT,
  dirty                 INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id               TEXT PRIMARY KEY,
  auto_launch           INTEGER NOT NULL DEFAULT 0,
  start_minimized       INTEGER NOT NULL DEFAULT 0,
  close_to_tray         INTEGER NOT NULL DEFAULT 1,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  sound_enabled         INTEGER NOT NULL DEFAULT 1,
  reminder_lead_minutes INTEGER NOT NULL DEFAULT 15,
  lock_future_recurring INTEGER NOT NULL DEFAULT 1,
  theme                 TEXT NOT NULL DEFAULT 'system',
  density               TEXT NOT NULL DEFAULT 'compacto',
  accent_color          TEXT NOT NULL DEFAULT '#5b5bd6',
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  deleted_at            TEXT,
  dirty                 INTEGER NOT NULL DEFAULT 1
);

-- Cursor de pull por tabela: guarda o maior updated_at ja trazido do Neon.
CREATE TABLE IF NOT EXISTS _sync_state (
  table_name     TEXT PRIMARY KEY,
  last_pulled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_user      ON tasks (user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due       ON tasks (user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_dirty     ON tasks (dirty);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories (user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);
`

/** Tabelas participantes da sincronizacao, na ordem de dependencia. */
export const SYNC_TABLES = ['users', 'categories', 'tasks', 'user_settings'] as const
export type SyncTable = (typeof SYNC_TABLES)[number]

/** Chave primaria de cada tabela sincronizavel. */
export const PRIMARY_KEYS: Record<SyncTable, string> = {
  users: 'id',
  categories: 'id',
  tasks: 'id',
  user_settings: 'user_id'
}

/** Colunas sincronizadas (a coluna local `dirty` fica de fora de proposito). */
export const SYNC_COLUMNS: Record<SyncTable, string[]> = {
  users: ['id', 'name', 'email', 'password_hash', 'created_at', 'updated_at', 'deleted_at'],
  categories: [
    'id',
    'user_id',
    'name',
    'color',
    'icon',
    'created_at',
    'updated_at',
    'deleted_at'
  ],
  tasks: [
    'id',
    'user_id',
    'category_id',
    'title',
    'description',
    'priority',
    'status',
    'is_important',
    'due_at',
    'remind_minutes_before',
    'notified_at',
    'completed_at',
    'recurrence',
    'recurrence_interval',
    'recurrence_until',
    'parent_task_id',
    'created_at',
    'updated_at',
    'deleted_at'
  ],
  user_settings: [
    'user_id',
    'auto_launch',
    'start_minimized',
    'close_to_tray',
    'notifications_enabled',
    'sound_enabled',
    'reminder_lead_minutes',
    'lock_future_recurring',
    'theme',
    'density',
    'accent_color',
    'created_at',
    'updated_at',
    'deleted_at'
  ]
}

/** Colunas booleanas: o SQLite guarda 0/1, o Postgres guarda `boolean`. */
export const BOOLEAN_COLUMNS: Record<SyncTable, string[]> = {
  users: [],
  categories: [],
  tasks: ['is_important'],
  user_settings: [
    'auto_launch',
    'start_minimized',
    'close_to_tray',
    'notifications_enabled',
    'sound_enabled',
    'lock_future_recurring'
  ]
}

/** Colunas de data/hora: precisam virar ISO string ao voltar do Postgres. */
export const TIMESTAMP_COLUMNS: Record<SyncTable, string[]> = {
  users: ['created_at', 'updated_at', 'deleted_at'],
  categories: ['created_at', 'updated_at', 'deleted_at'],
  tasks: [
    'due_at',
    'notified_at',
    'completed_at',
    'recurrence_until',
    'created_at',
    'updated_at',
    'deleted_at'
  ],
  user_settings: ['created_at', 'updated_at', 'deleted_at']
}
