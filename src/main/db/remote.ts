import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Conexao com o Neon (Postgres serverless) sobre HTTP.
 *
 * A `DATABASE_URL` e lida do ambiente e **nunca sai do processo principal** â€”
 * o renderer roda com `contextIsolation` e so enxerga os canais IPC.
 *
 * A conexao e preguicosa e tolerante: se a variavel nao existir, `getRemote()`
 * devolve `null` e o app segue funcionando 100% offline, apenas sem sincronizar.
 *
 * O schema do banco **nao** e criado por aqui: quem manda nele e o Prisma Migrate
 * (`prisma/migrations`, aplicado com `npm run db:deploy`). O app apenas le e
 * escreve nas tabelas â€” se elas nao existirem, a sincronizacao avisa em vez de
 * criar uma versao possivelmente desatualizada do schema por conta propria.
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
