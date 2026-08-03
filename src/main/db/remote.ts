import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Conexao com o Neon (Postgres serverless) sobre HTTP.
 *
 * A `DATABASE_URL` e lida do ambiente e **nunca sai do processo principal** —
 * o renderer roda com `contextIsolation` e so enxerga os canais IPC.
 *
 * A conexao e preguicosa e tolerante: se a variavel nao existir, `getRemote()`
 * devolve `null` e o app segue funcionando 100% offline, apenas sem sincronizar.
 */

let client: NeonQueryFunction<false, false> | null = null
let resolved = false

export function isRemoteConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function getRemote(): NeonQueryFunction<false, false> | null {
  if (resolved) return client
  resolved = true

  const url = process.env.DATABASE_URL?.trim()
  if (!url) return null

  client = neon(url, { fullResults: false })
  return client
}

/** DDL aplicado no Neon na primeira sincronizacao, para o app funcionar sem `db:push`. */
export const REMOTE_SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL,
  updated_at    timestamptz NOT NULL,
  deleted_at    timestamptz
);

CREATE TABLE IF NOT EXISTS categories (
  id         text PRIMARY KEY,
  user_id    text NOT NULL,
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#64748b',
  icon       text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS tasks (
  id                    text PRIMARY KEY,
  user_id               text NOT NULL,
  category_id           text,
  title                 text NOT NULL,
  description           text,
  priority              text NOT NULL DEFAULT 'medium',
  status                text NOT NULL DEFAULT 'pending',
  is_important          boolean NOT NULL DEFAULT false,
  due_at                timestamptz,
  remind_minutes_before integer NOT NULL DEFAULT 15,
  notified_at           timestamptz,
  completed_at          timestamptz,
  recurrence            text NOT NULL DEFAULT 'none',
  recurrence_interval   integer NOT NULL DEFAULT 1,
  recurrence_until      timestamptz,
  parent_task_id        text,
  created_at            timestamptz NOT NULL,
  updated_at            timestamptz NOT NULL,
  deleted_at            timestamptz
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id               text PRIMARY KEY,
  auto_launch           boolean NOT NULL DEFAULT false,
  start_minimized       boolean NOT NULL DEFAULT false,
  close_to_tray         boolean NOT NULL DEFAULT true,
  notifications_enabled boolean NOT NULL DEFAULT true,
  sound_enabled         boolean NOT NULL DEFAULT true,
  reminder_lead_minutes integer NOT NULL DEFAULT 15,
  theme                 text NOT NULL DEFAULT 'system',
  created_at            timestamptz NOT NULL,
  updated_at            timestamptz NOT NULL,
  deleted_at            timestamptz
);

CREATE INDEX IF NOT EXISTS idx_users_updated       ON users (updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_user_upd ON categories (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_upd      ON tasks (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due      ON tasks (user_id, due_at);
`
