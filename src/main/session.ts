import Store from 'electron-store'

/**
 * Sessao persistida no processo principal (`%APPDATA%/task-manager/session.json`).
 * Guarda apenas o id do usuario e a validade — nunca a senha nem o hash.
 */

interface SessionData {
  userId: string | null
  expiresAt: string | null
}

const SESSION_DAYS = 30

const store = new Store<SessionData>({
  name: 'session',
  defaults: { userId: null, expiresAt: null }
})

export function saveSession(userId: string): void {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  store.set('userId', userId)
  store.set('expiresAt', expiresAt)
}

export function clearSession(): void {
  store.set('userId', null)
  store.set('expiresAt', null)
}

/** Retorna o id do usuario logado, ou `null` se nao houver sessao valida. */
export function getSessionUserId(): string | null {
  const userId = store.get('userId')
  const expiresAt = store.get('expiresAt')
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
