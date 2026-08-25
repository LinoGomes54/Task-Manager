import { cn } from '@/lib/utils'

/**
 * Progresso em forma de relogio: um anel que fecha conforme o tempo passa.
 *
 * O arco comeca no topo e anda no sentido horario porque e assim que se le um
 * relogio — uma barra reta obrigava a traduzir "quanto falta" de comprimento
 * para tempo, e aqui a propria forma ja diz.
 *
 * O tamanho vem em pixels em vez de classe utilitaria porque o raio entra na
 * conta do `stroke-dasharray`: o SVG precisa do numero, nao do nome da classe.
 */
export function ProgressRing({
  progress,
  size = 176,
  thickness = 10,
  children,
  className
}: {
  /** Quanto ja passou, de 0 a 100. */
  progress: number
  size?: number
  thickness?: number
  children?: React.ReactNode
  className?: string
}): React.JSX.Element {
  const raio = (size - thickness) / 2
  const volta = 2 * Math.PI * raio
  const feito = Math.min(100, Math.max(0, progress))

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {/* `-rotate-90` leva o inicio do arco das 3h para as 12h. */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={raio}
          fill="none"
          stroke="var(--border)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={raio}
          fill="none"
          stroke="var(--accent-base)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - feito / 100)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {children}
      </div>
    </div>
  )
}
