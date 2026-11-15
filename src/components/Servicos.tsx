import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ClipboardCopy, MessageCircle, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import {
  Servico, Lojista, Preco, StatusBancada, StatusFin,
  STATUS_BANCADA, TIPOS_SUGESTAO, MARCAS_SUGESTAO,
} from '../types'
import {
  uid, hoje, brl, fmtData, whatsLink, norm, inp, lbl, copiar, soma, btnPrimary, btnGhost, card,
  ultimoDiaDoMes, capitalizar, padronizarModelo, buscarPreco, valorAuto, servicosDoTipo, nomeAparelho,
} from '../lib/utils'

interface Props {
  servicos: Servico[]
  lojistas: Lojista[]
  precos: Preco[]
  onSave: (s: Servico) => void
  onRemove: (id: string) => void
  onSaveLojista: (l: Lojista) => void
  onRemoveLojista: (id: string) => void
}

type Linha = { id: string; servico: string; valor: string; manual: boolean }
type Aparelho = {
  key: string
  tipo: string
  marca: string
  modelo: string
  linhas: Linha[]
  obs: string
  statusBancada: StatusBancada
  statusFin: StatusFin
  dataPagamento: string
}

const linhaVazia = (servico = ''): Linha => ({ id: uid(), servico, valor: '', manual: false })
const aparelhoVazio = (): Aparelho => ({
  key: uid(),
  tipo: 'Celular',
  marca: 'Apple',
  modelo: '',
  linhas: [linhaVazia('Troca de Vidro')],
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
// Modal: Gerenciar Clientes
// ---------------------------------------------------------------------------
function ClientesModal({
  lojistas, servicos, onClose, onSaveLojista, onRemoveLojista, onSaveServico,
}: {
  lojistas: Lojista[]
  servicos: Servico[]
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
      alert('O nome do cliente não pode ficar vazio.')
      return
    }
    const novo: Lojista = { id: norm(n), nome: n, telefone: tel.trim() }
    if (novo.id !== l.id) onRemoveLojista(l.id)
    onSaveLojista(novo)
    // mantém os serviços já lançados coerentes com o cadastro
    servicos
      .filter((s) => norm(s.lojista) === l.id)
      .forEach((s) => onSaveServico({ ...s, lojista: n, telefone: tel.trim() }))
    setEditando(null)
  }

  function excluir(l: Lojista) {
    if (confirm(`Excluir "${l.nome}" do cadastro de clientes?\nOs serviços já lançados continuam na lista.`)) onRemoveLojista(l.id)
  }

  const qtd = (l: Lojista) => servicos.filter((s) => norm(s.lojista) === l.id).length

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-lg font-bold text-slate-900">Gerenciar Clientes</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="border-b border-slate-100 p-3">
          <input className={inp} placeholder="Buscar cliente…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {lista.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nenhum cliente cadastrado ainda.</li>}
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
export default function Servicos({ servicos, lojistas, precos, onSave, onRemove, onSaveLojista, onRemoveLojista }: Props) {
  const [view, setView] = useState<'lista' | 'form'>('lista')
  const [modalClientes, setModalClientes] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // formulário
  const [editId, setEditId] = useState<string | null>(null)
  const [dataEntrada, setDataEntrada] = useState(hoje())
  const [cliente, setCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [aparelhos, setAparelhos] = useState<Aparelho[]>([aparelhoVazio()])

  // filtros
  const mesAtual = hoje().slice(0, 7)
  const [ini, setIni] = useState(`${mesAtual}-01`)
  const [fim, setFim] = useState(`${mesAtual}-${String(ultimoDiaDoMes(mesAtual)).padStart(2, '0')}`)
  const [fCli, setFCli] = useState('')
  const [fBanc, setFBanc] = useState('')
  const [fFin, setFFin] = useState('')

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

  function mudarTipo(a: Aparelho, tipo: string) {
    const sugestoes = servicosDoTipo(tipo)
    const primeira = a.linhas[0]
    const valida = sugestoes.some((s) => norm(s) === norm(primeira?.servico || ''))
    const linhas = valida || !primeira ? a.linhas : [{ ...primeira, servico: sugestoes[0] || '', manual: false }, ...a.linhas.slice(1)]
    setAp(a.key, { tipo, linhas })
  }

  function mudarCliente(nome: string) {
    setCliente(nome)
    const achado = lojistas.find((l) => norm(l.nome) === norm(nome))
    if (achado) setTelefone(achado.telefone)
  }

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
    setAparelhos([
      {
        key: uid(),
        tipo: s.tipo,
        marca: s.marca,
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
      alert('Informe o cliente.')
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
        tipo: capitalizar(a.tipo) || 'Celular',
        marca: capitalizar(a.marca),
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

  const proximoStatus = (s: StatusBancada): StatusBancada =>
    STATUS_BANCADA[(STATUS_BANCADA.indexOf(s) + 1) % STATUS_BANCADA.length]

  const nomesClientes = useMemo(() => [...new Set(servicos.map((s) => s.lojista))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [servicos])

  const lista = useMemo(
    () =>
      servicos
        .filter(
          (s) =>
            (!ini || s.dataEntrada >= ini) &&
            (!fim || s.dataEntrada <= fim) &&
            (!fCli || s.lojista === fCli) &&
            (!fBanc || s.statusBancada === fBanc) &&
            (!fFin || s.statusFin === fFin)
        )
        .sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada)),
    [servicos, ini, fim, fCli, fBanc, fFin]
  )
  const pendentesLista = lista.filter((s) => s.statusFin === 'Pendente')

  async function copiarCobranca() {
    const grupos = new Map<string, Servico[]>()
    pendentesLista.forEach((s) => grupos.set(s.lojista, [...(grupos.get(s.lojista) || []), s]))
    const blocos = [...grupos.entries()].map(([nome, itens]) => {
      const linhas = itens
        .sort((a, b) => a.dataEntrada.localeCompare(b.dataEntrada))
        .map((s, i) => `${i + 1}) ${fmtData(s.dataEntrada)} – ${nomeAparelho(s)} – ${s.servico} – ${brl(s.valor)}`)
      return `Olá, ${nome}! 👋\nSegue o resumo dos serviços pendentes no laboratório *IPhoncel*:\n\n${linhas.join('\n')}\n\n*Total a pagar: ${brl(soma(itens.map((s) => s.valor)))}*\n\nQualquer dúvida é só chamar. Obrigado pela parceria! 🙏`
    })
    const ok = await copiar(blocos.join('\n\n————————\n\n'))
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  // =========================== PÁGINA DE CADASTRO ===========================
  if (view === 'form') {
    const totalGeral = soma(aparelhos.flatMap((a) => a.linhas.map((l) => num(l.valor))))
    return (
      <form onSubmit={salvar} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" className={btnGhost} onClick={() => setView('lista')}>
            <ArrowLeft size={16} /> Voltar para Serviços
          </button>
          <h2 className="text-lg font-bold text-slate-900">{editId ? 'Editar serviço' : 'Novo serviço'}</h2>
        </div>

        <datalist id="lista-clientes">
          {lojistas.map((l) => (
            <option key={l.id} value={l.nome} />
          ))}
        </datalist>
        <datalist id="lista-tipos">
          {TIPOS_SUGESTAO.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <datalist id="lista-marcas">
          {MARCAS_SUGESTAO.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <section className={card}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={lbl}>Data de entrada</label>
              <input type="date" className={inp} value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Cliente</label>
              <input
                list="lista-clientes"
                className={inp}
                placeholder="Nome do cliente"
                value={cliente}
                onChange={(e) => mudarCliente(e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>WhatsApp / Telefone</label>
              <div className="flex gap-2">
                <input className={inp} inputMode="tel" placeholder="(13) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
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

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className={lbl}>Tipo</label>
                  <input
                    list="lista-tipos"
                    className={inp}
                    value={a.tipo}
                    onChange={(e) => mudarTipo(a, e.target.value)}
                    onBlur={(e) => setAp(a.key, { tipo: capitalizar(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={lbl}>Marca</label>
                  <input
                    list="lista-marcas"
                    className={inp}
                    value={a.marca}
                    onChange={(e) => setAp(a.key, { marca: e.target.value })}
                    onBlur={(e) => setAp(a.key, { marca: capitalizar(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>
                    Modelo {preco && <span className="text-emerald-600">· encontrado na tabela</span>}
                  </label>
                  <input
                    className={inp}
                    placeholder="Ex: iphone 13 pro max"
                    value={a.modelo}
                    onChange={(e) => setAp(a.key, { modelo: e.target.value })}
                    onBlur={(e) => setAp(a.key, { modelo: padronizarModelo(e.target.value) })}
                  />
                </div>
              </div>

              <datalist id={`sv-${a.key}`}>
                {servicosDoTipo(a.tipo).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Serviço executado</label>
                  <button
                    type="button"
                    onClick={() => setAp(a.key, { linhas: [...a.linhas, linhaVazia()] })}
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
                      <input
                        list={`sv-${a.key}`}
                        className={`${inp} flex-1`}
                        placeholder="Serviço"
                        value={l.servico}
                        onChange={(e) => setLinha(a.key, l.id, { servico: e.target.value, manual: false })}
                      />
                      <div className="relative w-32 shrink-0">
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

              <div className="mt-3">
                <label className={lbl}>Observação</label>
                <input className={inp} maxLength={120} value={a.obs} onChange={(e) => setAp(a.key, { obs: e.target.value })} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={lbl}>Status na bancada</label>
                  <select className={inp} value={a.statusBancada} onChange={(e) => setAp(a.key, { statusBancada: e.target.value as StatusBancada })}>
                    {STATUS_BANCADA.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Status financeiro</label>
                  <select className={inp} value={a.statusFin} onChange={(e) => setAp(a.key, { statusFin: e.target.value as StatusFin })}>
                    <option>Pendente</option>
                    <option>Pago</option>
                  </select>
                </div>
                <div>
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
          <Users size={16} /> Gerenciar Clientes
        </button>
      </div>

      <section className={card}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <label className={lbl}>Data inicial</label>
            <input type="date" className={inp} value={ini} onChange={(e) => setIni(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Data final</label>
            <input type="date" className={inp} value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Cliente</label>
            <select className={inp} value={fCli} onChange={(e) => setFCli(e.target.value)}>
              <option value="">Todos</option>
              {nomesClientes.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Bancada</label>
            <select className={inp} value={fBanc} onChange={(e) => setFBanc(e.target.value)}>
              <option value="">Todos</option>
              {STATUS_BANCADA.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Financeiro</label>
            <select className={inp} value={fFin} onChange={(e) => setFFin(e.target.value)}>
              <option value="">Todos</option>
              <option value="Pendente">Pendentes / A receber</option>
              <option value="Pago">Pagos</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <b>{lista.length}</b> aparelho(s) · total <b>{brl(soma(lista.map((s) => s.valor)))}</b> · a receber{' '}
            <b className="text-amber-700">{brl(soma(pendentesLista.map((s) => s.valor)))}</b>
          </p>
          <button className={btnGhost} onClick={copiarCobranca} disabled={pendentesLista.length === 0}>
            {copiado ? <Check size={16} className="text-emerald-600" /> : <ClipboardCopy size={16} />}
            {copiado ? 'Copiado!' : `Copiar Cobrança WhatsApp (${pendentesLista.length})`}
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
                onClick={() => onSave({ ...s, statusBancada: proximoStatus(s.statusBancada) })}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${corBancada[s.statusBancada]}`}
                title="Clique para avançar o status"
              >
                {s.statusBancada} ›
              </button>
              {s.statusFin === 'Pendente' ? (
                <button
                  onClick={() => onSave({ ...s, statusFin: 'Pago', dataPagamento: hoje() })}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <Check size={13} /> Marcar pago
                </button>
              ) : (
                <button
                  onClick={() => onSave({ ...s, statusFin: 'Pendente', dataPagamento: '' })}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Desfazer pagamento
                </button>
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

      {modalClientes && (
        <ClientesModal
          lojistas={lojistas}
          servicos={servicos}
          onClose={() => setModalClientes(false)}
          onSaveLojista={onSaveLojista}
          onRemoveLojista={onRemoveLojista}
          onSaveServico={onSave}
        />
      )}
    </div>
  )
}
