import { useEffect, useState } from 'react'
import { BarChart3, FlaskConical, LogOut, Package, Smartphone, Tag, Wrench } from 'lucide-react'
import { supabase } from './lib/supabase'
import { Modo } from './lib/db'
import { useTable } from './lib/useTable'
import { gerarCatalogo } from './catalogoPrecos'
import { Lojista, Pedido, Preco, Servico } from './types'
import Login from './components/Login'
import Servicos from './components/Servicos'
import Pedidos from './components/Pedidos'
import Financeiro from './components/Financeiro'
import Tabela from './components/Tabela'

const ABAS = [
  { id: 'servicos', nome: 'Serviços', completo: 'Serviços', icone: Wrench },
  { id: 'pedidos', nome: 'Pedidos', completo: 'Pedidos & Insumos', icone: Package },
  { id: 'financeiro', nome: 'Financeiro', completo: 'Financeiro', icone: BarChart3 },
  { id: 'precos', nome: 'Preços', completo: 'Tabela de Preços', icone: Tag },
] as const

type AbaId = (typeof ABAS)[number]['id']

function Painel({ modo, onSair }: { modo: Modo; onSair: () => void }) {
  const [aba, setAba] = useState<AbaId>('servicos')
  const servicos = useTable<Servico>(modo, 'servicos')
  const pedidos = useTable<Pedido>(modo, 'pedidos')
  const precos = useTable<Preco>(modo, 'precos', gerarCatalogo)
  const lojistas = useTable<Lojista>(modo, 'lojistas')

  const carregando = servicos.loading || pedidos.loading || precos.loading || lojistas.loading

  // Migração única: troca o catálogo de exemplo antigo (ids "seed-") pelo catálogo oficial (ids "cat-")
  useEffect(() => {
    if (precos.loading) return
    const temExemplo = precos.items.some((p) => p.id.startsWith('seed-'))
    const temOficial = precos.items.some((p) => p.id.startsWith('cat-'))
    if (!temExemplo || temOficial) return
    precos.items.filter((p) => p.id.startsWith('seed-')).forEach((p) => precos.remove(p.id))
    precos.saveMany(gerarCatalogo())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precos.loading])

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      <header className="sticky top-0 z-20 bg-red-700 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Smartphone size={22} />
            <span className="text-lg font-bold">IPhoncel</span>
            {modo === 'local' && (
              <span className="ml-1 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                <FlaskConical size={11} /> teste local
              </span>
            )}
          </div>

          <nav className="hidden gap-1 md:flex">
            {ABAS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  aba === a.id ? 'bg-white text-red-700' : 'text-red-100 hover:bg-red-600'
                }`}
              >
                <a.icone size={16} /> {a.completo}
              </button>
            ))}
          </nav>

          <button onClick={onSair} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-red-100 hover:bg-red-600">
            <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4">
        <h1 className="mb-4 text-xl font-bold text-slate-900 md:hidden">{ABAS.find((a) => a.id === aba)!.completo}</h1>
        {carregando ? (
          <p className="py-16 text-center text-slate-500">Carregando…</p>
        ) : (
          <>
            {aba === 'servicos' && (
              <Servicos
                servicos={servicos.items}
                lojistas={lojistas.items}
                precos={precos.items}
                onSave={servicos.save}
                onRemove={servicos.remove}
                onSaveLojista={lojistas.save}
                onRemoveLojista={lojistas.remove}
              />
            )}
            {aba === 'pedidos' && <Pedidos pedidos={pedidos.items} onSave={pedidos.save} onRemove={pedidos.remove} />}
            {aba === 'financeiro' && <Financeiro servicos={servicos.items} pedidos={pedidos.items} />}
            {aba === 'precos' && (
              <Tabela precos={precos.items} onSave={precos.save} onSaveMany={precos.saveMany} onRemove={precos.remove} />
            )}
          </>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white md:hidden">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              aba === a.id ? 'text-red-700' : 'text-slate-500'
            }`}
          >
            <a.icone size={20} />
            {a.nome}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  const [local, setLocal] = useState(() => localStorage.getItem('iphoncel:modo') === 'local')
  const [sessao, setSessao] = useState<any>(null)
  const [verificando, setVerificando] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setVerificando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function sair() {
    if (local) {
      localStorage.removeItem('iphoncel:modo')
      setLocal(false)
    }
    if (supabase) await supabase.auth.signOut()
  }

  if (verificando && !local) return <p className="py-20 text-center text-slate-500">Carregando…</p>

  if (local) return <Painel key="local" modo="local" onSair={sair} />
  if (sessao) return <Painel key="supabase" modo="supabase" onSair={sair} />

  return (
    <Login
      onLocal={() => {
        localStorage.setItem('iphoncel:modo', 'local')
        setLocal(true)
      }}
    />
  )
}
