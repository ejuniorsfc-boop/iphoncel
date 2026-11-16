import { useState } from 'react'
import { Check, Download, Lock, RotateCcw, ShieldCheck } from 'lucide-react'
import { Lojista, MASTER_CONFIG_PADRAO, MasterConfig, Pedido, Preco, Servico } from '../types'
import { exportarBackup } from '../lib/exportar'
import { btnGhost, btnPrimary, card, formatarMensagemCobranca, formatarMensagemPronto, hoje, inp, lbl } from '../lib/utils'

interface Props {
  config: MasterConfig
  dadosBackup: { servicos: Servico[]; pedidos: Pedido[]; lojistas: Lojista[]; precos: Preco[] }
  onSaveConfig: (cfg: MasterConfig) => void
  onFecharMaster: () => void
}

const EXEMPLOS_SERVICO: Servico[] = [
  {
    id: 'ex-1',
    dataEntrada: hoje(),
    lojista: 'Loja Exemplo',
    telefone: '13999999999',
    tipo: 'Celular',
    marca: 'Apple',
    modelo: 'iPhone 15 Pro Max',
    servico: 'Troca de Vidro',
    valor: 380,
    obs: '',
    statusBancada: 'Pronto',
    statusFin: 'Pendente',
    dataPagamento: '',
  },
  {
    id: 'ex-2',
    dataEntrada: hoje(),
    lojista: 'Loja Exemplo',
    telefone: '13999999999',
    tipo: 'Celular',
    marca: 'Samsung',
    modelo: 'Galaxy S24 Ultra',
    servico: 'Troca de Vidro',
    valor: 420,
    obs: '',
    statusBancada: 'Entregue',
    statusFin: 'Pendente',
    dataPagamento: '',
  },
]

export default function MasterAdmin({ config, dadosBackup, onSaveConfig, onFecharMaster }: Props) {
  const [form, setForm] = useState<MasterConfig>(config)
  const [salvo, setSalvo] = useState(false)

  const set = (patch: Partial<MasterConfig>) => setForm((prev) => ({ ...prev, ...patch }))

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    onSaveConfig(form)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  function restaurar() {
    if (!confirm('Restaurar todos os títulos e o texto do WhatsApp para o padrão original?')) return
    setForm(MASTER_CONFIG_PADRAO)
    onSaveConfig(MASTER_CONFIG_PADRAO)
  }

  const previewWhats = formatarMensagemCobranca('Loja Exemplo', EXEMPLOS_SERVICO, form)
  const previewPronto = formatarMensagemPronto(EXEMPLOS_SERVICO[0], form)

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-red-600 p-2">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="font-bold">Admin Master · Configurações Avançadas</h2>
            <p className="text-xs text-slate-300">Edite títulos do sistema, rótulos e o modelo de cobrança WhatsApp</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onFecharMaster}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
        >
          <Lock size={14} /> Ocultar aba Master
        </button>
      </section>

      <form onSubmit={salvar} className="space-y-4">
        <section className={card}>
          <h3 className="mb-3 font-bold text-slate-900">Títulos da Loja e Nomes das Abas</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={lbl}>Nome do sistema / loja</label>
              <input className={inp} value={form.nomeLoja} onChange={(e) => set({ nomeLoja: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Subtítulo da tela de login</label>
              <input className={inp} value={form.subtituloLogin} onChange={(e) => set({ subtituloLogin: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Nome da Aba 1 (Página Inicial)</label>
              <input className={inp} value={form.abaInicio} onChange={(e) => set({ abaInicio: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Nome da Aba 2 (Serviços)</label>
              <input className={inp} value={form.abaServicos} onChange={(e) => set({ abaServicos: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Nome da Aba 3 (Pedidos)</label>
              <input className={inp} value={form.abaPedidos} onChange={(e) => set({ abaPedidos: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Nome da Aba 4 (Financeiro)</label>
              <input className={inp} value={form.abaFinanceiro} onChange={(e) => set({ abaFinanceiro: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Nome da Aba 5 (Tabela de Preços)</label>
              <input className={inp} value={form.abaPrecos} onChange={(e) => set({ abaPrecos: e.target.value })} />
            </div>
          </div>
        </section>

        <section className={card}>
          <h3 className="mb-3 font-bold text-slate-900">Rótulos dos Campos</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={lbl}>Campo de Cliente</label>
              <input className={inp} value={form.labelCliente} onChange={(e) => set({ labelCliente: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Campo de Status</label>
              <input className={inp} value={form.labelStatus} onChange={(e) => set({ labelStatus: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Campo de Observação</label>
              <input className={inp} value={form.labelObs} onChange={(e) => set({ labelObs: e.target.value })} />
            </div>
          </div>
        </section>

        <section className={card}>
          <h3 className="mb-1 font-bold text-slate-900">Texto do Botão “Copiar Cobrança WhatsApp”</h3>
          <p className="mb-3 text-xs text-slate-500">
            Variáveis disponíveis: <code>{'{cliente}'}</code>, <code>{'{loja}'}</code>, <code>{'{numero}'}</code>,{' '}
            <code>{'{data}'}</code>, <code>{'{aparelho}'}</code>, <code>{'{servico}'}</code>, <code>{'{valor}'}</code>,{' '}
            <code>{'{total}'}</code>
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className={lbl}>Cabeçalho da mensagem</label>
                <textarea
                  rows={2}
                  className={inp}
                  value={form.whatsCabecalho}
                  onChange={(e) => set({ whatsCabecalho: e.target.value })}
                />
              </div>
              <div>
                <label className={lbl}>Formato de cada linha de serviço</label>
                <input className={inp} value={form.whatsLinha} onChange={(e) => set({ whatsLinha: e.target.value })} />
              </div>
              <div>
                <label className={lbl}>Linha do valor total</label>
                <input className={inp} value={form.whatsTotal} onChange={(e) => set({ whatsTotal: e.target.value })} />
              </div>
              <div>
                <label className={lbl}>Rodapé da mensagem</label>
                <textarea
                  rows={2}
                  className={inp}
                  value={form.whatsRodape}
                  onChange={(e) => set({ whatsRodape: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={lbl}>Pré-visualização no WhatsApp</label>
              <pre className="whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 font-sans text-xs leading-relaxed text-slate-800">
                {previewWhats}
              </pre>
            </div>
          </div>
        </section>

        <section className={card}>
          <h3 className="mb-1 font-bold text-slate-900">Aviso “Aparelho Pronto” (WhatsApp)</h3>
          <p className="mb-3 text-xs text-slate-500">
            Usado no botão de WhatsApp do card e ao mudar o status para Pronto. Variáveis: <code>{'{cliente}'}</code>,{' '}
            <code>{'{loja}'}</code>, <code>{'{aparelho}'}</code>, <code>{'{servico}'}</code>, <code>{'{valor}'}</code>,{' '}
            <code>{'{data}'}</code>
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className={lbl}>Mensagem</label>
              <textarea
                rows={3}
                className={inp}
                value={form.whatsPronto}
                onChange={(e) => set({ whatsPronto: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Pré-visualização no WhatsApp</label>
              <pre className="whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 font-sans text-xs leading-relaxed text-slate-800">
                {previewPronto}
              </pre>
            </div>
          </div>
        </section>

        <section className={card}>
          <h3 className="mb-1 font-bold text-slate-900">Backup em Excel</h3>
          <p className="mb-3 text-xs text-slate-500">
            Baixa um arquivo .xlsx com todos os serviços, pedidos, clientes, pendências por cliente e a tabela de preços.
          </p>
          <button type="button" className={btnGhost} onClick={() => exportarBackup(dadosBackup)}>
            <Download size={16} /> Baixar backup completo (.xlsx)
          </button>
        </section>

        <section className={card}>
          <h3 className="mb-2 font-bold text-slate-900">PIN de Acesso ao Admin Master</h3>
          <div className="max-w-xs">
            <label className={lbl}>PIN numérico (4 a 8 dígitos)</label>
            <input
              className={inp}
              maxLength={8}
              value={form.pinMaster}
              onChange={(e) => set({ pinMaster: e.target.value.trim() })}
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={restaurar} className={btnGhost}>
            <RotateCcw size={16} /> Restaurar padrão
          </button>
          <button className={btnPrimary}>
            <Check size={16} /> {salvo ? 'Configurações salvas!' : 'Salvar configurações'}
          </button>
        </div>
      </form>
    </div>
  )
}
