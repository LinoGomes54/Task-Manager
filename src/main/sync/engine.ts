import { queryAll, queryOne, execute, transaction, now } from '../db/local'
import { getRemote, isRemoteConfigured } from '../db/remote'
import {
  SYNC_TABLES,
  SYNC_COLUMNS,
  PRIMARY_KEYS,
  BOOLEAN_COLUMNS,
  TIMESTAMP_COLUMNS,
  type SyncTable
} from '../db/schema'
import type { SyncState } from '@shared/types'

/**
 * Motor de sincronizacao offline-first.
 *
 * O SQLite local e a fonte de verdade da UI: toda escrita acontece nele e retorna
 * imediatamente, mesmo sem internet. O Neon e o espelho duravel/compartilhado.
 *
 * Estrategia — last-write-wins por `updated_at`:
 *
 *  1. PUSH  — envia as linhas marcadas com `dirty = 1`. O UPSERT no Postgres so
 *             sobrescreve se a versao enviada for mais nova que a que ja esta la.
 *  2. PULL  — traz o que mudou desde o cursor `last_pulled_at` de cada tabela e
 *             aplica localmente, mas nunca por cima de uma linha ainda `dirty`
 *             (essa linha ainda vai ser enviada; quem decide o vencedor e o push).
 *
 * Exclusoes sao soft delete (`deleted_at`), entao se propagam como qualquer update.
 * IDs sao UUID gerados no cliente — nao ha espera por sequence do servidor nem
 * risco de colisao entre maquinas.
 */

const PUSH_BATCH = 200
const PULL_BATCH = 500

let state: SyncState = {
  configured: isRemoteConfigured(),
  status: 'idle',
  lastSyncedAt: null,
  pendingChanges: 0,
  lastError: null
}

let running = false
let listener: ((state: SyncState) => void) | null = null

export function onSyncStateChange(fn: (state: SyncState) => void): void {
  listener = fn
}

function setState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch }
  listener?.(state)
}

export function getSyncState(): SyncState {
  return { ...state, pendingChanges: countPending() }
}

function countPending(): number {
  try {
    let total = 0
    for (const table of SYNC_TABLES) {
      const row = queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE dirty = 1`)
      total += row?.n ?? 0
    }
    return total
  } catch {
    return 0
  }
}

/* ------------------------------------------------------------------ */
/* Conversao entre os dois dialetos                                    */
/* ------------------------------------------------------------------ */

/** SQLite (0/1, TEXT ISO) → Postgres (boolean, timestamptz). */
function toRemoteValue(table: SyncTable, column: string, value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (BOOLEAN_COLUMNS[table].includes(column)) return value === 1 || value === true
  return value
}

/** Postgres (boolean, Date) → SQLite (0/1, TEXT ISO). */
function toLocalValue(table: SyncTable, column: string, value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (BOOLEAN_COLUMNS[table].includes(column)) return value === true || value === 1 ? 1 : 0
  if (TIMESTAMP_COLUMNS[table].includes(column)) {
    if (value instanceof Date) return value.toISOString()
    return new Date(String(value)).toISOString()
  }
  return value
}

/* ------------------------------------------------------------------ */
/* Cursor de pull                                                      */
/* ------------------------------------------------------------------ */

function getCursor(table: SyncTable): string {
  const row = queryOne<{ last_pulled_at: string | null }>(
    'SELECT last_pulled_at FROM _sync_state WHERE table_name = ?',
    [table]
  )
  return row?.last_pulled_at ?? '1970-01-01T00:00:00.000Z'
}

function setCursor(table: SyncTable, value: string): void {
  execute(
    `INSERT INTO _sync_state (table_name, last_pulled_at) VALUES (?, ?)
     ON CONFLICT (table_name) DO UPDATE SET last_pulled_at = excluded.last_pulled_at`,
    [table, value]
  )
}

/* ------------------------------------------------------------------ */
/* PUSH                                                                */
/* ------------------------------------------------------------------ */

async function pushTable(table: SyncTable, userId: string): Promise<number> {
  const sql = getRemote()
  if (!sql) return 0

  const columns = SYNC_COLUMNS[table]
  const pk = PRIMARY_KEYS[table]
  const scope = table === 'users' ? 'id = ?' : 'user_id = ?'

  const rows = queryAll<Record<string, unknown>>(
    `SELECT ${columns.join(', ')} FROM ${table} WHERE dirty = 1 AND ${scope} LIMIT ${PUSH_BATCH}`,
    [userId]
  )
  if (rows.length === 0) return 0

  // Monta um UPSERT multi-linha: VALUES ($1,$2,...), ($n+1,...), ...
  const params: unknown[] = []
  const tuples = rows.map((row) => {
    const placeholders = columns.map((col) => {
      params.push(toRemoteValue(table, col, row[col]))
      return `$${params.length}`
    })
    return `(${placeholders.join(', ')})`
  })

  const updates = columns
    .filter((col) => col !== pk)
    .map((col) => `${col} = EXCLUDED.${col}`)
    .join(', ')

  const text = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${tuples.join(', ')}
    ON CONFLICT (${pk}) DO UPDATE SET ${updates}
    WHERE ${table}.updated_at < EXCLUDED.updated_at
  `

  await sql.query(text, params)

  // So limpa o `dirty` do que realmente foi enviado nesta rodada.
  const ids = rows.map((r) => r[pk])
  const holes = ids.map(() => '?').join(', ')
  execute(`UPDATE ${table} SET dirty = 0 WHERE ${pk} IN (${holes})`, ids)

  return rows.length
}

/* ------------------------------------------------------------------ */
/* PULL                                                                */
/* ------------------------------------------------------------------ */

async function pullTable(table: SyncTable, userId: string): Promise<number> {
  const sql = getRemote()
  if (!sql) return 0

  const columns = SYNC_COLUMNS[table]
  const pk = PRIMARY_KEYS[table]
  const scope = table === 'users' ? 'id' : 'user_id'
  const cursor = getCursor(table)

  const remoteRows = (await sql.query(
    `SELECT ${columns.join(', ')} FROM ${table}
     WHERE updated_at > $1 AND ${scope} = $2
     ORDER BY updated_at ASC
     LIMIT ${PULL_BATCH}`,
    [cursor, userId]
  )) as Record<string, unknown>[]

  if (remoteRows.length === 0) return 0

  let maxUpdatedAt = cursor

  transaction(() => {
    for (const remote of remoteRows) {
      const row: Record<string, unknown> = {}
      for (const col of columns) row[col] = toLocalValue(table, col, remote[col])

      const remoteUpdatedAt = String(row.updated_at)
      if (remoteUpdatedAt > maxUpdatedAt) maxUpdatedAt = remoteUpdatedAt

      const local = queryOne<{ updated_at: string; dirty: number }>(
        `SELECT updated_at, dirty FROM ${table} WHERE ${pk} = ?`,
        [row[pk]]
      )

      // Linha com alteracao local pendente vence por ora: o push da proxima
      // rodada e quem decide, aplicando o mesmo criterio de last-write-wins.
      if (local?.dirty === 1) continue
      if (local && local.updated_at >= remoteUpdatedAt) continue

      const holes = columns.map(() => '?').join(', ')
      const values = columns.map((col) => row[col])
      execute(
        `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}, dirty)
         VALUES (${holes}, 0)`,
        values
      )
    }
    setCursor(table, maxUpdatedAt)
  })

  return remoteRows.length
}

/* ------------------------------------------------------------------ */
/* Orquestracao                                                        */
/* ------------------------------------------------------------------ */

/**
 * Traduz erros do Postgres em algo acionavel na interface.
 *
 * O caso que mais importa e o `42P01` (relation does not exist): significa que as
 * migrations do Prisma nunca foram aplicadas nesse banco. Sem esta traducao, o
 * usuario veria apenas `relation "tasks" does not exist` e nao saberia o que fazer.
 */
/**
 * Apaga credenciais de um texto antes de ele sair do processo principal.
 *
 * `lastError` atravessa o IPC e aparece na tela de Configuracoes. A mensagem vem
 * do driver do Postgres, que em algumas falhas ecoa a URL de conexao — e a URL
 * carrega a senha do banco. Nao da para saber de antemao qual erro faz isso,
 * entao a limpeza e cega: qualquer `usuario:senha@` vira `***@`, e a propria
 * `DATABASE_URL` e removida se aparecer inteira.
 */
export function redactSecrets(text: string): string {
  let limpo = text.replace(/([a-z+]+:\/\/)[^\s/@:]+:[^\s/@]*@/gi, '$1***@')

  const url = process.env.DATABASE_URL?.trim()
  if (url) limpo = limpo.split(url).join('[DATABASE_URL]')

  return limpo
}

export function describeError(err: unknown): string {
  const message = redactSecrets(err instanceof Error ? err.message : String(err))

  if (/does not exist|42P01/i.test(message)) {
    return 'As tabelas ainda não existem no Neon. Rode `npm run db:deploy` para aplicar as migrations.'
  }
  return message
}

/**
 * Roda um ciclo completo de sincronizacao para o usuario logado.
 * Nunca lanca: falha de rede apenas marca o estado como `offline`/`error`.
 */
export async function runSync(userId: string): Promise<SyncState> {
  if (!isRemoteConfigured()) {
    setState({ configured: false, status: 'idle' })
    return getSyncState()
  }
  if (running) return getSyncState()

  running = true
  setState({ configured: true, status: 'syncing', lastError: null })

  try {
    // Push antes de pull: o que foi feito offline tem que chegar la
    // antes de compararmos versoes na volta.
    for (const table of SYNC_TABLES) await pushTable(table, userId)
    for (const table of SYNC_TABLES) await pullTable(table, userId)

    setState({ status: 'idle', lastSyncedAt: now(), lastError: null })
  } catch (err) {
    const message = describeError(err)
    const offline = /fetch|network|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|timeout/i.test(message)
    setState({ status: offline ? 'offline' : 'error', lastError: message })
  } finally {
    running = false
  }

  return getSyncState()
}

/** Envia um usuario recem-criado ao Neon. Usado no cadastro, que exige internet. */
export async function pushNewUser(userId: string): Promise<void> {
  if (!isRemoteConfigured()) return
  await pushTable('users', userId)
  await pushTable('user_settings', userId)
  await pushTable('categories', userId)
}

/** Busca um usuario direto no Neon — permite login em uma maquina nova. */
export async function fetchRemoteUserByEmail(
  email: string
): Promise<Record<string, unknown> | null> {
  const sql = getRemote()
  if (!sql) return null

  const rows = (await sql.query(
    `SELECT ${SYNC_COLUMNS.users.join(', ')} FROM users
     WHERE lower(email) = lower($1) AND deleted_at IS NULL LIMIT 1`,
    [email]
  )) as Record<string, unknown>[]

  if (rows.length === 0) return null

  const row: Record<string, unknown> = {}
  for (const col of SYNC_COLUMNS.users) row[col] = toLocalValue('users', col, rows[0][col])
  return row
}

/** Verifica se um e-mail ja existe no Neon, evitando cadastro duplicado. */
export async function remoteEmailExists(email: string): Promise<boolean> {
  return (await fetchRemoteUserByEmail(email)) !== null
}

let scheduled: NodeJS.Timeout | null = null

/** Agenda um sync com debounce — chamado apos cada mutacao. */
export function scheduleSync(userId: string, delayMs = 2000): void {
  if (scheduled) clearTimeout(scheduled)
  scheduled = setTimeout(() => {
    scheduled = null
    void runSync(userId)
  }, delayMs)
}
