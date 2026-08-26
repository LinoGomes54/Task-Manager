import { useMemo } from 'react'
import { formatHm, formatDuration, type GapBlock, isCycleBreak } from '@shared/agenda'
import { cn } from '@/lib/utils'

/**
 * Tela da pausa, com o mascote.
 *
 * O desenho vem da animacao de referencia (`animation-example`), reconstruido em
 * CSS e SVG: o runtime de composicao original e um motor de video de 69 KB que
 * toca uma linha do tempo fixa — aqui o tempo que manda e o relogio da agenda, e
 * a cena precisa refletir os minutos reais que faltam.
 *
 * A pausa longa (15 min ou mais) troca o dia pela noite: mascote dormindo, ceu
 * escuro e estrelas. E o sinal de que essa pausa nao e para dar uma esticada na
 * cadeira — e para sair da mesa.
 */

const PAUSA_LONGA_MIN = 15

/** Sugestoes do que fazer, na ordem em que aparecem. */
const SUGESTOES_CURTA = [
  'Levante e alongue os ombros',
  'Beba um copo de água',
  'Olhe para longe por 20 segundos',
  'Respire fundo três vezes'
]

const SUGESTAO_LONGA = 'Saia da mesa. Estes minutos são seus.'

/** Estrelas com posicao estavel entre renders — sem isso o ceu tremeria a cada segundo. */
function useEstrelas(quantidade: number): Array<{ x: number; y: number; r: number; d: number }> {
  return useMemo(() => {
    const aleatorio = (n: number): number => {
      const s = Math.sin(n * 12.9898) * 43758.5453
      return s - Math.floor(s)
    }
    return Array.from({ length: quantidade }, (_, i) => ({
      x: aleatorio(i + 1) * 96 + 2,
      y: aleatorio(i + 7.3) * 58 + 3,
      r: 0.9 + aleatorio(i + 21.7) * 1.4,
      d: aleatorio(i + 3.1) * 2.4
    }))
  }, [quantidade])
}

/** O mascote: uma lua com crateras. Dormindo, os olhos viram tracinhos. */
function Mascote({
  dormindo,
  cor,
  tamanho = 108
}: {
  dormindo: boolean
  cor: string
  tamanho?: number
}): React.JSX.Element {
  return (
    <div
      className={cn('relative', dormindo ? 'mascote-respira' : 'mascote-flutua')}
      style={{ width: tamanho, height: tamanho }}
    >
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{
          inset: -tamanho * 0.34,
          background: `radial-gradient(circle, ${cor}44 0%, ${cor}00 68%)`
        }}
      />
      <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} className="relative block">
        <circle cx="50" cy="50" r="42" fill="#F6F2E7" />
        <circle cx="72" cy="34" r="7" fill="#E4DCC6" />
        <circle cx="30" cy="72" r="5" fill="#E4DCC6" />
        <circle cx="24" cy="40" r="3.4" fill="#E4DCC6" />

        {dormindo ? (
          <>
            <path
              d="M31 50 Q37 45.5 43 50"
              stroke="#1E2B22"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M57 50 Q63 45.5 69 50"
              stroke="#1E2B22"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <ellipse cx="37" cy="50" rx="3.4" ry="5.4" fill="#1E2B22" className="mascote-pisca" />
            <ellipse cx="63" cy="50" rx="3.4" ry="5.4" fill="#1E2B22" className="mascote-pisca" />
          </>
        )}

        <ellipse cx="27" cy="59" rx="5.5" ry="3.2" fill={cor} opacity="0.5" />
        <ellipse cx="73" cy="59" rx="5.5" ry="3.2" fill={cor} opacity="0.5" />
        <path
          d={dormindo ? 'M44 61 Q50 65 56 61' : 'M38.5 60.5 Q50 73.5 61.5 60.5'}
          stroke="#1E2B22"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {dormindo && (
        <div aria-hidden className="pointer-events-none absolute -top-1 -right-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="zzz absolute font-semibold"
              style={{
                left: i * 17,
                top: -i * 12,
                fontSize: 15 + i * 7,
                color: cor,
                animationDelay: `${i * 0.85}s`
              }}
            >
              z
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function BreakScene({
  gap,
  restanteTexto,
  agora
}: {
  gap: GapBlock
  /** Contagem regressiva formatada, vinda do relogio da pagina. */
  restanteTexto: string
  agora: Date
}): React.JSX.Element {
  const longa = gap.minutes >= PAUSA_LONGA_MIN
  const estrelas = useEstrelas(longa ? 26 : 0)
  const cor = '#7FD1C1'

  // A sugestao troca a cada minuto decorrido — deriva do relogio, entao nao
  // precisa de um temporizador proprio nem fica fora de sincronia com a pausa.
  const decorridos = Math.floor((agora.getTime() - gap.start.getTime()) / 60_000)
  const sugestao = longa
    ? SUGESTAO_LONGA
    : SUGESTOES_CURTA[Math.max(0, decorridos) % SUGESTOES_CURTA.length]

  return (
    <div
      className="relative overflow-hidden rounded-xl px-4 py-6"
      style={{
        background: longa
          ? 'linear-gradient(160deg, #1E2B22 0%, #0F1A20 100%)'
          : 'linear-gradient(160deg, #F6F2E7 0%, #EFE9DA 100%)',
        color: longa ? '#F6F2E7' : '#1E2B22'
      }}
    >
      {longa && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {estrelas.map((estrela, i) => (
            <span
              key={i}
              className="estrela absolute rounded-full bg-[#F6F2E7]"
              style={{
                left: `${estrela.x}%`,
                top: `${estrela.y}%`,
                width: estrela.r * 2,
                height: estrela.r * 2,
                animationDelay: `${estrela.d}s`
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex flex-col items-center text-center">
        <p
          className="section-label mb-3"
          style={{ color: longa ? 'rgba(246,242,231,0.6)' : 'rgba(30,43,34,0.55)' }}
        >
          {longa ? 'Pausa longa' : isCycleBreak(gap) ? 'Pausa do ciclo' : 'Pausa'} ·{' '}
          {formatDuration(gap.minutes)}
        </p>

        <Mascote dormindo={longa} cor={cor} />

        <p className="mt-4 text-[40px] leading-none font-semibold tabular-nums">
          {restanteTexto}
        </p>

        {/* A chave force o remonte do no a cada troca, e com ele a animacao de
            entrada — sem isso o texto novo apareceria seco no lugar do antigo. */}
        <p
          key={sugestao}
          className="sugestao mt-4 max-w-xs text-[13px]"
          style={{ color: longa ? 'rgba(246,242,231,0.75)' : 'rgba(30,43,34,0.65)' }}
        >
          {sugestao}
        </p>

        <p
          className="mt-5 text-[12px]"
          style={{ color: longa ? 'rgba(246,242,231,0.55)' : 'rgba(30,43,34,0.5)' }}
        >
          volta às <span className="font-mono">{formatHm(gap.end)}</span> ·{' '}
          {gap.after.task.title}
        </p>
      </div>
    </div>
  )
}
