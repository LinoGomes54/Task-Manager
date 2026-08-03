import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * Sessao persistida no processo principal (`%APPDATA%/task-manager/session.json`).
 * Guarda apenas o id do usuario e a validade — nunca a senha nem o hash.
 *
 * Gravamos o JSON na mao em vez de usar `electron-store`: a biblioteca virou
 * ESM-only e nao carrega no bundle CommonJS do processo principal. Para dois
 * campos, `fs` resolve sem trazer o problema junto.
 */

interface SessionData {
  userId: string | null
  expiresAt: string | null
}

const SESSION_DAYS = 30
const EMPTY: SessionData = { userId: null, expiresAt: null }

function file(): string {
  return join(app.getPath('userData'), 'session.json')
}

function read(): SessionData {
  try {
    const parsed = JSON.parse(readFileSync(file(), 'utf8')) as Partial<SessionData>
    return {
      userId: typeof parsed.userId === 'string' ? parsed.userId : null,
      expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : null
    }
  } catch {
    // Arquivo ausente ou corrompido: tratamos como "sem sessao".
    return { ...EMPTY }
  }
}

function write(data: SessionData): void {
  try {
    writeFileSync(file(), JSON.stringify(data), 'utf8')
  } catch {
    // Sem permissao de escrita a sessao simplesmente nao persiste entre aberturas.
  }
}

export function saveSession(userId: string): void {
  write({
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  })
}

export function clearSession(): void {
  write({ ...EMPTY })
}

/** Retorna o id do usuario logado, ou `null` se nao houver sessao valida. */
export function getSessionUserId(): string | null {
  const { userId, expiresAt } = read()
  if (!userId || !expiresAt) return null

  if (new Date(expiresAt).getTime() < Date.now()) {
    clearSession()
    return null
  }
  return userId
}

/** Igual a `getSessionUserId`, mas lanca — para uso nos handlers que exigem login. */
export function requireUserId(): string {
  const userId = getSessionUserId()
  if (!userId) throw new Error('Sessao expirada. Entre novamente.')
  return userId
}
