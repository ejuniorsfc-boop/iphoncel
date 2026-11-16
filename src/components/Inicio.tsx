import { useMemo } from 'react'
import { ArrowRight, BarChart3, CheckCircle2, Clock, PackageCheck, Plus, Wallet, Wrench } from 'lucide-react'
import { MasterConfig, Pedido, Servico, StatusBancada } from '../types'
import { addDias, brl, norm, fmtData, hoje, nomeAparelho, nomeMesAtual, soma, ultimoDiaDoMes } from '../lib/utils'
import CumulativeChart, { PontoAcumulado } from './CumulativeChart'

interface Props {
  servicos: Servico[]
  pedidos: Pedido[]
  config: MasterConfig
  onNovoServico: () => void
  onIrParaServicos: (statusFiltro?: StatusBancada) => void
  onIrParaFinanceiro: () => void
  onIrParaPendencias: () => void
}

const dataEfetivaPagamento = (s: Servico) => s.dataPagamento || s.dataEntrada

export default function Inicio({
  servicos,
  pedidos,
  config,
  onNovoServico,
  onIrParaServicos,
  onIrParaFinanceiro,
  onIrParaPendencias,
}: Props) {
  const mesAtual = hoje().slice(0, 7)

  const svEntradasMes = useMemo(
    () => servicos.filter((s) => s.dataEntrada.startsWith(mesAtual)),
    [servicos, mesAtual]
  )
  const svPagosMes = useMemo(
    () => servicos.filter((s) => s.statusFin === 'Pago' && dataEfetivaPagamento(s).startsWith(mesAtual)),
    [servicos, mesAtual]
  )
  const pdMes = useMemo(() => pedidos.filter((p) => p.data.startsWith(mesAtual)), [pedidos, mesAtual])

  const faturamento = soma(svEntradasMes.map((s) => s.valor))
  const recebido = soma(svPagosMes.map((s) => s.valor))
  const aReceber = soma(svEntradasMes.filter((s) => s.statusFin === 'Pendente').map((s) => s.valor))
  const insumos = soma(pdMes.map((p) => p.valor))
  const saldoLiquido = recebido - insumos

  const emAndamento = svEntradasMes.filter((s) => s.statusBancada === 'Em andamento').length
  const prontos = svEntradasMes.filter((s) => s.statusBancada === 'Pronto').length
  const entregues = svEntradasMes.filter((s) => s.statusBancada === 'Entregue').length

  const evolucaoAcumulada = useMemo<PontoAcumulado[]>(() => {
    const totalDias = ultimoDiaDoMes(mesAtual)
    const iniMes = `${mesAtual}-01`
    const porDia = new Map<string, number>()
    svPagosMes.forEach((s) => {
      const d = dataEfetivaPagamento(s)
      porDia.set(d, (porDia.get(d) || 0) + s.valor)
    })

    let acumulado = 0
    return Array.from({ length: totalDias }, (_, i) => {
      const iso = addDias(iniMes, i)
      const valorDia = porDia.get(iso) || 0
      acumulado += valorDia
      return { iso, valorDia, acumulado }
    })
  }, [svPagosMes, mesAtual])

  // Quem está devendo (todas as datas), maiores dívidas primeiro
  const devedores = useMemo(() => {
    const mapa = new Map<string, { nome: string; qtd: number; total: number }>()
    servicos
      .filter((s) => s.statusFin === 'Pendente')
      .forEach((s) => {
        const k = norm(s.lojista)
        const g = mapa.get(k) || { nome: s.lojista, qtd: 0, total: 0 }
        g.qtd += 1
        g.total += s.valor
        mapa.set(k, g)
      })
    return [...mapa.values()].sort((a, b) => b.total - a.total)
  }, [servicos])

  const recentes = useMemo(
    () => [...svEntradasMes].sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada)).slice(0, 5),
    [svEntradasMes]
  )

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-100">Resumo do Mês Atual</p>
            <h2 className="mt-0.5 text-2xl font-extrabold">{nomeMesAtual()}</h2>
            <p className="mt-1 text-sm text-red-100">
              {svEntradasMes.length} aparelho(s) entraram neste mês no laboratório {config.nomeLoja}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onNovoServico}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm hover:bg-red-50"
            >
              <Plus size={18} /> Novo Serviço
            </button>
            <button
              onClick={onIrParaFinanceiro}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-800/60 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-red-800"
            >
              <BarChart3 size={16} /> Ver Financeiro
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Produção / entradas do mês</p>
          <p className="mt-1 text-xl font-extrabold text-slate-900">{brl(faturamento)}</p>
          <p className="mt-1 text-[11px] text-slate-400">{svEntradasMes.length} aparelho(s)</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Recebido no mês (caixa)</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-600">{brl(recebido)}</p>
          <p className="mt-1 text-[11px] text-slate-400">{svPagosMes.length} pagamento(s) no mês</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">A receber (entradas do mês)</p>
          <p className="mt-1 text-xl font-extrabold text-amber-600">{brl(aReceber)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {svEntradasMes.filter((s) => s.statusFin === 'Pendente').length} pendente(s)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Saldo líquido atual</p>
          <p className={`mt-1 text-xl font-extrabold ${saldoLiquido < 0 ? 'text-rose-600' : 'text-red-600'}`}>
            {brl(saldoLiquido)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Insumos: {brl(insumos)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{config.labelStatus} dos Serviços no Mês</h3>
          <button
            onClick={() => onIrParaServicos()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
          >
            Abrir {config.abaServicos} <ArrowRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            onClick={() => onIrParaServicos('Em andamento')}
            className="flex flex-col items-start rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-left transition hover:bg-amber-100/70"
          >
            <div className="flex items-center gap-1.5 text-amber-800">
              <Clock size={16} />
              <span className="text-xs font-semibold">Em andamento</span>
            </div>
            <span className="mt-1 text-2xl font-extrabold text-amber-900">{emAndamento}</span>
          </button>

          <button
            onClick={() => onIrParaServicos('Pronto')}
            className="flex flex-col items-start rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-left transition hover:bg-sky-100/70"
          >
            <div className="flex items-center gap-1.5 text-sky-800">
              <CheckCircle2 size={16} />
              <span className="text-xs font-semibold">Pronto</span>
            </div>
            <span className="mt-1 text-2xl font-extrabold text-sky-900">{prontos}</span>
          </button>

          <button
            onClick={() => onIrParaServicos('Entregue')}
            className="flex flex-col items-start rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-left transition hover:bg-emerald-100/70"
          >
            <div className="flex items-center gap-1.5 text-emerald-800">
              <PackageCheck size={16} />
              <span className="text-xs font-semibold">Entregue</span>
            </div>
            <span className="mt-1 text-2xl font-extrabold text-emerald-900">{entregues}</span>
          </button>
        </div>
      </section>

      {devedores.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Wallet size={18} className="text-red-600" /> Quem está devendo
            </h3>
            <button
              onClick={onIrParaPendencias}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
            >
              Cobrar / quitar <ArrowRight size={14} />
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {devedores.slice(0, 5).map((d) => (
              <li key={d.nome} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{d.nome}</p>
                  <p className="text-xs text-slate-500">{d.qtd} aparelho(s) em aberto</p>
                </div>
                <p className="shrink-0 font-bold text-rose-600">{brl(d.total)}</p>
              </li>
            ))}
          </ul>
          {devedores.length > 5 && <p className="mt-2 text-xs text-slate-500">+ {devedores.length - 5} cliente(s)</p>}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Recebimentos acumulados no mês (R$)</h3>
          <span className="text-xs font-semibold text-red-600">Total recebido: {brl(recebido)}</span>
        </div>
        <CumulativeChart pontos={evolucaoAcumulada} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Últimos lançamentos do mês</h3>
          <button
            onClick={() => onIrParaServicos()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
          >
            Ver todos <ArrowRight size={14} />
          </button>
        </div>

        {recentes.length === 0 ? (
          <div className="py-6 text-center">
            <Wrench size={24} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">Nenhum serviço lançado neste mês ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentes.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{nomeAparelho(s)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {fmtData(s.dataEntrada)} · {s.lojista} · {s.servico}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-slate-900">{brl(s.valor)}</p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      s.statusFin === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {s.statusFin}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
