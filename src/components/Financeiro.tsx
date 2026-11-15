import { useMemo, useState } from 'react'
import { Pedido, Servico } from '../types'
import {
  brl, hoje, inp, lbl, card, soma, norm, capitalizar, padronizarModelo, addDias, diffDias, ultimoDiaDoMes, fmtData,
} from '../lib/utils'

const COR_PRINCIPAL = '#dc2626'
const COR_SECUNDARIA = '#475569'

const fmtMoeda = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(n)))
const fmtNum = (n: number) => String(n)
const fmtInteiro = (n: number) => Math.round(n).toLocaleString('pt-BR')

// ---------------------------------------------------------------------------
// Gráfico de barras (HTML/CSS)
// ---------------------------------------------------------------------------
function BarChart({
  data,
  series,
  fmt,
}: {
  data: { label: string; values: number[] }[]
  series: { name: string; color: string }[]
  fmt: (n: number) => string
}) {
  const max = Math.max(1, ...data.flatMap((d) => d.values))
  if (data.length === 0) return <p className="py-6 text-center text-sm text-slate-500">Sem dados no período.</p>
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="flex items-end justify-around gap-2 pt-5">
        {data.map((d) => (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center gap-1">
              {d.values.map((v, i) => {
                const pct = (v / max) * 100
                return (
                  <div key={i} className="relative h-40 w-full max-w-[34px]">
                    <div
                      className="absolute bottom-0 w-full rounded-t"
                      style={{ height: `${pct}%`, minHeight: v > 0 ? 2 : 0, background: series[i].color }}
                    />
                    <span
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-slate-600"
                      style={{ bottom: `calc(${pct}% + 2px)` }}
                    >
                      {fmt(v)}
                    </span>
                  </div>
                )
              })}
            </div>
            <span className="w-full truncate text-center text-xs text-slate-500" title={d.label}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gráfico de linhas (SVG responsivo) — evolução diária
// ---------------------------------------------------------------------------
function LineChart({ pontos }: { pontos: { iso: string; valor: number }[] }) {
  const W = 700
  const H = 260
  const pl = 52
  const pr = 16
  const pt = 26
  const pb = 30
  const n = pontos.length
  if (n === 0) return <p className="py-6 text-center text-sm text-slate-500">Sem dados no período.</p>

  const max = Math.max(1, ...pontos.map((p) => p.valor))
  const maxY = max * 1.15
  const x = (i: number) => (n === 1 ? (pl + W - pr) / 2 : pl + (i * (W - pl - pr)) / (n - 1))
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / maxY)
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const area = `${linha} L${x(n - 1).toFixed(1)},${H - pb} L${x(0).toFixed(1)},${H - pb} Z`
  const grade = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: maxY * f, y: y(maxY * f) }))
  const mostrarValores = n <= 31
  const passo = Math.ceil(n / 10)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Evolução diária do faturamento">
      {grade.map((g, i) => (
        <g key={i}>
          <line x1={pl} x2={W - pr} y1={g.y} y2={g.y} stroke="#e2e8f0" strokeWidth={1} />
          <text x={pl - 6} y={g.y + 3} textAnchor="end" fontSize={10} fill="#64748b">
            {fmtMoeda(g.v)}
          </text>
        </g>
      ))}
      <path d={area} fill="#fee2e2" opacity={0.6} />
      <path d={linha} fill="none" stroke={COR_PRINCIPAL} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((p, i) => (
        <g key={p.iso}>
          <circle cx={x(i)} cy={y(p.valor)} r={n > 62 ? 2 : 3.5} fill="#fff" stroke={COR_PRINCIPAL} strokeWidth={2}>
            <title>{`${fmtData(p.iso)}: ${brl(p.valor)}`}</title>
          </circle>
          {mostrarValores && p.valor > 0 && (
            <text x={x(i)} y={y(p.valor) - 8} textAnchor="middle" fontSize={n > 16 ? 9 : 10} fontWeight={600} fill="#334155">
              {fmtInteiro(p.valor)}
            </text>
          )}
          {i % passo === 0 && (
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={10} fill="#64748b">
              {n <= 31 ? p.iso.slice(8, 10) : `${p.iso.slice(8, 10)}/${p.iso.slice(5, 7)}`}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function Indicador({ titulo, valor, cor }: { titulo: string; valor: string; cor?: string }) {
  return (
    <div className={card}>
      <p className="text-xs font-medium text-slate-500">{titulo}</p>
      <p className={`mt-1 text-xl font-bold ${cor || 'text-slate-900'}`}>{valor}</p>
    </div>
  )
}

type Grupo = { nome: string; fat: number; qtd: number }

function agrupar(itens: Servico[], chaveNome: (s: Servico) => { key: string; nome: string }): Grupo[] {
  const mapa = new Map<string, Grupo>()
  itens.forEach((s) => {
    const { key, nome } = chaveNome(s)
    const g = mapa.get(key) || { nome, fat: 0, qtd: 0 }
    g.fat += s.valor
    g.qtd += 1
    mapa.set(key, g)
  })
  return [...mapa.values()].sort((a, b) => b.fat - a.fat)
}

// ---------------------------------------------------------------------------
export default function Financeiro({ servicos, pedidos }: { servicos: Servico[]; pedidos: Pedido[] }) {
  const [modo, setModo] = useState<'mes' | 'periodo'>('mes')
  const [mes, setMes] = useState(hoje().slice(0, 7))
  const [pIni, setPIni] = useState(`${hoje().slice(0, 7)}-01`)
  const [pFim, setPFim] = useState(hoje())
  const [fMarca, setFMarca] = useState('')

  const mesOk = modo === 'mes' && mes.length === 7
  const ini = modo === 'mes' ? (mesOk ? `${mes}-01` : '') : pIni
  const fim = modo === 'mes' ? (mesOk ? `${mes}-${String(ultimoDiaDoMes(mes)).padStart(2, '0')}` : '') : pFim

  const sv = useMemo(
    () => servicos.filter((s) => (!ini || s.dataEntrada >= ini) && (!fim || s.dataEntrada <= fim)),
    [servicos, ini, fim]
  )
  const pd = useMemo(() => pedidos.filter((p) => (!ini || p.data >= ini) && (!fim || p.data <= fim)), [pedidos, ini, fim])

  const faturamento = soma(sv.map((s) => s.valor))
  const recebido = soma(sv.filter((s) => s.statusFin === 'Pago').map((s) => s.valor))
  const aReceber = soma(sv.filter((s) => s.statusFin === 'Pendente').map((s) => s.valor))
  const insumos = soma(pd.map((p) => p.valor))
  const lucro = recebido - insumos

  // intervalo usado nos gráficos temporais
  const { rs, re, dias } = useMemo(() => {
    const datas = [...sv.map((s) => s.dataEntrada), ...pd.map((p) => p.data)].sort()
    const a = ini || datas[0] || hoje()
    const b = fim || datas[datas.length - 1] || hoje()
    return { rs: a, re: b, dias: a <= b ? diffDias(a, b) + 1 : 0 }
  }, [sv, pd, ini, fim])

  // faturamento x custos x volume (semanas se o período for curto, senão meses)
  const periodos = useMemo(() => {
    if (dias === 0) return [] as { label: string; fat: number; custo: number; vol: number }[]
    let buckets: { label: string; fat: number; custo: number; vol: number }[]
    let idx: (d: string) => number
    if (dias <= 62) {
      const n = Math.ceil(dias / 7)
      buckets = Array.from({ length: n }, (_, i) => ({ label: `Sem ${i + 1}`, fat: 0, custo: 0, vol: 0 }))
      idx = (d) => Math.floor(diffDias(rs, d) / 7)
    } else {
      const meses: string[] = []
      let cur = rs.slice(0, 7)
      const ultimo = re.slice(0, 7)
      while (cur <= ultimo) {
        meses.push(cur)
        const [y, m] = cur.split('-').map(Number)
        cur = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
      }
      buckets = meses.map((m) => ({ label: `${m.slice(5)}/${m.slice(2, 4)}`, fat: 0, custo: 0, vol: 0 }))
      idx = (d) => meses.indexOf(d.slice(0, 7))
    }
    sv.forEach((s) => {
      const b = buckets[idx(s.dataEntrada)]
      if (b) {
        b.fat += s.valor
        b.vol += 1
      }
    })
    pd.forEach((p) => {
      const b = buckets[idx(p.data)]
      if (b) b.custo += p.valor
    })
    return buckets
  }, [sv, pd, rs, re, dias])
  const semanal = dias <= 62

  // evolução diária
  const diario = useMemo(() => {
    if (dias === 0 || dias > 366) return []
    const mapa = new Map<string, number>()
    sv.forEach((s) => mapa.set(s.dataEntrada, (mapa.get(s.dataEntrada) || 0) + s.valor))
    return Array.from({ length: dias }, (_, i) => {
      const iso = addDias(rs, i)
      return { iso, valor: mapa.get(iso) || 0 }
    })
  }, [sv, rs, dias])

  // por tipo de aparelho
  const porTipo = useMemo(
    () => agrupar(sv, (s) => ({ key: norm(s.tipo) || 'sem tipo', nome: capitalizar(s.tipo) || 'Sem tipo' })),
    [sv]
  )

  // por marca
  const porMarca = useMemo(
    () => agrupar(sv, (s) => ({ key: norm(s.marca) || 'sem marca', nome: capitalizar(s.marca) || 'Sem marca' })),
    [sv]
  )
  const marcasGrafico = useMemo(() => {
    const topo = porMarca.slice(0, 8)
    const resto = porMarca.slice(8)
    if (resto.length) topo.push({ nome: 'Outras', fat: soma(resto.map((g) => g.fat)), qtd: soma(resto.map((g) => g.qtd)) })
    return topo
  }, [porMarca])

  // ranking de modelos
  const modelos = useMemo(() => {
    const mapa = new Map<string, { marca: string; modelo: string; fat: number; qtd: number; marcaKey: string }>()
    sv.forEach((s) => {
      const modelo = padronizarModelo(s.modelo)
      const marcaKey = norm(s.marca) || 'sem marca'
      const key = `${marcaKey}|${norm(modelo)}`
      const g = mapa.get(key) || { marca: capitalizar(s.marca) || 'Sem marca', modelo, fat: 0, qtd: 0, marcaKey }
      g.fat += s.valor
      g.qtd += 1
      mapa.set(key, g)
    })
    return [...mapa.values()].sort((a, b) => b.fat - a.fat || b.qtd - a.qtd)
  }, [sv])
  const modelosFiltrados = modelos.filter((m) => !fMarca || m.marcaKey === fMarca)
  const opcoesMarca = useMemo(
    () => [...new Map(modelos.map((m) => [m.marcaKey, m.marca])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')),
    [modelos]
  )

  const botaoModo = (ativo: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${ativo ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            <button className={botaoModo(modo === 'mes')} onClick={() => setModo('mes')}>
              Mês de fechamento
            </button>
            <button className={botaoModo(modo === 'periodo')} onClick={() => setModo('periodo')}>
              Período personalizado
            </button>
          </div>
          {modo === 'mes' ? (
            <div>
              <label className={lbl}>Mês</label>
              <input type="month" className={inp} value={mes} onChange={(e) => setMes(e.target.value)} />
            </div>
          ) : (
            <>
              <div>
                <label className={lbl}>Data inicial</label>
                <input type="date" className={inp} value={pIni} onChange={(e) => setPIni(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Data final</label>
                <input type="date" className={inp} value={pFim} onChange={(e) => setPFim(e.target.value)} />
              </div>
            </>
          )}
        </div>
        {ini && fim && ini > fim && <p className="mt-2 text-sm text-red-600">A data inicial é maior que a data final.</p>}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador titulo="Faturamento lançado" valor={brl(faturamento)} />
        <Indicador titulo="Já recebido" valor={brl(recebido)} cor="text-emerald-600" />
        <Indicador titulo="A receber" valor={brl(aReceber)} cor="text-amber-600" />
        <Indicador titulo="Pedidos / insumos" valor={brl(insumos)} cor="text-slate-700" />
        <Indicador titulo="Lucro líquido real" valor={brl(lucro)} cor={lucro < 0 ? 'text-red-600' : 'text-emerald-700'} />
      </div>

      <section className={card}>
        <h3 className="mb-2 font-bold text-slate-900">Evolução diária do faturamento (R$)</h3>
        {dias > 366 ? (
          <p className="py-6 text-center text-sm text-slate-500">Período muito longo para a visão diária. Selecione até 1 ano.</p>
        ) : (
          <LineChart pontos={diario} />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h3 className="mb-2 font-bold text-slate-900">Faturamento × Custos por {semanal ? 'semana' : 'mês'} (R$)</h3>
          <BarChart
            data={periodos.map((s) => ({ label: s.label, values: [s.fat, s.custo] }))}
            series={[
              { name: 'Faturamento', color: COR_PRINCIPAL },
              { name: 'Custos', color: COR_SECUNDARIA },
            ]}
            fmt={fmtMoeda}
          />
        </section>
        <section className={card}>
          <h3 className="mb-2 font-bold text-slate-900">Volume de serviços por {semanal ? 'semana' : 'mês'}</h3>
          <BarChart
            data={periodos.map((s) => ({ label: s.label, values: [s.vol] }))}
            series={[{ name: 'Serviços', color: COR_SECUNDARIA }]}
            fmt={fmtNum}
          />
        </section>
        <section className={card}>
          <h3 className="mb-2 font-bold text-slate-900">Faturamento por tipo de aparelho (R$)</h3>
          <BarChart
            data={porTipo.map((s) => ({ label: s.nome, values: [s.fat] }))}
            series={[{ name: 'Faturamento', color: COR_PRINCIPAL }]}
            fmt={fmtMoeda}
          />
        </section>
        <section className={card}>
          <h3 className="mb-2 font-bold text-slate-900">Volume por tipo de aparelho</h3>
          <BarChart
            data={porTipo.map((s) => ({ label: s.nome, values: [s.qtd] }))}
            series={[{ name: 'Serviços', color: COR_SECUNDARIA }]}
            fmt={fmtNum}
          />
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Desempenho por Marca e Modelo</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={card}>
            <h3 className="mb-2 font-bold text-slate-900">Faturamento por marca (R$)</h3>
            <BarChart
              data={marcasGrafico.map((g) => ({ label: g.nome, values: [g.fat] }))}
              series={[{ name: 'Faturamento', color: COR_PRINCIPAL }]}
              fmt={fmtMoeda}
            />
          </div>
          <div className={card}>
            <h3 className="mb-2 font-bold text-slate-900">Quantidade de serviços por marca</h3>
            <BarChart
              data={marcasGrafico.map((g) => ({ label: g.nome, values: [g.qtd] }))}
              series={[{ name: 'Serviços', color: COR_SECUNDARIA }]}
              fmt={fmtNum}
            />
          </div>
        </div>

        <div className={card}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-bold text-slate-900">Modelos atendidos no período</h3>
            <div className="w-full sm:w-56">
              <label className={lbl}>Filtrar por marca</label>
              <select className={inp} value={fMarca} onChange={(e) => setFMarca(e.target.value)}>
                <option value="">Todas as marcas</option>
                {opcoesMarca.map(([k, nome]) => (
                  <option key={k} value={k}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {modelosFiltrados.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nenhum modelo atendido neste filtro.</p>
          ) : (
            <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2">#</th>
                    <th className="px-3 py-2">Marca</th>
                    <th className="px-3 py-2">Modelo</th>
                    <th className="px-3 py-2 text-right">Qtd.</th>
                    <th className="px-3 py-2 text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modelosFiltrados.map((m, i) => (
                    <tr key={`${m.marcaKey}|${m.modelo}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2 text-slate-600">{m.marca}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{m.modelo}</td>
                      <td className="px-3 py-2 text-right">{m.qtd}</td>
                      <td className="px-3 py-2 text-right font-semibold">{brl(m.fat)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-slate-50 text-sm font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2">
                      Total ({modelosFiltrados.length} modelo(s))
                    </td>
                    <td className="px-3 py-2 text-right">{soma(modelosFiltrados.map((m) => m.qtd))}</td>
                    <td className="px-3 py-2 text-right">{brl(soma(modelosFiltrados.map((m) => m.fat)))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
