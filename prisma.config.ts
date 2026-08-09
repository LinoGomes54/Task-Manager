import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Configuracao do Prisma CLI.
 *
 * Usado **apenas em desenvolvimento**, para versionar e aplicar as migrations do
 * Neon. O app empacotado nao carrega nada do Prisma — o processo principal fala
 * com o banco via `@neondatabase/serverless`.
 *
 * O adapter aqui e o `pg` (TCP) e nao o driver HTTP do Neon de proposito:
 * migration precisa de transacao e advisory lock, que o endpoint HTTP nao oferece.
 */
function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL nao definida. Copie o .env.example para .env.')
  return url
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  // `datasource.url` atende os comandos de introspeccao e de diff;
  // o `adapter` atende os comandos que executam SQL no banco.
  datasource: {
    url: connectionString()
  },
  adapter: async () => new PrismaPg({ connectionString: connectionString() })
})
