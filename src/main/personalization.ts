import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { app, dialog, BrowserWindow } from 'electron'
import type { MediaKind, Personalization } from '@shared/types'

/**
 * Som e imagens que o usuario escolhe para deixar o app com a cara dele.
 *
 * **Fica so nesta maquina.** Nada disso vai para o Neon: um arquivo de audio ou
 * uma foto nao sao dados de tarefa, e enviar binario para o banco encareceria a
 * sincronizacao sem nenhum ganho. Por isso mora num JSON proprio, e nao na
 * tabela `user_settings`, que e sincronizada.
 *
 * O arquivo escolhido e **copiado** para a pasta de dados do app em vez de ter o
 * caminho guardado: um caminho aponta para um arquivo que o usuario pode mover,
 * renomear ou apagar, e o app ficaria com um som que nao toca mais sem dizer
 * por que.
 */

const MAX_BYTES = 8 * 1024 * 1024

const FILTROS: Record<MediaKind, Electron.FileFilter[]> = {
  alarmSound: [{ name: 'Áudio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] }],
  avatar: [{ name: 'Imagem', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
  background: [{ name: 'Imagem', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
}

const TITULOS: Record<MediaKind, string> = {
  alarmSound: 'Escolha o som do alarme',
  avatar: 'Escolha a foto de perfil',
  background: 'Escolha a imagem de fundo'
}

/** MIME por extensao, para montar o `data:` URI que o renderer consegue tocar. */
const MIMES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

const VAZIO: Personalization = { alarmSound: null, avatar: null, background: null }

function pastaMedia(): string {
  const dir = join(app.getPath('userData'), 'media')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function arquivoConfig(): string {
  return join(app.getPath('userData'), 'personalization.json')
}

function ler(): Personalization {
  try {
    const bruto = JSON.parse(readFileSync(arquivoConfig(), 'utf8')) as Partial<Personalization>
    const campo = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
    return {
      alarmSound: campo(bruto.alarmSound),
      avatar: campo(bruto.avatar),
      background: campo(bruto.background)
    }
  } catch {
    return { ...VAZIO }
  }
}

function gravar(dados: Personalization): void {
  try {
    writeFileSync(arquivoConfig(), JSON.stringify(dados, null, 2), 'utf8')
  } catch {
    // Sem permissao de escrita, a escolha simplesmente nao persiste.
  }
}

/** Nomes de arquivo guardados, para a interface saber o que esta definido. */
export function getPersonalization(): Personalization {
  const atual = ler()
  // Um arquivo apagado por fora nao pode continuar anunciado como definido.
  const valido = (nome: string | null): string | null =>
    nome && existsSync(join(pastaMedia(), nome)) ? nome : null

  return {
    alarmSound: valido(atual.alarmSound),
    avatar: valido(atual.avatar),
    background: valido(atual.background)
  }
}

/**
 * Conteudo de um item como `data:` URI, pronto para o `<img>` ou o `<audio>`.
 *
 * A CSP do renderer bloqueia `file://` mas libera `data:`, entao o binario chega
 * embutido em vez de por caminho — e assim nao ha caminho de disco exposto ao
 * renderer, que continua sem acesso ao sistema de arquivos.
 */
export function getMediaDataUrl(kind: MediaKind): string | null {
  const nome = getPersonalization()[kind]
  if (!nome) return null

  try {
    const caminho = join(pastaMedia(), nome)
    const mime = MIMES[extname(nome).toLowerCase()] ?? 'application/octet-stream'
    return `data:${mime};base64,${readFileSync(caminho).toString('base64')}`
  } catch {
    return null
  }
}

function apagarAnterior(nome: string | null): void {
  if (!nome) return
  try {
    rmSync(join(pastaMedia(), nome), { force: true })
  } catch {
    // Um arquivo antigo que nao sai nao impede o novo de entrar.
  }
}

/**
 * Abre o seletor do sistema e adota o arquivo escolhido.
 *
 * Retorna a configuracao resultante — igual a atual quando o usuario cancela,
 * para a interface nao precisar distinguir "cancelou" de "deu errado".
 */
export async function pickMedia(kind: MediaKind): Promise<Personalization> {
  const janela = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]

  const escolha = await dialog.showOpenDialog(janela, {
    title: TITULOS[kind],
    properties: ['openFile'],
    filters: FILTROS[kind]
  })
  if (escolha.canceled || escolha.filePaths.length === 0) return getPersonalization()

  const origem = escolha.filePaths[0]
  const extensao = extname(origem).toLowerCase()
  if (!MIMES[extensao]) throw new Error('Formato de arquivo não suportado.')
  if (statSync(origem).size > MAX_BYTES) {
    throw new Error('Arquivo muito grande. O limite é 8 MB.')
  }

  const destino = `${kind}-${randomUUID()}${extensao}`
  copyFileSync(origem, join(pastaMedia(), destino))

  const atual = ler()
  apagarAnterior(atual[kind])
  const novo = { ...atual, [kind]: destino }
  gravar(novo)
  return novo
}

/** Remove o item e volta ao padrao do app. */
export function clearMedia(kind: MediaKind): Personalization {
  const atual = ler()
  apagarAnterior(atual[kind])
  const novo = { ...atual, [kind]: null }
  gravar(novo)
  return novo
}
