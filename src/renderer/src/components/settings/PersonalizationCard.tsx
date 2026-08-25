import { Image as ImageIcon, Music, Trash2, Upload, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  useClearMedia,
  useMediaUrl,
  usePersonalization,
  usePickMedia
} from '@/hooks/use-personalization'
import { playAlarmSound } from '@/lib/alarm'
import type { MediaKind } from '@shared/types'

/**
 * Som e imagens proprios — tudo guardado **so nesta maquina**.
 *
 * O arquivo escolhido e copiado para a pasta de dados do app, e nao referenciado
 * pelo caminho original: um caminho aponta para algo que pode ser movido,
 * renomeado ou apagado depois, e o app ficaria com um som que nao toca mais sem
 * dizer por que.
 */

const ITENS: Array<{
  kind: MediaKind
  label: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  preview: 'audio' | 'avatar' | 'wide'
}> = [
  {
    kind: 'alarmSound',
    label: 'Som do alarme',
    hint: 'MP3, WAV, OGG ou M4A. Sem arquivo, o app usa dois bipes curtos.',
    icon: Music,
    preview: 'audio'
  },
  {
    kind: 'avatar',
    label: 'Foto de perfil',
    hint: 'Aparece no cartão do seu nome, no rodapé da barra lateral.',
    icon: UserRound,
    preview: 'avatar'
  },
  {
    kind: 'background',
    label: 'Imagem de fundo',
    hint: 'Entra atrás do conteúdo, esmaecida para o texto continuar legível.',
    icon: ImageIcon,
    preview: 'wide'
  }
]

function Item({
  kind,
  label,
  hint,
  icon: Icone,
  preview
}: (typeof ITENS)[number]): React.JSX.Element {
  const { data: config } = usePersonalization()
  const url = useMediaUrl(kind)
  const escolher = usePickMedia()
  const limpar = useClearMedia()

  const definido = Boolean(config?.[kind])
  const ocupado = escolher.isPending || limpar.isPending

  async function handlePick(): Promise<void> {
    try {
      await escolher.mutateAsync(kind)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível usar esse arquivo')
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {preview === 'avatar' && url ? (
          <img src={url} alt="" className="size-9 shrink-0 rounded-full object-cover" />
        ) : preview === 'wide' && url ? (
          <img src={url} alt="" className="h-9 w-16 shrink-0 rounded-md object-cover" />
        ) : (
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
            style={{ color: 'var(--faint)' }}
          >
            <Icone className="size-4" />
          </span>
        )}

        <div className="min-w-0 space-y-0.5">
          <Label>{label}</Label>
          <p className="text-muted-foreground text-xs">{definido ? 'Arquivo próprio em uso' : hint}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {kind === 'alarmSound' && (
          <Button variant="ghost" size="sm" onClick={() => playAlarmSound()}>
            Ouvir
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={ocupado}
          onClick={() => void handlePick()}
        >
          <Upload className="size-3.5" />
          {definido ? 'Trocar' : 'Escolher'}
        </Button>

        {definido && (
          <Button
            variant="ghost"
            size="icon"
            className="hover:text-destructive size-8"
            disabled={ocupado}
            onClick={() => limpar.mutate(kind)}
            aria-label={`Remover ${label}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function PersonalizationCard(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="size-4" />
          Personalização
        </CardTitle>
        <CardDescription>
          Som e imagens seus. Ficam apenas neste computador — não vão para o banco na nuvem
          nem aparecem em outra máquina.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ITENS.map((item, index) => (
          <div key={item.kind} className="space-y-4">
            {index > 0 && <Separator />}
            <Item {...item} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
