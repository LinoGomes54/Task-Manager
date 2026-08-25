import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { app } from 'electron'
import { LOCAL_INDEXES_SQL, LOCAL_SCHEMA_SQL } from './schema'

/**
 * Cache local em SQLite, usando o modulo `node:sqlite` embutido no Node 24 que
 * acompanha o Electron 43. Foi escolhido no lugar do `better-sqlite3` porque nao
 * exige compilacao nativa (node-gyp / Visual Studio Build Tools) — o app instala
 * e empacota em qualquer maquina Windows sem toolchain de C++.
 *
 * Este arquivo so roda no processo principal. O renderer nunca toca no banco.
 */

let db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!db) throw new Error('Banco local ainda nao foi inicializado')
  return db
}

export function initLocalDb(): DatabaseSync {
  if (db) return db

  const file = join(app.getPath('userData'), 'task-manager.db')
  db = new DatabaseSync(file)
  // Ordem obrigatoria: tabelas, depois colunas novas, depois indices. Os indices
  // podem citar colunas que so a migration adiciona num banco antigo.
  db.exec(LOCAL_SCHEMA_SQL)
  runLocalMigrations(db)
  db.exec(LOCAL_INDEXES_SQL)
  return db
}

/**
 * Colunas adicionadas depois que o app ja rodou em alguma maquina.
 *
 * O `CREATE TABLE IF NOT EXISTS` do schema so cobre bancos novos — quem ja tinha
 * o arquivo criado nao ganharia a coluna. Aqui conferimos o que existe de fato e
 * completamos o que falta, o que torna a atualizacao do app segura.
 *
 * O banco remoto tem seu proprio caminho de evolucao: `prisma/migrations`.
 */
const LOCAL_COLUMN_MIGRATIONS: Array<{ table: string; column: string; definition: string }> = [
  {
    table: 'user_settings',
    column: 'lock_future_recurring',
    definition: 'INTEGER NOT NULL DEFAULT 1'
  },
  { table: 'user_settings', column: 'density', definition: "TEXT NOT NULL DEFAULT 'espacoso'" },
  {
    table: 'user_settings',
    column: 'accent_color',
    definition: "TEXT NOT NULL DEFAULT '#5b5bd6'"
  },
  { table: 'tasks', column: 'recurrence_weekdays', definition: "TEXT NOT NULL DEFAULT ''" },
  { table: 'tasks', column: 'kind', definition: "TEXT NOT NULL DEFAULT 'task'" },
  { table: 'tasks', column: 'duration_minutes', definition: 'INTEGER NOT NULL DEFAULT 25' },
  { table: 'tasks', column: 'auto_complete', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'tasks', column: 'break_after_minutes', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'tasks', column: 'focus_minutes', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'tasks', column: 'cycle_break_minutes', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'tasks', column: 'agenda_date', definition: 'TEXT' },
  { table: 'tasks', column: 'agenda_position', definition: 'INTEGER NOT NULL DEFAULT 0' },
  {
    table: 'user_settings',
    column: 'pomodoro_minutes',
    definition: 'INTEGER NOT NULL DEFAULT 25'
  },
  { table: 'user_settings', column: 'break_minutes', definition: 'INTEGER NOT NULL DEFAULT 5' },
  {
    table: 'user_settings',
    column: 'agenda_start_time',
    definition: "TEXT NOT NULL DEFAULT '09:00'"
  },
  { table: 'user_settings', column: 'mini_sidebar', definition: 'INTEGER NOT NULL DEFAULT 0' }
]

function runLocalMigrations(conn: DatabaseSync): void {
  for (const { table, column, definition } of LOCAL_COLUMN_MIGRATIONS) {
    const columns = conn.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
    if (columns.length === 0) continue // tabela ainda nao existe
    if (columns.some((c) => c.name === column)) continue

    conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

export function closeLocalDb(): void {
  db?.close()
  db = null
}

export function getDbPath(): string {
  return join(app.getPath('userData'), 'task-manager.db')
}

/* ------------------------------------------------------------------ */
/* Helpers de consulta                                                 */
/* ------------------------------------------------------------------ */

type Params = Record<string, unknown> | unknown[]

/** Normaliza parametros: o `node:sqlite` nao aceita `undefined` nem `boolean`. */
function normalize(params: Params): Params {
  const coerce = (v: unknown): unknown => {
    if (v === undefined) return null
    if (typeof v === 'boolean') return v ? 1 : 0
    return v
  }
  if (Array.isArray(params)) return params.map(coerce)
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, coerce(v)]))
}

export function queryAll<T = Record<string, unknown>>(sql: string, params: Params = []): T[] {
  const stmt = getDb().prepare(sql)
  const normalized = normalize(params)
  return (
    Array.isArray(normalized) ? stmt.all(...(normalized as never[])) : stmt.all(normalized as never)
  ) as T[]
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: Params = []
): T | undefined {
  const stmt = getDb().prepare(sql)
  const normalized = normalize(params)
  const row = Array.isArray(normalized)
    ? stmt.get(...(normalized as never[]))
    : stmt.get(normalized as never)
  return row as T | undefined
}

export function execute(sql: string, params: Params = []): void {
  const stmt = getDb().prepare(sql)
  const normalized = normalize(params)
  if (Array.isArray(normalized)) stmt.run(...(normalized as never[]))
  else stmt.run(normalized as never)
}

/**
 * Executa `fn` dentro de uma transacao. O `node:sqlite` nao expoe um helper de
 * transacao como o `better-sqlite3`, entao controlamos BEGIN/COMMIT na mao.
 */
export function transaction<T>(fn: () => T): T {
  const conn = getDb()
  conn.exec('BEGIN')
  try {
    const result = fn()
    conn.exec('COMMIT')
    return result
  } catch (err) {
    conn.exec('ROLLBACK')
    throw err
  }
}

/* ------------------------------------------------------------------ */
/* Utilitarios de dominio                                              */
/* ------------------------------------------------------------------ */

/** Timestamp padrao do app: ISO 8601 UTC, comparavel lexicograficamente. */
export function now(): string {
  return new Date().toISOString()
}

export function newId(): string {
  return crypto.randomUUID()
}

export function toBool(value: unknown): boolean {
  return value === 1 || value === true || value === '1'
}
