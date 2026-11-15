import { useMemo, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Pedido } from '../types'
import { uid, hoje, brl, fmtData, inp, lbl, btnPrimary, btnGhost, card, soma } from '../lib/utils'

interface Props {
  pedidos: Pedido[]
  onSave: (p: Pedido) => void
  onRemove: (id: string) => void
}

export default function Pedidos({ pedidos, onSave, onRemove }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [data, setData] = useState(hoje())
  const [fornecedor, setFornecedor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [mes, setMes] = useState(hoje().slice(0, 7))

  const fornecedores = useMemo(() => [...new Set(pedidos.map((p) => p.fornecedor))].sort(), [pedidos])
  const lista = useMemo(
    () => pedidos.filter((p) => !mes || p.data.startsWith(mes)).sort((a, b) => b.data.localeCompare(a.data)),
    [pedidos, mes]
  )

  function limpar() {
    setEditId(null)
    setData(hoje())
    setFornecedor('')
    setDescricao('')
    setValor('')
  }

  function editar(p: Pedido) {
    setEditId(p.id)
    setData(p.data)
    setFornecedor(p.fornecedor)
    setDescricao(p.descricao)
    setValor(String(p.valor))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const v = Number(valor.replace(',', '.'))
    if (!fornecedor.trim() || !v) {
      alert('Informe o fornecedor e o valor.')
      return
    }
    onSave({ id: editId || uid(), data, fornecedor: fornecedor.trim(), descricao: descricao.trim(), valor: v })
    if (editId) limpar()
    else {
      setDescricao('')
      setValor('')
    }
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="mb-3 text-lg font-bold text-slate-900">{editId ? 'Editar pedido / insumo' : 'Novo pedido / insumo'}</h2>
        <form onSubmit={enviar} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="min-w-0">
            <label className={lbl}>Data</label>
            <input type="date" className={inp} value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="min-w-0">
            <label className={lbl}>Fornecedor</label>
            <input list="lista-fornecedores" className={inp} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
            <datalist id="lista-fornecedores">
              {fornecedores.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <label className={lbl}>Descrição</label>
            <input
              className={inp}
              placeholder="Ex: 10 vidros iPhone 13 + cola"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <label className={lbl}>Valor (R$)</label>
            <input className={inp} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="flex gap-2 sm:col-span-5">
            <button className={btnPrimary}>
              {editId ? <Check size={16} /> : <Plus size={16} />} {editId ? 'Salvar alterações' : 'Lançar compra'}
            </button>
            {editId && (
              <button type="button" className={btnGhost} onClick={limpar}>
                <X size={16} /> Cancelar edição
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="w-full min-w-0 sm:w-auto">
            <label className={lbl}>Mês</label>
            <input type="month" className={inp} value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <p className="text-sm text-slate-600">
            Subtotal do mês: <b className="text-lg text-slate-900">{brl(soma(lista.map((p) => p.valor)))}</b>
          </p>
        </div>

        {lista.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Nenhuma compra neste mês.</p>}
        <ul className="divide-y divide-slate-100">
          {lista.map((p) => (
            <li key={p.id} className={`flex items-center justify-between gap-3 py-2.5 ${editId === p.id ? 'rounded-lg bg-red-50 px-2' : ''}`}>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {p.fornecedor} <span className="text-xs font-normal text-slate-500">· {fmtData(p.data)}</span>
                </p>
                {p.descricao && <p className="truncate text-sm text-slate-600">{p.descricao}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <b className="mr-1">{brl(p.valor)}</b>
                <button onClick={() => editar(p)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Editar">
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => confirm('Excluir esta compra?') && onRemove(p.id)}
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
