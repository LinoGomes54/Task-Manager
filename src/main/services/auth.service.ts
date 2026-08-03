import { hashSync, compareSync } from 'bcryptjs'
import { queryOne, execute, transaction, now, newId } from '../db/local'
import { isRemoteConfigured } from '../db/remote'
import { fetchRemoteUserByEmail, pushNewUser, remoteEmailExists } from '../sync/engine'
import { seedDefaultCategories } from './categories.service'
import { createDefaultSettings, getSettings } from './settings.service'
import { saveSession, clearSession, getSessionUserId } from '../session'
import type { AuthResult, Session, User } from '@shared/types'

/**
 * Autenticacao local do app — sem provedor externo, conforme pedido.
 *
 * A senha nunca e armazenada: guardamos apenas o hash bcrypt, que e replicado
 * junto com o usuario. Como o hash fica no cache local, **o login funciona
 * offline** em qualquer maquina onde o usuario ja entrou pelo menos uma vez.
 * O cadastro, por outro lado, precisa de internet para reservar o e-mail no Neon
 * (quando ha `DATABASE_URL`), evitando duas contas iguais em maquinas diferentes.
 */

const BCRYPT_ROUNDS = 10
type Row = Record<string, unknown>

function mapUser(row: Row): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    createdAt: String(row.created_at)
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function validate(name: string, email: string, password: string): void {
  if (name.trim().length < 2) throw new Error('Informe seu nome.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.')
  if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  const cleanEmail = normalizeEmail(email)
  validate(name, cleanEmail, password)

  const localDuplicate = queryOne<Row>(
    'SELECT id FROM users WHERE lower(email) = ? AND deleted_at IS NULL',
    [cleanEmail]
  )
  if (localDuplicate) throw new Error('Já existe uma conta com esse e-mail.')

  if (isRemoteConfigured()) {
    try {
      if (await remoteEmailExists(cleanEmail)) {
        throw new Error('Já existe uma conta com esse e-mail.')
      }
    } catch (err) {
      // Erro de duplicidade sobe; falha de rede vira uma mensagem clara.
      if (err instanceof Error && err.message.includes('Já existe')) throw err
      throw new Error(
        'Não foi possível criar a conta sem internet. Conecte-se e tente novamente.'
      )
    }
  }

  const id = newId()
  const timestamp = now()

  transaction(() => {
    execute(
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [id, name.trim(), cleanEmail, hashSync(password, BCRYPT_ROUNDS), timestamp, timestamp]
    )
    createDefaultSettings(id)
    seedDefaultCategories(id)
  })

  if (isRemoteConfigured()) {
    try {
      await pushNewUser(id)
    } catch {
      // A conta ja existe localmente; o proximo ciclo de sync envia.
    }
  }

  saveSession(id)
  return { user: mapUser(queryOne<Row>('SELECT * FROM users WHERE id = ?', [id])!), settings: getSettings(id) }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = normalizeEmail(email)

  let row = queryOne<Row>(
    'SELECT * FROM users WHERE lower(email) = ? AND deleted_at IS NULL',
    [cleanEmail]
  )

  // Primeira vez nesta maquina: busca a conta no Neon e replica localmente.
  if (!row && isRemoteConfigured()) {
    const remote = await fetchRemoteUserByEmail(cleanEmail)
    if (remote) {
      execute(
        `INSERT OR REPLACE INTO users
           (id, name, email, password_hash, created_at, updated_at, deleted_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          remote.id,
          remote.name,
          remote.email,
          remote.password_hash,
          remote.created_at,
          remote.updated_at,
          remote.deleted_at ?? null
        ]
      )
      row = queryOne<Row>('SELECT * FROM users WHERE id = ?', [remote.id])
    }
  }

  if (!row) throw new Error('E-mail ou senha inválidos.')
  if (!compareSync(password, String(row.password_hash))) {
    throw new Error('E-mail ou senha inválidos.')
  }

  const user = mapUser(row)
  saveSession(user.id)
  return { user, settings: getSettings(user.id) }
}

export function logout(): void {
  clearSession()
}

/** Restaura a sessao salva no disco. Usado no boot do app. */
export function getCurrentSession(): Session | null {
  const userId = getSessionUserId()
  if (!userId) return null

  const row = queryOne<Row>('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [userId])
  if (!row) {
    clearSession()
    return null
  }
  return { user: mapUser(row), settings: getSettings(userId) }
}
