import { useMemo, useRef, useState } from 'react'
import { Download, Plus, Search, Trash2, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { COLUNAS_PRECO, MARCAS, Marca, Preco, PrecoKey, TIPOS, Tipo } from '../types'
import { chaveModelo } from '../catalogoPrecos'
import { btnGhost, btnPrimary, card, inp, lbl, norm, uid } from '../lib/utils'

interface Props {
  precos: Preco[]
  onSave: (p: Preco) => void
  onSaveMany: (p: Preco[]) => void
  onRemove: (id: string) => void
}

function NumCell({ valor, ativo, onCommit }: { valor?: number; ativo: boolean; onCommit: (v?: number) => void }) {
  const [txt, setTxt] = useState<string | null>(null)
  if (!ativo) return <span className="text-slate-300">—</span>
  return (
    <input
      inputMode="decimal"
      className="w-20 rounded border border-slate-200 px-2 py-1 text-right text-sm focus:border-red-500 focus:outline-none"
      value={txt ?? (valor != null ? String(valor) : '')}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={() => {
        if (txt === null) return
        const t = txt.trim()
        const n = t === '' ? undefined : Number(t.replace(',', '.'))
        setTxt(null)
        if (n !== undefined && isNaN(n)) return
        if (n !== valor) onCommit(n)
      }}
    />
  )
}

// ---------- importação de planilha ----------
const limpaChave = (s: string) => norm(s).replace(/[^a-z0-9]/g, '')

const ALIASES: Record<string, string[]> = {
  tipo: ['tipo', 'aparelho', 'categoria'],
  marca: ['marca', 'fabricante'],
  modelo: ['modelo', 'aparelho modelo', 'nome'],
  vidro: ['vidro', 'trocadevidro', 'valorvidro', 'preco', 'valor'],
  tampaQueimar: ['tampaqueimar', 'tampasoqueimar', 'soqueimar', 'queimar'],
  tampaSolta: ['tampasolta', 'tampapecasolta', 'pecasolta'],
  tampaCompleta: ['tampacompleta', 'tampatrocacompleta', 'trocacompleta', 'tampa'],
  vidroSemTouch: ['vidrosemtouch', 'semtouch', 'vidrostouch'],
  vidroComTouch: ['vidrocomtouch', 'comtouch'],
}

function pegar(row: Record<string, any>, campo: string) {
  const chaves = Object.keys(row)
  for (const a of ALIASES[campo]) {
    const k = chaves.find((c) => limpaChave(c) === a)
    if (k !== undefined && row[k] !== '') return row[k]
  }
  return undefined
}

function numero(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v === 'number') return v
  let t = String(v).replace(/[^\d,.-]/g, '')
  if (!t) return undefined
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return isNaN(n) ? undefined : n
}

function inferirTipo(v: any, modelo: string): Tipo {
  const t = norm(String(v || ''))
  const m = norm(modelo)
  if (t.startsWith('rel') || t.includes('watch') || m.includes('watch')) return 'Relógio'
  if (t.startsWith('tab') || m.includes('ipad') || m.includes('tab ')) return 'Tablet'
  return 'Celular'
}

function inferirMarca(v: any, modelo: string): Marca {
  const t = norm(String(v || ''))
  const achada = MARCAS.find((m) => norm(m) === t)
  if (achada) return achada
  const m = norm(modelo)
  if (m.startsWith('iphone') || m.startsWith('ipad') || m.includes('apple')) return 'Apple'
  if (m.includes('galaxy') || m.startsWith('samsung')) return 'Samsung'
  if (m.startsWith('moto') || m.startsWith('edge')) return 'Motorola'
  if (m.includes('redmi') || m.includes('poco') || m.startsWith('mi ') || m.includes('xiaomi')) return 'Xiaomi'
  return 'Outros'
}

export default function Tabela({ precos, onSave, onSaveMany, onRemove }: Props) {
  const [busca, setBusca] = useState('')
  const [fTipo, setFTipo] = useState<'' | Tipo>('')
  const [novoTipo, setNovoTipo] = useState<Tipo>('Celular')
  const [novaMarca, setNovaMarca] = useState<Marca>('Apple')
  const [novoModelo, setNovoModelo] = useState('')
  const [msg, setMsg] = useState('')
  const arq = useRef<HTMLInputElement>(null)

  const lista = useMemo(
    () =>
      precos
        .filter((p) => (!fTipo || p.tipo === fTipo) && (!busca || norm(`${p.marca} ${p.modelo}`).includes(norm(busca))))
        .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo, 'pt-BR', { numeric: true })),
    [precos, busca, fTipo]
  )

  function adicionar(e: React.FormEvent) {
    e.preventDefault()
    const modelo = novoModelo.trim()
    if (!modelo) return
    const existe = precos.some((p) => chaveModelo(p.tipo, p.marca, p.modelo) === chaveModelo(novoTipo, novaMarca, modelo))
    if (existe) {
      alert('Esse modelo já existe na tabela.')
      return
    }
    onSave({ id: uid(), tipo: novoTipo, marca: novaMarca, modelo })
    setNovoModelo('')
    setBusca(modelo)
  }

  async function importar(file: File) {
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })
      const mapa = new Map(precos.map((p) => [chaveModelo(p.tipo, p.marca, p.modelo), p]))
      const alterados = new Map<string, Preco>()
      let novos = 0
      let atualizados = 0
      let ignorados = 0

      for (const row of rows) {
        const modelo = String(pegar(row, 'modelo') ?? '').trim()
        if (!modelo) {
          ignorados++
          continue
        }
        const tipo = inferirTipo(pegar(row, 'tipo'), modelo)
        const marca = inferirMarca(pegar(row, 'marca'), modelo)
        const chave = chaveModelo(tipo, marca, modelo)
        const base: Preco = alterados.get(chave) || mapa.get(chave) || { id: uid(), tipo, marca, modelo }
        const existia = mapa.has(chave) || alterados.has(chave)
        const novo: Preco = { ...base }
        let algum = false
        ;(['vidro', 'tampaQueimar', 'tampaSolta', 'tampaCompleta', 'vidroSemTouch', 'vidroComTouch'] as PrecoKey[]).forEach((k) => {
          const n = numero(pegar(row, k))
          if (n !== undefined) {
            novo[k] = n
            algum = true
          }
        })
        if (!algum && existia) {
          ignorados++
          continue
        }
        if (!alterados.has(chave)) existia ? atualizados++ : novos++
        alterados.set(chave, novo)
      }

      if (alterados.size) onSaveMany([...alterados.values()])
      setMsg(`Importação concluída: ${novos} novo(s), ${atualizados} atualizado(s), ${ignorados} linha(s) ignorada(s).`)
    } catch (e: any) {
      setMsg('Não consegui ler a planilha: ' + (e?.message || e))
    }
    if (arq.current) arq.current.value = ''
  }

  function baixarModelo() {
    const dados = [
      { Tipo: 'Celular', Marca: 'Apple', Modelo: 'iPhone 13', Vidro: 280, 'Tampa Queimar': 120, 'Tampa Solta': 150, 'Tampa Completa': 220, 'Vidro S/ Touch': '', 'Vidro C/ Touch': '' },
      { Tipo: 'Relógio', Marca: 'Apple', Modelo: 'Apple Watch Series 6 44mm', Vidro: '', 'Tampa Queimar': '', 'Tampa Solta': '', 'Tampa Completa': '', 'Vidro S/ Touch': 120, 'Vidro C/ Touch': 260 },
    ]
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Precos')
    XLSX.writeFile(wb, 'modelo-tabela-precos-iphoncel.xlsx')
  }

  const LIMITE = 200

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className={lbl}>Buscar modelo</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input className={`${inp} pl-9`} placeholder="Ex: iPhone 13, Galaxy A54…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={lbl}>Tipo</label>
            <select className={inp} value={fTipo} onChange={(e) => setFTipo(e.target.value as any)}>
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <input
            ref={arq}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])}
          />
          <button className={btnPrimary} onClick={() => arq.current?.click()}>
            <Upload size={16} /> Importar Excel (.xlsx)
          </button>
          <button className={btnGhost} onClick={baixarModelo}>
            <Download size={16} /> Planilha modelo
          </button>
        </div>
        {msg && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">{msg}</p>}
        <p className="mt-3 text-xs text-slate-500">
          Colunas aceitas na planilha: Tipo, Marca, Modelo, Vidro, Tampa Queimar, Tampa Solta, Tampa Completa, Vidro S/ Touch, Vidro C/ Touch.
          Modelos já existentes são atualizados; os novos são adicionados.
        </p>
      </section>

      <section className={card}>
        <h3 className="mb-3 font-bold text-slate-900">Adicionar modelo</h3>
        <form onSubmit={adicionar} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <label className={lbl}>Tipo</label>
            <select className={inp} value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as Tipo)}>
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Marca</label>
            <select className={inp} value={novaMarca} onChange={(e) => setNovaMarca(e.target.value as Marca)}>
              {MARCAS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={lbl}>Modelo</label>
            <input className={inp} value={novoModelo} onChange={(e) => setNovoModelo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className={`${btnPrimary} w-full`}>
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-500">Depois de adicionar, preencha os valores direto na tabela abaixo.</p>
      </section>

      <section className={`${card} overflow-x-auto !p-0`}>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Modelo</th>
              {COLUNAS_PRECO.map((c) => (
                <th key={c.key} className="px-2 py-2 text-right">
                  {c.titulo}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.slice(0, LIMITE).map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-900">{p.modelo}</p>
                  <p className="text-xs text-slate-500">
                    {p.tipo} · {p.marca}
                  </p>
                </td>
                {COLUNAS_PRECO.map((c) => (
                  <td key={c.key} className="px-2 py-2 text-right">
                    <NumCell
                      valor={p[c.key]}
                      ativo={c.tipos.includes(p.tipo)}
                      onCommit={(v) => onSave({ ...p, [c.key]: v })}
                    />
                  </td>
                ))}
                <td className="px-2">
                  <button
                    onClick={() => confirm(`Excluir ${p.modelo}?`) && onRemove(p.id)}
                    className="rounded p-1.5 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Nenhum modelo encontrado.</p>}
        {lista.length > LIMITE && (
          <p className="border-t p-3 text-center text-xs text-slate-500">
            Mostrando {LIMITE} de {lista.length}. Use a busca para refinar.
          </p>
        )}
      </section>
    </div>
  )
}
