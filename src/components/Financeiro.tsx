import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { exportarFechamento } from '../lib/exportar'
import { Pedido, Servico } from '../types'
import {
  brl,
  hoje,
  inp,
  lbl,
  card,
  soma,
  norm,
  capitalizar,
  padronizarModelo,
  addDias,
  diffDias,
  ultimoDiaDoMes,
} from '../lib/utils'
import CumulativeChart, { PontoAcumulado } from './CumulativeChart'

const COR_PRINCIPAL = '#dc2626'
const COR_SECUNDARIA = '#475569'

const fmtMoeda = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(n)))
const fmtNum = (n: number) => String(n)

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

function Indicador({ titulo, valor, subtitulo, cor }: { titulo: string; valor: string; subtitulo?: string; cor?: string }) {
  return (
    <div className={card}>
      <p className="text-xs font-medium text-slate-500">{titulo}</p>
      <p className={`mt-1 text-xl font-bold ${cor || 'text-slate-900'}`}>{valor}</p>
      {subtitulo && <p className="mt-1 text-[11px] text-slate-400">{subtitulo}</p>}
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

const dataEfetivaPagamento = (s: Servico) => s.dataPagamento || s.dataEntrada

export default function Financeiro({ servicos, pedidos }: { servicos: Servico[]; pedidos: Pedido[] }) {
  const [modo, setModo] = useState<'mes' | 'periodo'>('mes')
  const [mes, setMes] = useState(hoje().slice(0, 7))
  const [pIni, setPIni] = useState(`${hoje().slice(0, 7)}-01`)
  const [pFim, setPFim] = useState(hoje())
  const [fMarca, setFMarca] = useState('')

  const mesOk = modo === 'mes' && mes.length === 7
  const ini = modo === 'mes' ? (mesOk ? `${mes}-01` : '') : pIni
  const fim = modo === 'mes' ? (mesOk ? `${mes}-${String(ultimoDiaDoMes(mes)).padStart(2, '0')}` : '') : pFim

  // Serviços que entraram no período (produção / entradas)
  const svEntradas = useMemo(
    () => servicos.filter((s) => (!ini || s.dataEntrada >= ini) && (!fim || s.dataEntrada <= fim)),
    [servicos, ini, fim]
  )

  // Serviços PAGOS cuja data de pagamento cai dentro do período selecionado (regime de caixa)
  const svPagosNoPeriodo = useMemo(
    () =>
      servicos.filter((s) => {
        if (s.statusFin !== 'Pago') return false
        const dp = dataEfetivaPagamento(s)
        return (!ini || dp >= ini) && (!fim || dp <= fim)
      }),
    [servicos, ini, fim]
  )

  const pd = useMemo(() => pedidos.filter((p) => (!ini || p.data >= ini) && (!fim || p.data <= fim)), [pedidos, ini, fim])

  const producaoPeriodo = soma(svEntradas.map((s) => s.valor))
  const recebidoNoPeriodo = soma(svPagosNoPeriodo.map((s) => s.valor))
  const aReceberGeral = soma(servicos.filter((s) => s.statusFin === 'Pendente').map((s) => s.valor))
  const insumos = soma(pd.map((p) => p.valor))
  const lucro = recebidoNoPeriodo - insumos

  const { rs, re, dias } = useMemo(() => {
    const datas = [
      ...svPagosNoPeriodo.map((s) => dataEfetivaPagamento(s)),
      ...svEntradas.map((s) => s.dataEntrada),
      ...pd.map((p) => p.data),
    ].sort()
    const a = ini || datas[0] || hoje()
    const b = fim || datas[datas.length - 1] || hoje()
    return { rs: a, re: b, dias: a <= b ? diffDias(a, b) + 1 : 0 }
  }, [svPagosNoPeriodo, svEntradas, pd, ini, fim])

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
    svPagosNoPeriodo.forEach((s) => {
      const b = buckets[idx(dataEfetivaPagamento(s))]
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
  }, [svPagosNoPeriodo, pd, rs, re, dias])
  const semanal = dias <= 62

  // Evolução diária ACUMULADA do faturamento recebido (regime de caixa pela data de pagamento)
  const diarioAcumulado = useMemo<PontoAcumulado[]>(() => {
    if (dias === 0 || dias > 366) return []
    const mapa = new Map<string, number>()
    svPagosNoPeriodo.forEach((s) => {
      const dp = dataEfetivaPagamento(s)
      mapa.set(dp, (mapa.get(dp) || 0) + s.valor)
    })
    let acumulado = 0
    return Array.from({ length: dias }, (_, i) => {
      const iso = addDias(rs, i)
      const valorDia = mapa.get(iso) || 0
      acumulado += valorDia
      return { iso, valorDia, acumulado }
    })
  }, [svPagosNoPeriodo, rs, dias])

  const porTipo = useMemo(
    () => agrupar(svEntradas, (s) => ({ key: norm(s.tipo) || 'sem tipo', nome: capitalizar(s.tipo) || 'Sem tipo' })),
    [svEntradas]
  )

  const porMarca = useMemo(
    () => agrupar(svEntradas, (s) => ({ key: norm(s.marca) || 'sem marca', nome: capitalizar(s.marca) || 'Sem marca' })),
    [svEntradas]
  )
  const marcasGrafico = useMemo(() => {
    const topo = porMarca.slice(0, 8)
    const resto = porMarca.slice(8)
    if (resto.length) topo.push({ nome: 'Outros', fat: soma(resto.map((g) => g.fat)), qtd: soma(resto.map((g) => g.qtd)) })
    return topo
  }, [porMarca])

  const modelos = useMemo(() => {
    const mapa = new Map<string, { marca: string; modelo: string; fat: number; qtd: number; marcaKey: string }>()
    svEntradas.forEach((s) => {
      const modelo = padronizarModelo(s.modelo)
      const marcaKey = norm(s.marca) || 'sem marca'
      const key = `${marcaKey}|${norm(modelo)}`
      const g = mapa.get(key) || { marca: capitalizar(s.marca) || 'Sem marca', modelo, fat: 0, qtd: 0, marcaKey }
      g.fat += s.valor
      g.qtd += 1
      mapa.set(key, g)
    })
    return [...mapa.values()].sort((a, b) => b.fat - a.fat || b.qtd - a.qtd)
  }, [svEntradas])
  const modelosFiltrados = modelos.filter((m) => !fMarca || m.marcaKey === fMarca)
  const opcoesMarca = useMemo(
    () => [...new Map(modelos.map((m) => [m.marcaKey, m.marca])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')),
    [modelos]
  )

  const podeExportar = !(ini && fim && ini > fim) && (modo === 'periodo' || mesOk)
  const baixarExcel = () =>
    exportarFechamento({
      slug: modo === 'mes' ? mes : `${ini}_a_${fim}`,
      rotulo: modo === 'mes' ? `Mês ${mes.slice(5)}/${mes.slice(0, 4)}` : `${ini.split('-').reverse().join('/')} a ${fim.split('-').reverse().join('/')}`,
      ini,
      fim,
      todos: servicos,
      entradas: svEntradas,
      pagos: svPagosNoPeriodo,
      pedidos: pd,
      ind: { recebido: recebidoNoPeriodo, producao: producaoPeriodo, aReceber: aReceberGeral, insumos, lucro },
    })

  const botaoModo = (ativo: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${ativo ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={botaoModo(modo === 'mes')} onClick={() => setModo('mes')}>
              Mês de fechamento
            </button>
            <button type="button" className={botaoModo(modo === 'periodo')} onClick={() => setModo('periodo')}>
              Período personalizado
            </button>
          </div>
          {modo === 'mes' ? (
            <div className="min-w-0 sm:w-48">
              <label className={lbl}>Mês</label>
              <input type="month" className={inp} value={mes} onChange={(e) => setMes(e.target.value)} />
            </div>
          ) : (
            <>
              <div className="min-w-0 sm:w-44">
                <label className={lbl}>Data inicial</label>
                <input type="date" className={inp} value={pIni} onChange={(e) => setPIni(e.target.value)} />
              </div>
              <div className="min-w-0 sm:w-44">
                <label className={lbl}>Data final</label>
                <input type="date" className={inp} value={pFim} onChange={(e) => setPFim(e.target.value)} />
              </div>
            </>
          )}
          <button
            type="button"
            disabled={!podeExportar}
            onClick={baixarExcel}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 sm:ml-auto"
          >
            <Download size={16} /> Exportar Excel
          </button>
        </div>
        {ini && fim && ini > fim && <p className="mt-2 text-sm text-red-600">A data inicial é maior que a data final.</p>}
        <p className="mt-2 text-[11px] text-slate-500">
          * Os valores recebidos e o lucro líquido contabilizam os serviços pela <b>data do pagamento</b> (regime de caixa).
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador
          titulo="Faturamento recebido (caixa)"
          valor={brl(recebidoNoPeriodo)}
          subtitulo={`${svPagosNoPeriodo.length} pagamento(s) no período`}
          cor="text-emerald-600"
        />
        <Indicador
          titulo="Produção / entradas no período"
          valor={brl(producaoPeriodo)}
          subtitulo={`${svEntradas.length} aparelho(s) entraram`}
        />
        <Indicador
          titulo="A receber (total pendente)"
          valor={brl(aReceberGeral)}
          subtitulo={`${servicos.filter((s) => s.statusFin === 'Pendente').length} aparelho(s) em aberto`}
          cor="text-amber-600"
        />
        <Indicador titulo="Pedidos / insumos" valor={brl(insumos)} subtitulo={`${pd.length} lançamento(s)`} cor="text-slate-700" />
        <Indicador
          titulo="Lucro líquido real"
          valor={brl(lucro)}
          subtitulo="Recebido no período − insumos"
          cor={lucro < 0 ? 'text-red-600' : 'text-emerald-700'}
        />
      </div>

      <section className={card}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900">Evolução diária acumulada dos recebimentos (R$)</h3>
          <span className="text-xs font-semibold text-red-600">Total recebido no período: {brl(recebidoNoPeriodo)}</span>
        </div>
        {dias > 366 ? (
          <p className="py-6 text-center text-sm text-slate-500">Período muito longo para a visão diária. Selecione até 1 ano.</p>
        ) : (
          <CumulativeChart pontos={diarioAcumulado} />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h3 className="mb-2 font-bold text-slate-900">Recebido × Custos por {semanal ? 'semana' : 'mês'} (R$)</h3>
          <BarChart
            data={periodos.map((s) => ({ label: s.label, values: [s.fat, s.custo] }))}
            series={[
              { name: 'Recebido (Caixa)', color: COR_PRINCIPAL },
              { name: 'Custos', color: COR_SECUNDARIA },
            ]}
            fmt={fmtMoeda}
          />
        </section>
        <section className={card}>
          <h3 className="mb-2 font-bold text-slate-900">Serviços pagos por {semanal ? 'semana' : 'mês'}</h3>
          <BarChart
            data={periodos.map((s) => ({ label: s.label, values: [s.vol] }))}
            series={[{ name: 'Pagamentos', color: COR_SECUNDARIA }]}
            fmt={fmtNum}
          />
        </section>
        <section className={card}>
          <h3 className="mb-2 font-bold text-slate-900">Produção por tipo de aparelho (R$)</h3>
          <BarChart
            data={porTipo.map((s) => ({ label: s.nome, values: [s.fat] }))}
            series={[{ name: 'Produção', color: COR_PRINCIPAL }]}
            fmt={fmtMoeda}
          />
        </section>
        <section className={card}>
          <h3 className="mb-2 font-bold text-slate-900">Volume por tipo de aparelho</h3>
          <BarChart
            data={porTipo.map((s) => ({ label: s.nome, values: [s.qtd] }))}
            series={[{ name: 'Aparelhos', color: COR_SECUNDARIA }]}
            fmt={fmtNum}
          />
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Desempenho por Marca e Modelo (Entradas no Período)</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={card}>
            <h3 className="mb-2 font-bold text-slate-900">Produção por marca (R$)</h3>
            <BarChart
              data={marcasGrafico.map((g) => ({ label: g.nome, values: [g.fat] }))}
              series={[{ name: 'Produção', color: COR_PRINCIPAL }]}
              fmt={fmtMoeda}
            />
          </div>
          <div className={card}>
            <h3 className="mb-2 font-bold text-slate-900">Quantidade de aparelhos por marca</h3>
            <BarChart
              data={marcasGrafico.map((g) => ({ label: g.nome, values: [g.qtd] }))}
              series={[{ name: 'Aparelhos', color: COR_SECUNDARIA }]}
              fmt={fmtNum}
            />
          </div>
        </div>

        <div className={card}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-bold text-slate-900">Modelos atendidos no período</h3>
            <div className="w-full min-w-0 sm:w-56">
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
                    <th className="px-3 py-2 text-right">Produção</th>
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
