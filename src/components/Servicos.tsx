import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ClipboardCopy,
  ExternalLink,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import {
  Servico,
  Lojista,
  Preco,
  Tipo,
  Marca,
  StatusBancada,
  StatusFin,
  MasterConfig,
  STATUS_BANCADA,
  TIPOS,
  MARCAS,
} from '../types'
import {
  uid,
  hoje,
  brl,
  fmtData,
  whatsLink,
  norm,
  inp,
  lbl,
  copiar,
  soma,
  formatarMensagemPronto,
  nomeAparelho,
  btnPrimary,
  btnGhost,
  card,
  ultimoDiaDoMes,
  intervaloSemanaAtual,
  padronizarModelo,
  buscarPreco,
  modeloCombina,
  valorAuto,
  servicosDoTipo,
  formatarMensagemCobranca,
} from '../lib/utils'

interface Props {
  servicos: Servico[]
  lojistas: Lojista[]
  precos: Preco[]
  config: MasterConfig
  abrirNovoDireto?: boolean
  statusInicialFiltro?: StatusBancada | ''
  onConsumiuAtalho?: () => void
  onSaveMany?: (itens: Servico[]) => void
  abrirPendenciasDireto?: boolean
  onSave: (s: Servico) => void
  onRemove: (id: string) => void
  onSaveLojista: (l: Lojista) => void
  onRemoveLojista: (id: string) => void
}

type Linha = { id: string; servico: string; valor: string; manual: boolean }
type Aparelho = {
  key: string
  tipo: Tipo
  marca: Marca
  modelo: string
  linhas: Linha[]
  obs: string
  statusBancada: StatusBancada
  statusFin: StatusFin
  dataPagamento: string
}

type ModoPeriodo = 'mes_atual' | 'semana_atual' | 'todo_periodo' | 'personalizado'

const linhaVazia = (servico = ''): Linha => ({ id: uid(), servico, valor: '', manual: false })
const aparelhoVazio = (): Aparelho => ({
  key: uid(),
  tipo: 'Celular',
  marca: 'Apple',
  modelo: '',
  linhas: [linhaVazia('')],
  obs: '',
  statusBancada: 'Em andamento',
  statusFin: 'Pendente',
  dataPagamento: '',
})

const num = (s: string) => Number(String(s).replace(',', '.')) || 0

const corBancada: Record<StatusBancada, string> = {
  'Em andamento': 'bg-amber-100 text-amber-800',
  Pronto: 'bg-sky-100 text-sky-800',
  Entregue: 'bg-emerald-100 text-emerald-800',
}

// ---------------------------------------------------------------------------
// Componente de Autocomplete Customizado (abre ao clicar ou digitar)
// ---------------------------------------------------------------------------
interface SugestaoItem {
  valor: string
  subtitulo?: string
}

function AutoCompleteInput({
  value,
  onChange,
  onSelect,
  sugestoes,
  placeholder,
  className = '',
  mostrarLimpar = false,
  filtrar = true,
  onBlurValor,
}: {
  value: string
  onChange: (val: string) => void
  onSelect?: (item: SugestaoItem) => void
  sugestoes: SugestaoItem[]
  placeholder?: string
  className?: string
  mostrarLimpar?: boolean
  filtrar?: boolean
  onBlurValor?: (val: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtradas = useMemo(() => {
    if (!filtrar) return sugestoes
    const q = norm(value)
    if (!q) return sugestoes
    return sugestoes.filter((s) => norm(s.valor).includes(q) || (s.subtitulo && norm(s.subtitulo).includes(q)))
  }, [sugestoes, value, filtrar])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          className={`${inp} ${mostrarLimpar && value ? 'pr-14' : 'pr-8'}`}
          placeholder={placeholder}
          value={value}
          onBlur={(e) => onBlurValor?.(e.target.value)}
          onFocus={() => setAberto(true)}
          onClick={() => setAberto(true)}
          onChange={(e) => {
            onChange(e.target.value)
            setAberto(true)
          }}
        />
        <div className="absolute right-2 top-2 flex items-center gap-0.5">
          {mostrarLimpar && value && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setAberto(true)
              }}
              className="rounded p-0.5 text-slate-400 hover:text-slate-700"
              title="Limpar"
            >
              <X size={15} />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setAberto((prev) => !prev)}
            className="rounded p-0.5 text-slate-400 hover:text-slate-700"
            aria-label="Mostrar opções"
          >
            <ChevronDown size={15} />
          </button>
        </div>
      </div>

      {aberto && filtradas.length > 0 && (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {filtradas.map((item, idx) => (
            <li key={`${item.valor}-${idx}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(item.valor)
                  onSelect?.(item)
                  setAberto(false)
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-red-50"
              >
                <span className="truncate font-medium text-slate-900">{item.valor}</span>
                {item.subtitulo && <span className="shrink-0 text-xs text-slate-400">{item.subtitulo}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal: Gerenciar Clientes
// ---------------------------------------------------------------------------
function ClientesModal({
  lojistas,
  servicos,
  labelCliente,
  onClose,
  onSaveLojista,
  onRemoveLojista,
  onSaveServico,
}: {
  lojistas: Lojista[]
  servicos: Servico[]
  labelCliente: string
  onClose: () => void
  onSaveLojista: (l: Lojista) => void
  onRemoveLojista: (id: string) => void
  onSaveServico: (s: Servico) => void
}) {
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [tel, setTel] = useState('')

  const lista = useMemo(
    () =>
      lojistas
        .filter((l) => !busca || norm(l.nome).includes(norm(busca)))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [lojistas, busca]
  )

  function iniciar(l: Lojista) {
    setEditando(l.id)
    setNome(l.nome)
    setTel(l.telefone)
  }

  function salvar(l: Lojista) {
    const n = nome.trim()
    if (!n) {
      alert(`O nome do ${labelCliente.toLowerCase()} não pode ficar vazio.`)
      return
    }
    const novo: Lojista = { id: norm(n), nome: n, telefone: tel.trim() }
    if (novo.id !== l.id) onRemoveLojista(l.id)
    onSaveLojista(novo)
    servicos
      .filter((s) => norm(s.lojista) === l.id)
      .forEach((s) => onSaveServico({ ...s, lojista: n, telefone: tel.trim() }))
    setEditando(null)
  }

  function excluir(l: Lojista) {
    if (confirm(`Excluir "${l.nome}" do cadastro de ${labelCliente.toLowerCase()}s?\nOs serviços já lançados continuam na lista.`))
      onRemoveLojista(l.id)
  }

  const qtd = (l: Lojista) => servicos.filter((s) => norm(s.lojista) === l.id).length

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-lg font-bold text-slate-900">Gerenciar {labelCliente}s</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="border-b border-slate-100 p-3">
          <input className={inp} placeholder={`Buscar ${labelCliente.toLowerCase()}…`} value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {lista.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">Nenhum {labelCliente.toLowerCase()} cadastrado ainda.</li>
          )}
          {lista.map((l) => (
            <li key={l.id} className="p-3">
              {editando === l.id ? (
                <div className="space-y-2">
                  <div>
                    <label className={lbl}>Nome</label>
                    <input className={inp} value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>WhatsApp / Telefone</label>
                    <input className={inp} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button className={btnPrimary} onClick={() => salvar(l)}>
                      <Check size={16} /> Salvar
                    </button>
                    <button className={btnGhost} onClick={() => setEditando(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{l.nome}</p>
                    <p className="text-xs text-slate-500">
                      {l.telefone || 'sem telefone'} · {qtd(l)} serviço(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {whatsLink(l.telefone) && (
                      <a href={whatsLink(l.telefone)} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                        <MessageCircle size={16} />
                      </a>
                    )}
                    <button onClick={() => iniciar(l)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => excluir(l)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tela principal
// ---------------------------------------------------------------------------
export default function Servicos({
  servicos,
  lojistas,
  precos,
  config,
  abrirNovoDireto,
  statusInicialFiltro,
  onConsumiuAtalho,
  onSaveMany,
  abrirPendenciasDireto,
  onSave,
  onRemove,
  onSaveLojista,
  onRemoveLojista,
}: Props) {
  const [view, setView] = useState<'lista' | 'form'>('lista')
  const [modalClientes, setModalClientes] = useState(false)

  // Pop-ups de confirmação (Status, Pagamento e Cobrança WhatsApp)
  const [modalStatusServico, setModalStatusServico] = useState<Servico | null>(null)
  const [statusSelecionado, setStatusSelecionado] = useState<StatusBancada>('Em andamento')

  const [modalPagoServico, setModalPagoServico] = useState<Servico | null>(null)
  const [dataPagoSelecionada, setDataPagoSelecionada] = useState<string>(hoje())

  const [modalCobrancaAberto, setModalCobrancaAberto] = useState(false)
  const [cobrancaGeral, setCobrancaGeral] = useState(false) // true = cobrança aberta pela visão de pendências (todas as datas)
  const [modalPendencias, setModalPendencias] = useState(false)
  const [baixaLote, setBaixaLote] = useState<{ cliente: string; itens: Servico[] } | null>(null)
  const [dataBaixaLote, setDataBaixaLote] = useState<string>(hoje())
  const [avisoPronto, setAvisoPronto] = useState<Servico | null>(null)
  const [clienteCobrancaSel, setClienteCobrancaSel] = useState<string>('')
  const [mensagemEditada, setMensagemEditada] = useState<string>('')
  const [copiadoModal, setCopiadoModal] = useState(false)

  // formulário
  const [editId, setEditId] = useState<string | null>(null)
  const [dataEntrada, setDataEntrada] = useState(hoje())
  const [cliente, setCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [aparelhos, setAparelhos] = useState<Aparelho[]>([aparelhoVazio()])

  // filtros
  const mesAtual = hoje().slice(0, 7)
  const [modoPeriodo, setModoPeriodo] = useState<ModoPeriodo>('mes_atual')
  const [iniCustom, setIniCustom] = useState(`${mesAtual}-01`)
  const [fimCustom, setFimCustom] = useState(`${mesAtual}-${String(ultimoDiaDoMes(mesAtual)).padStart(2, '0')}`)
  const [fCli, setFCli] = useState('')
  const [fBanc, setFBanc] = useState('')
  const [fFin, setFFin] = useState('')

  const { ini, fim } = useMemo(() => {
    if (modoPeriodo === 'mes_atual') {
      const m = hoje().slice(0, 7)
      return {
        ini: `${m}-01`,
        fim: `${m}-${String(ultimoDiaDoMes(m)).padStart(2, '0')}`,
      }
    }
    if (modoPeriodo === 'semana_atual') {
      return intervaloSemanaAtual()
    }
    if (modoPeriodo === 'todo_periodo') {
      return { ini: '', fim: '' }
    }
    return { ini: iniCustom, fim: fimCustom }
  }, [modoPeriodo, iniCustom, fimCustom])

  useEffect(() => {
    if (abrirNovoDireto) {
      abrirNovo()
      onConsumiuAtalho?.()
    } else if (statusInicialFiltro !== undefined) {
      setFBanc(statusInicialFiltro)
      onConsumiuAtalho?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirNovoDireto, statusInicialFiltro])

  useEffect(() => {
    if (abrirPendenciasDireto) {
      setModalPendencias(true)
      onConsumiuAtalho?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirPendenciasDireto])

  useEffect(() => {
    if (!avisoPronto) return
    const t = setTimeout(() => setAvisoPronto(null), 15000)
    return () => clearTimeout(t)
  }, [avisoPronto])

  // preenche valores automaticamente (linhas que o usuário não digitou manualmente)
  useEffect(() => {
    setAparelhos((prev) => {
      let mudou = false
      const novo = prev.map((a) => {
        const preco = buscarPreco(precos, a.tipo, a.marca, a.modelo)
        let alterou = false
        const linhas = a.linhas.map((l) => {
          if (l.manual) return l
          const v = valorAuto(preco, l.servico)
          const s = v != null ? String(v) : ''
          if (s === l.valor) return l
          alterou = true
          return { ...l, valor: s }
        })
        if (!alterou) return a
        mudou = true
        return { ...a, linhas }
      })
      return mudou ? novo : prev
    })
  }, [aparelhos, precos])

  const setAp = (key: string, patch: Partial<Aparelho>) =>
    setAparelhos((p) => p.map((a) => (a.key === key ? { ...a, ...patch } : a)))

  const setLinha = (key: string, id: string, patch: Partial<Linha>) =>
    setAparelhos((p) =>
      p.map((a) => (a.key === key ? { ...a, linhas: a.linhas.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : a))
    )

  function mudarTipo(a: Aparelho, tipo: Tipo) {
    setAp(a.key, { tipo })
  }

  function mudarCliente(nome: string) {
    setCliente(nome)
    const achado = lojistas.find((l) => norm(l.nome) === norm(nome))
    if (achado) setTelefone(achado.telefone)
  }

  // Sugestões de clientes cadastrados (combina cadastro de lojistas + nomes históricos dos serviços)
  const sugestoesClientesForm = useMemo<SugestaoItem[]>(() => {
    const mapa = new Map<string, SugestaoItem>()
    lojistas.forEach((l) => {
      if (l.nome.trim()) {
        mapa.set(norm(l.nome), { valor: l.nome, subtitulo: l.telefone || undefined })
      }
    })
    servicos.forEach((s) => {
      const k = norm(s.lojista)
      if (s.lojista.trim() && !mapa.has(k)) {
        mapa.set(k, { valor: s.lojista, subtitulo: s.telefone || undefined })
      }
    })
    return [...mapa.values()].sort((a, b) => a.valor.localeCompare(b.valor, 'pt-BR'))
  }, [lojistas, servicos])

  const sugestoesClientesFiltro = useMemo<SugestaoItem[]>(() => {
    const nomes = [...new Set([...lojistas.map((l) => l.nome), ...servicos.map((s) => s.lojista)].filter(Boolean))]
    return nomes.sort((a, b) => a.localeCompare(b, 'pt-BR')).map((n) => ({ valor: n }))
  }, [lojistas, servicos])

  function abrirNovo() {
    setEditId(null)
    setDataEntrada(hoje())
    setCliente('')
    setTelefone('')
    setAparelhos([aparelhoVazio()])
    setView('form')
    window.scrollTo({ top: 0 })
  }

  function editar(s: Servico) {
    setEditId(s.id)
    setDataEntrada(s.dataEntrada)
    setCliente(s.lojista)
    setTelefone(s.telefone)
    const itens = s.itens && s.itens.length ? s.itens : [{ servico: s.servico, valor: s.valor }]
    const tipoValido: Tipo = TIPOS.includes(s.tipo as Tipo) ? (s.tipo as Tipo) : 'Celular'
    const marcaValida: Marca = MARCAS.includes(s.marca as Marca) ? (s.marca as Marca) : 'Outros'
    setAparelhos([
      {
        key: uid(),
        tipo: tipoValido,
        marca: marcaValida,
        modelo: s.modelo,
        linhas: itens.map((i) => ({ id: uid(), servico: i.servico, valor: String(i.valor), manual: true })),
        obs: s.obs,
        statusBancada: s.statusBancada,
        statusFin: s.statusFin,
        dataPagamento: s.dataPagamento,
      },
    ])
    setView('form')
    window.scrollTo({ top: 0 })
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    const nomeCli = cliente.trim()
    if (!nomeCli) {
      alert(`Informe o ${config.labelCliente.toLowerCase()}.`)
      return
    }
    const registros: Servico[] = []
    for (let i = 0; i < aparelhos.length; i++) {
      const a = aparelhos[i]
      const modelo = padronizarModelo(a.modelo)
      const itens = a.linhas
        .map((l) => ({ servico: l.servico.trim(), valor: num(l.valor) }))
        .filter((l) => l.servico || l.valor)
      if (!modelo) {
        alert(`Aparelho ${i + 1}: informe o modelo.`)
        return
      }
      if (itens.length === 0 || itens.some((l) => !l.servico || l.valor <= 0)) {
        alert(`Aparelho ${i + 1}: preencha o serviço e o valor de cada linha.`)
        return
      }
      const pago = a.statusFin === 'Pago'
      registros.push({
        id: editId || uid(),
        dataEntrada,
        lojista: nomeCli,
        telefone: telefone.trim(),
        tipo: a.tipo,
        marca: a.marca,
        modelo,
        servico: itens.map((l) => l.servico).join(' + '),
        itens,
        valor: soma(itens.map((l) => l.valor)),
        obs: a.obs.trim(),
        statusBancada: a.statusBancada,
        statusFin: a.statusFin,
        dataPagamento: pago ? a.dataPagamento || hoje() : '',
      })
    }
    registros.forEach((r) => onSave(r))
    onSaveLojista({ id: norm(nomeCli), nome: nomeCli, telefone: telefone.trim() })
    setView('lista')
    window.scrollTo({ top: 0 })
  }

  const lista = useMemo(
    () =>
      servicos
        .filter(
          (s) =>
            (!ini || s.dataEntrada >= ini) &&
            (!fim || s.dataEntrada <= fim) &&
            (!fCli.trim() || norm(s.lojista).includes(norm(fCli))) &&
            (!fBanc || s.statusBancada === fBanc) &&
            (!fFin || s.statusFin === fFin)
        )
        .sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada)),
    [servicos, ini, fim, fCli, fBanc, fFin]
  )
  const pendentesLista = lista.filter((s) => s.statusFin === 'Pendente')

  // Agrupamento dos pendentes por cliente para o pop-up de Cobrança WhatsApp
  const agruparPendentes = (itens: Servico[]) => {
    const mapa = new Map<string, { cliente: string; telefone: string; itens: Servico[] }>()
    itens.forEach((s) => {
      const k = norm(s.lojista)
      const cad = lojistas.find((l) => norm(l.nome) === k)
      const atual = mapa.get(k)
      if (atual) {
        atual.itens.push(s)
        if (!atual.telefone && (s.telefone || cad?.telefone)) {
          atual.telefone = s.telefone || cad?.telefone || ''
        }
      } else {
        mapa.set(k, {
          cliente: s.lojista,
          telefone: s.telefone || cad?.telefone || '',
          itens: [s],
        })
      }
    })
    return [...mapa.entries()].map(([key, val]) => ({ key, ...val }))
  }
  const gruposFiltro = useMemo(
    () => agruparPendentes(pendentesLista),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendentesLista, lojistas]
  )
  // Todas as pendências, independente do período/filtros, agrupadas por cliente (maior dívida primeiro)
  const gruposGeral = useMemo(
    () =>
      agruparPendentes(servicos.filter((s) => s.statusFin === 'Pendente'))
        .map((g) => ({ ...g, total: soma(g.itens.map((i) => i.valor)) }))
        .sort((a, b) => b.total - a.total),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [servicos, lojistas]
  )
  const totalGeralPendente = soma(gruposGeral.map((g) => g.total))
  const gruposPendentes = cobrancaGeral ? gruposGeral : gruposFiltro

  const telefoneDe = (s: Servico) =>
    s.telefone || lojistas.find((l) => norm(l.nome) === norm(s.lojista))?.telefone || ''

  function abrirCobrancaCliente(key: string) {
    const g = gruposGeral.find((x) => x.key === key)
    if (!g) return
    setCobrancaGeral(true)
    setClienteCobrancaSel(g.key)
    setMensagemEditada(formatarMensagemCobranca(g.cliente, g.itens, config))
    setCopiadoModal(false)
    setModalCobrancaAberto(true)
  }

  function abrirBaixaLote(cliente: string, itens: Servico[]) {
    if (itens.length === 0) return
    setBaixaLote({ cliente, itens })
    setDataBaixaLote(hoje())
  }

  function confirmarBaixaLote() {
    if (!baixaLote) return
    const data = dataBaixaLote || hoje()
    const atualizados = baixaLote.itens.map((s) => ({ ...s, statusFin: 'Pago' as StatusFin, dataPagamento: data }))
    if (onSaveMany) onSaveMany(atualizados)
    else atualizados.forEach((s) => onSave(s))
    setBaixaLote(null)
    setModalCobrancaAberto(false)
  }

  function abrirModalCobranca() {
    if (gruposFiltro.length === 0) return
    setCobrancaGeral(false)
    const primeiro = gruposFiltro[0]
    setClienteCobrancaSel(primeiro.key)
    setMensagemEditada(formatarMensagemCobranca(primeiro.cliente, primeiro.itens, config))
    setCopiadoModal(false)
    setModalCobrancaAberto(true)
  }

  function trocarClienteCobranca(key: string) {
    setClienteCobrancaSel(key)
    setCopiadoModal(false)
    if (key === '__todos__') {
      const blocos = gruposPendentes.map((g) => formatarMensagemCobranca(g.cliente, g.itens, config))
      setMensagemEditada(blocos.join('\n\n————————\n\n'))
    } else {
      const g = gruposPendentes.find((x) => x.key === key)
      if (g) {
        setMensagemEditada(formatarMensagemCobranca(g.cliente, g.itens, config))
      }
    }
  }

  const grupoSelecionadoAtual = useMemo(
    () => (clienteCobrancaSel === '__todos__' ? null : gruposPendentes.find((g) => g.key === clienteCobrancaSel) || null),
    [clienteCobrancaSel, gruposPendentes]
  )

  function abrirPopupStatus(s: Servico) {
    setModalStatusServico(s)
    setStatusSelecionado(s.statusBancada)
  }

  function confirmarStatus() {
    if (!modalStatusServico) return
    const atualizado = { ...modalStatusServico, statusBancada: statusSelecionado }
    onSave(atualizado)
    if (statusSelecionado === 'Pronto' && modalStatusServico.statusBancada !== 'Pronto') {
      setAvisoPronto({ ...atualizado, telefone: telefoneDe(atualizado) })
    }
    setModalStatusServico(null)
  }

  function abrirPopupPago(s: Servico) {
    setModalPagoServico(s)
    setDataPagoSelecionada(hoje())
  }

  function confirmarPago() {
    if (!modalPagoServico) return
    onSave({
      ...modalPagoServico,
      statusFin: 'Pago',
      dataPagamento: dataPagoSelecionada || hoje(),
    })
    setModalPagoServico(null)
  }

  // =========================== PÁGINA DE CADASTRO ===========================
  if (view === 'form') {
    const totalGeral = soma(aparelhos.flatMap((a) => a.linhas.map((l) => num(l.valor))))
    return (
      <form onSubmit={salvar} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" className={btnGhost} onClick={() => setView('lista')}>
            <ArrowLeft size={16} /> Voltar para {config.abaServicos}
          </button>
          <h2 className="text-lg font-bold text-slate-900">{editId ? 'Editar serviço' : 'Novo serviço'}</h2>
        </div>

        <section className={card}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="min-w-0">
              <label className={lbl}>Data de entrada</label>
              <input type="date" className={inp} value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} />
            </div>
            <div className="min-w-0">
              <label className={lbl}>{config.labelCliente}</label>
              <AutoCompleteInput
                value={cliente}
                onChange={mudarCliente}
                onSelect={(item) => mudarCliente(item.valor)}
                sugestoes={sugestoesClientesForm}
                placeholder={`Clique ou digite o ${config.labelCliente.toLowerCase()}`}
              />
            </div>
            <div className="min-w-0">
              <label className={lbl}>WhatsApp / Telefone</label>
              <div className="flex gap-2">
                <input
                  className={inp}
                  inputMode="tel"
                  placeholder="(13) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
                {whatsLink(telefone) && (
                  <a
                    href={whatsLink(telefone)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center rounded-lg bg-emerald-500 px-3 text-white hover:bg-emerald-600"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {aparelhos.map((a, idx) => {
          const preco = buscarPreco(precos, a.tipo, a.marca, a.modelo)
          const totalAp = soma(a.linhas.map((l) => num(l.valor)))
          const sugestoesServicos: SugestaoItem[] = servicosDoTipo(a.tipo).map((srv) => {
            const v = valorAuto(preco, srv)
            return {
              valor: srv,
              subtitulo: v != null ? brl(v) : undefined,
            }
          })

          const sugestoesModelos: SugestaoItem[] = precos
            .filter((p) => norm(p.tipo) === norm(a.tipo) && (norm(a.marca) === 'outros' || norm(p.marca) === norm(a.marca)))
            .filter((p) => modeloCombina(p.modelo, a.modelo))
            .sort((x, y) => x.modelo.localeCompare(y.modelo, 'pt-BR', { numeric: true }))
            .slice(0, 60)
            .map((p) => ({ valor: padronizarModelo(p.modelo) }))

          return (
            <section key={a.key} className={card}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Aparelho {idx + 1}</h3>
                {aparelhos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setAparelhos((p) => p.filter((x) => x.key !== a.key))}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Remover aparelho
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="min-w-0">
                  <label className={lbl}>Tipo</label>
                  <select className={inp} value={a.tipo} onChange={(e) => mudarTipo(a, e.target.value as Tipo)}>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className={lbl}>Marca</label>
                  <select className={inp} value={a.marca} onChange={(e) => setAp(a.key, { marca: e.target.value as Marca })}>
                    {MARCAS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <label className={lbl}>
                    Modelo {preco && <span className="text-emerald-600">· encontrado na tabela</span>}
                  </label>
                  <AutoCompleteInput
                    placeholder="Clique ou digite o modelo / código (ex: iphone 13, A1566, serie 6)"
                    value={a.modelo}
                    sugestoes={sugestoesModelos}
                    filtrar={false}
                    onChange={(val) => setAp(a.key, { modelo: val })}
                    onSelect={(item) => setAp(a.key, { modelo: item.valor })}
                    onBlurValor={(val) => setAp(a.key, { modelo: padronizarModelo(val) })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Serviço executado</label>
                  <button
                    type="button"
                    onClick={() => setAp(a.key, { linhas: [...a.linhas, linhaVazia('')] })}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700"
                    title="Adicionar outro serviço neste aparelho"
                    aria-label="Adicionar outro serviço"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  {a.linhas.map((l) => (
                    <div key={l.id} className="flex items-center gap-2">
                      <AutoCompleteInput
                        className="min-w-0 flex-1"
                        placeholder="Clique ou digite o serviço"
                        value={l.servico}
                        sugestoes={sugestoesServicos}
                        onChange={(val) => setLinha(a.key, l.id, { servico: val, manual: false })}
                        onSelect={(item) => setLinha(a.key, l.id, { servico: item.valor, manual: false })}
                      />
                      <div className="relative w-28 shrink-0 sm:w-32">
                        <span className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">R$</span>
                        <input
                          className={`${inp} pl-9 text-right`}
                          inputMode="decimal"
                          placeholder="0,00"
                          value={l.valor}
                          onChange={(e) => setLinha(a.key, l.id, { valor: e.target.value, manual: true })}
                        />
                      </div>
                      {a.linhas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setAp(a.key, { linhas: a.linhas.filter((x) => x.id !== l.id) })}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                          aria-label="Remover serviço"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-right text-sm text-slate-600">
                  Total do aparelho: <b className="text-slate-900">{brl(totalAp)}</b>
                </p>
              </div>

              <div className="mt-3 min-w-0">
                <label className={lbl}>{config.labelObs}</label>
                <input className={inp} maxLength={120} value={a.obs} onChange={(e) => setAp(a.key, { obs: e.target.value })} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <label className={lbl}>{config.labelStatus}</label>
                  <select className={inp} value={a.statusBancada} onChange={(e) => setAp(a.key, { statusBancada: e.target.value as StatusBancada })}>
                    {STATUS_BANCADA.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className={lbl}>Status financeiro</label>
                  <select className={inp} value={a.statusFin} onChange={(e) => setAp(a.key, { statusFin: e.target.value as StatusFin })}>
                    <option>Pendente</option>
                    <option>Pago</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className={lbl}>Data do pagamento (opcional)</label>
                  <input
                    type="date"
                    className={inp}
                    disabled={a.statusFin !== 'Pago'}
                    value={a.dataPagamento}
                    onChange={(e) => setAp(a.key, { dataPagamento: e.target.value })}
                  />
                </div>
              </div>
            </section>
          )
        })}

        {!editId && (
          <button
            type="button"
            onClick={() => setAparelhos((p) => [...p, aparelhoVazio()])}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-red-300 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <Plus size={16} /> Adicionar outro aparelho
          </button>
        )}

        <div className="sticky bottom-16 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg md:bottom-3">
          <p className="text-sm text-slate-600">
            {aparelhos.length} aparelho(s) · total <b className="text-slate-900">{brl(totalGeral)}</b>
          </p>
          <button className={btnPrimary}>
            <Check size={16} /> {editId ? 'Salvar alterações' : aparelhos.length > 1 ? 'Salvar aparelhos' : 'Salvar serviço'}
          </button>
        </div>
      </form>
    )
  }

  // =========================== LISTA ===========================
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={abrirNovo} className={`${btnPrimary} flex-1 !py-3 text-base shadow sm:flex-none`}>
          <Plus size={18} /> Novo Serviço
        </button>
        <button onClick={() => setModalClientes(true)} className={btnGhost}>
          <Users size={16} /> Gerenciar {config.labelCliente}s
        </button>
        <button onClick={() => setModalPendencias(true)} className={btnGhost}>
          <Wallet size={16} /> Pendências por {config.labelCliente.toLowerCase()}
          {gruposGeral.length > 0 && (
            <span className="rounded-full bg-rose-100 px-1.5 text-xs font-bold text-rose-800">{gruposGeral.length}</span>
          )}
        </button>
      </div>

      <section className={card}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <label className={lbl}>Período</label>
            <select
              className={inp}
              value={modoPeriodo}
              onChange={(e) => setModoPeriodo(e.target.value as ModoPeriodo)}
            >
              <option value="mes_atual">Mês atual</option>
              <option value="semana_atual">Semana atual</option>
              <option value="todo_periodo">Todo o período</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className={lbl}>{config.labelCliente}</label>
            <AutoCompleteInput
              value={fCli}
              onChange={setFCli}
              onSelect={(item) => setFCli(item.valor)}
              sugestoes={sugestoesClientesFiltro}
              placeholder="Todos ou digite..."
              mostrarLimpar
            />
          </div>

          <div className="min-w-0">
            <label className={lbl}>{config.labelStatus}</label>
            <select className={inp} value={fBanc} onChange={(e) => setFBanc(e.target.value)}>
              <option value="">Todos</option>
              {STATUS_BANCADA.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className={lbl}>Financeiro</label>
            <select className={inp} value={fFin} onChange={(e) => setFFin(e.target.value)}>
              <option value="">Todos</option>
              <option value="Pendente">Pendentes / A receber</option>
              <option value="Pago">Pagos</option>
            </select>
          </div>
        </div>

        {modoPeriodo === 'personalizado' && (
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className={lbl}>Data inicial</label>
              <input type="date" className={inp} value={iniCustom} onChange={(e) => setIniCustom(e.target.value)} />
            </div>
            <div className="min-w-0">
              <label className={lbl}>Data final</label>
              <input type="date" className={inp} value={fimCustom} onChange={(e) => setFimCustom(e.target.value)} />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <b>{lista.length}</b> aparelho(s) · total <b>{brl(soma(lista.map((s) => s.valor)))}</b> · a receber{' '}
            <b className="text-amber-700">{brl(soma(pendentesLista.map((s) => s.valor)))}</b>
          </p>
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            onClick={abrirModalCobranca}
            disabled={pendentesLista.length === 0}
          >
            <MessageCircle size={16} />
            {`Cobrar no WhatsApp (${pendentesLista.length})`}
          </button>
        </div>
      </section>

      <section className="space-y-2">
        {lista.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Nenhum serviço neste filtro.</p>}
        {lista.map((s) => (
          <article key={s.id} className={`${card} !p-3`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{s.modelo}</p>
                <p className="text-xs text-slate-500">
                  {s.tipo}
                  {s.marca ? ` · ${s.marca}` : ''}
                </p>
                {s.itens && s.itens.length > 1 ? (
                  <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
                    {s.itens.map((i, k) => (
                      <li key={k}>
                        • {i.servico} <span className="text-slate-400">— {brl(i.valor)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">{s.servico}</p>
                )}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span>{fmtData(s.dataEntrada)}</span>
                  <span>·</span>
                  <span className="font-medium text-slate-700">{s.lojista}</span>
                  {whatsLink(s.telefone) && (
                    <a href={whatsLink(s.telefone)} target="_blank" rel="noreferrer" className="text-emerald-600" title="WhatsApp">
                      <MessageCircle size={14} />
                    </a>
                  )}
                </p>
                {s.obs && <p className="mt-1 text-xs italic text-slate-500">“{s.obs}”</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold text-slate-900">{brl(s.valor)}</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.statusFin === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {s.statusFin === 'Pago' ? `Pago ${fmtData(s.dataPagamento)}` : 'Pendente'}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => abrirPopupStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition hover:opacity-90 ${corBancada[s.statusBancada]}`}
                title="Clique para alterar o status"
              >
                {s.statusBancada} ›
              </button>
              {s.statusFin === 'Pendente' ? (
                <button
                  onClick={() => abrirPopupPago(s)}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <Check size={13} /> Marcar pago
                </button>
              ) : (
                <button
                  onClick={() => confirm(`Marcar "${s.modelo}" (${s.lojista}) como Pendente novamente?`) && onSave({ ...s, statusFin: 'Pendente', dataPagamento: '' })}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Desfazer pagamento
                </button>
              )}
              {s.statusBancada === 'Pronto' && whatsLink(telefoneDe(s)) && (
                <a
                  href={whatsLink(telefoneDe(s), formatarMensagemPronto(s, config))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  title="Avisar o cliente que o aparelho está pronto"
                >
                  <MessageCircle size={13} /> Avisar pronto
                </a>
              )}
              <span className="flex-1" />
              <button onClick={() => editar(s)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Editar">
                <Pencil size={16} />
              </button>
              <button
                onClick={() => confirm('Excluir este serviço?') && onRemove(s.id)}
                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* POP-UP: Alterar Status do Aparelho */}
      {modalStatusServico && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setModalStatusServico(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Alterar {config.labelStatus}</h3>
              <button
                type="button"
                onClick={() => setModalStatusServico(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-900">{modalStatusServico.modelo}</p>
              <p>
                {modalStatusServico.lojista} · {modalStatusServico.servico}
              </p>
            </div>

            <div className="space-y-2">
              {STATUS_BANCADA.map((st) => {
                const ativo = statusSelecionado === st
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusSelecionado(st)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
                      ativo
                        ? 'border-red-600 bg-red-50 text-red-700 ring-2 ring-red-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${corBancada[st].split(' ')[0]}`} />
                      {st}
                    </span>
                    {ativo && <Check size={16} className="text-red-600" />}
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setModalStatusServico(null)}>
                Cancelar
              </button>
              <button type="button" className={btnPrimary} onClick={confirmarStatus}>
                <Check size={16} /> Confirmar status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: Confirmar Pagamento com Data */}
      {modalPagoServico && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setModalPagoServico(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Confirmar Pagamento</h3>
              <button
                type="button"
                onClick={() => setModalPagoServico(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-slate-700">
              <p className="font-bold text-slate-900">{modalPagoServico.modelo}</p>
              <p>
                {modalPagoServico.lojista} · {modalPagoServico.servico}
              </p>
              <p className="mt-1 text-sm font-extrabold text-emerald-700">{brl(modalPagoServico.valor)}</p>
            </div>

            <div>
              <label className={lbl}>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={13} /> Data em que o serviço foi pago
                </span>
              </label>
              <input
                type="date"
                className={inp}
                value={dataPagoSelecionada}
                onChange={(e) => setDataPagoSelecionada(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                O valor será contabilizado no financeiro referente ao mês desta data.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setModalPagoServico(null)}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarPago}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Check size={16} /> Confirmar pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: Conferência e Envio de Cobrança WhatsApp */}
      {modalCobrancaAberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
          onClick={() => setModalCobrancaAberto(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} className="text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Conferir Cobrança WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCobrancaAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto p-4">
              {gruposPendentes.length > 1 && (
                <div>
                  <label className={lbl}>Selecione o {config.labelCliente.toLowerCase()} para cobrar</label>
                  <select
                    className={inp}
                    value={clienteCobrancaSel}
                    onChange={(e) => trocarClienteCobranca(e.target.value)}
                  >
                    {gruposPendentes.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.cliente} ({g.itens.length} pendente(s) · {brl(soma(g.itens.map((x) => x.valor)))})
                      </option>
                    ))}
                    <option value="__todos__">Todos os clientes juntos ({gruposPendentes.length})</option>
                  </select>
                </div>
              )}

              {grupoSelecionadoAtual && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span>
                    Cliente: <b className="text-slate-900">{grupoSelecionadoAtual.cliente}</b>
                  </span>
                  <span>
                    WhatsApp:{' '}
                    <b className={grupoSelecionadoAtual.telefone ? 'text-emerald-700' : 'text-rose-600'}>
                      {grupoSelecionadoAtual.telefone || 'Não cadastrado'}
                    </b>
                  </span>
                </div>
              )}

              <div>
                <label className={lbl}>Mensagem (você pode revisar ou editar antes de enviar)</label>
                <textarea
                  rows={8}
                  className={`${inp} font-sans leading-relaxed`}
                  value={mensagemEditada}
                  onChange={(e) => setMensagemEditada(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 p-4">
              {grupoSelecionadoAtual && (
                <button
                  type="button"
                  onClick={() => abrirBaixaLote(grupoSelecionadoAtual.cliente, grupoSelecionadoAtual.itens)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <Check size={16} /> Dar baixa em todos os pendentes deste cliente ({grupoSelecionadoAtual.itens.length})
                </button>
              )}
              <button
                type="button"
                className={btnGhost}
                onClick={async () => {
                  const ok = await copiar(mensagemEditada)
                  if (ok) {
                    setCopiadoModal(true)
                    setTimeout(() => setCopiadoModal(false), 2500)
                  }
                }}
              >
                {copiadoModal ? <Check size={16} className="text-emerald-600" /> : <ClipboardCopy size={16} />}
                {copiadoModal ? 'Mensagem copiada!' : 'Copiar texto'}
              </button>

              {grupoSelecionadoAtual && whatsLink(grupoSelecionadoAtual.telefone, mensagemEditada) ? (
                <a
                  href={whatsLink(grupoSelecionadoAtual.telefone, mensagemEditada)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => copiar(mensagemEditada)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Send size={16} /> Enviar no WhatsApp <ExternalLink size={14} />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title={
                    clienteCobrancaSel === '__todos__'
                      ? 'Selecione um cliente específico para abrir o WhatsApp direto'
                      : 'Cadastre o telefone deste cliente para enviar direto'
                  }
                  className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Send size={16} /> Enviar no WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: Pendências agrupadas por cliente */}
      {modalPendencias && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
          onClick={() => setModalPendencias(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Wallet size={20} className="text-red-600" /> Pendências por {config.labelCliente.toLowerCase()}
                </h3>
                <p className="text-xs text-slate-500">Todas as datas de entrada · independe dos filtros da lista</p>
              </div>
              <button type="button" onClick={() => setModalPendencias(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {gruposGeral.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Nenhuma pendência. Tudo pago! 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {gruposGeral.map((g) => (
                    <li key={g.key} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{g.cliente}</p>
                          <p className="text-xs text-slate-500">
                            {g.itens.length} aparelho(s) · desde{' '}
                            {fmtData([...g.itens].sort((a, b) => a.dataEntrada.localeCompare(b.dataEntrada))[0].dataEntrada)}
                          </p>
                        </div>
                        <p className="shrink-0 text-lg font-extrabold text-rose-600">{brl(g.total)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setModalPendencias(false)
                            abrirCobrancaCliente(g.key)
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          <MessageCircle size={13} /> Cobrar
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirBaixaLote(g.cliente, g.itens)}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Check size={13} /> Quitar tudo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFCli(g.cliente)
                            setFFin('Pendente')
                            setModoPeriodo('todo_periodo')
                            setModalPendencias(false)
                          }}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Ver aparelhos
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {gruposGeral.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm">
                <span className="text-slate-600">Total a receber</span>
                <b className="text-lg text-rose-600">{brl(totalGeralPendente)}</b>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POP-UP: Baixa em lote (todos os pendentes de um cliente) */}
      {baixaLote && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setBaixaLote(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-bold text-slate-900">Dar baixa em lote</h3>
            <p className="mb-3 text-sm text-slate-600">
              Marcar como <b>Pago</b> {baixaLote.itens.length} aparelho(s) de <b>{baixaLote.cliente}</b>, totalizando{' '}
              <b className="text-emerald-700">{brl(soma(baixaLote.itens.map((i) => i.valor)))}</b>.
            </p>
            <ul className="mb-3 max-h-32 space-y-0.5 overflow-y-auto rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
              {baixaLote.itens.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {fmtData(i.dataEntrada)} · {i.modelo} · {i.servico}
                  </span>
                  <span className="shrink-0">{brl(i.valor)}</span>
                </li>
              ))}
            </ul>
            <label className={lbl}>Data do pagamento</label>
            <input type="date" className={inp} value={dataBaixaLote} onChange={(e) => setDataBaixaLote(e.target.value)} />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setBaixaLote(null)}>
                Cancelar
              </button>
              <button type="button" className={btnPrimary} onClick={confirmarBaixaLote}>
                <Check size={16} /> Confirmar baixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AVISO: aparelho ficou Pronto -> WhatsApp discreto */}
      {avisoPronto && (
        <div className="fixed inset-x-0 bottom-20 z-[70] flex justify-center px-4 md:bottom-6">
          <div className="flex w-full max-w-md items-center gap-3 rounded-xl bg-slate-900 p-3 text-sm text-white shadow-xl">
            <Check size={18} className="shrink-0 text-emerald-400" />
            <p className="min-w-0 flex-1 truncate">
              {nomeAparelho(avisoPronto)} marcado como <b>Pronto</b>
            </p>
            {whatsLink(avisoPronto.telefone) ? (
              <a
                href={whatsLink(avisoPronto.telefone, formatarMensagemPronto(avisoPronto, config))}
                target="_blank"
                rel="noreferrer"
                onClick={() => setAvisoPronto(null)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <MessageCircle size={14} /> Avisar no WhatsApp
              </a>
            ) : (
              <span className="shrink-0 text-xs text-slate-300">sem telefone</span>
            )}
            <button type="button" onClick={() => setAvisoPronto(null)} className="shrink-0 text-slate-300 hover:text-white" aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {modalClientes && (
        <ClientesModal
          lojistas={lojistas}
          servicos={servicos}
          labelCliente={config.labelCliente}
          onClose={() => setModalClientes(false)}
          onSaveLojista={onSaveLojista}
          onRemoveLojista={onRemoveLojista}
          onSaveServico={onSave}
        />
      )}
    </div>
  )
}
