import { useState } from 'react'
import { brl, fmtData } from '../lib/utils'

export interface PontoAcumulado {
  iso: string
  valorDia: number
  acumulado: number
}

const fmtMoeda = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(n)))

export default function CumulativeChart({ pontos }: { pontos: PontoAcumulado[] }) {
  const [ativoIdx, setAtivoIdx] = useState<number | null>(null)

  const W = 720
  const H = 250
  const pl = 52
  const pr = 16
  const pt = 22
  const pb = 30
  const n = pontos.length

  if (n === 0) return <p className="py-6 text-center text-sm text-slate-500">Sem dados no período.</p>

  const max = Math.max(1, ...pontos.map((p) => p.acumulado))
  const maxY = max * 1.12
  const x = (i: number) => (n === 1 ? (pl + W - pr) / 2 : pl + (i * (W - pl - pr)) / (n - 1))
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / maxY)
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.acumulado).toFixed(1)}`).join(' ')
  const area = `${linha} L${x(n - 1).toFixed(1)},${H - pb} L${x(0).toFixed(1)},${H - pb} Z`
  const grade = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: maxY * f, y: y(maxY * f) }))
  const passo = Math.ceil(n / 10)
  const colW = n > 1 ? (W - pl - pr) / (n - 1) : W - pl - pr

  const ativo = ativoIdx !== null ? pontos[ativoIdx] : null

  return (
    <div onMouseLeave={() => setAtivoIdx(null)}>
      {ativo ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
            <span className="font-bold text-slate-900">Dia {fmtData(ativo.iso)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-600">
              No dia: <b className="text-slate-900">{brl(ativo.valorDia)}</b>
            </span>
            <span className="text-red-700">
              Faturamento acumulado até o momento: <b className="text-base font-extrabold">{brl(ativo.acumulado)}</b>
            </span>
          </div>
        </div>
      ) : (
        <p className="mb-2 text-xs text-slate-400">
          Passe o mouse ou toque em qualquer dia do gráfico para ver o dia e o faturamento total acumulado até aquele momento.
        </p>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img" aria-label="Evolução diária acumulada do faturamento">
        {grade.map((g, i) => (
          <g key={i}>
            <line x1={pl} x2={W - pr} y1={g.y} y2={g.y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={pl - 6} y={g.y + 3} textAnchor="end" fontSize={10} fill="#64748b">
              {fmtMoeda(g.v)}
            </text>
          </g>
        ))}

        <path d={area} fill="#fee2e2" opacity={0.55} />
        <path d={linha} fill="none" stroke="#dc2626" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {ativoIdx !== null && (
          <line
            x1={x(ativoIdx)}
            x2={x(ativoIdx)}
            y1={pt}
            y2={H - pb}
            stroke="#dc2626"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        )}

        {pontos.map((p, i) => {
          const selecionado = ativoIdx === i
          return (
            <g key={p.iso}>
              <circle
                cx={x(i)}
                cy={y(p.acumulado)}
                r={selecionado ? 5.5 : p.valorDia > 0 ? 3.5 : n > 62 ? 1.5 : 2.5}
                fill={selecionado ? '#dc2626' : '#fff'}
                stroke="#dc2626"
                strokeWidth={2}
              />
              {i % passo === 0 && (
                <text
                  x={x(i)}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={selecionado ? 700 : 400}
                  fill={selecionado ? '#b91c1c' : '#64748b'}
                >
                  {n <= 31 ? p.iso.slice(8, 10) : `${p.iso.slice(8, 10)}/${p.iso.slice(5, 7)}`}
                </text>
              )}
              <rect
                x={x(i) - colW / 2}
                y={0}
                width={colW}
                height={H}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setAtivoIdx(i)}
                onClick={() => setAtivoIdx(i)}
                onTouchStart={() => setAtivoIdx(i)}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
