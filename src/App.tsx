import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, FlaskConical, Home, LogOut, Package, ShieldCheck, Smartphone, Tag, Wrench, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import { Modo } from './lib/db'
import { useTable } from './lib/useTable'
import { gerarCatalogo } from './catalogoPrecos'
import { Lojista, MASTER_CONFIG_PADRAO, MasterConfig, Pedido, Preco, Servico, StatusBancada } from './types'
import Login from './components/Login'
import Inicio from './components/Inicio'
import Servicos from './components/Servicos'
import Pedidos from './components/Pedidos'
import Financeiro from './components/Financeiro'
import Tabela from './components/Tabela'
import MasterAdmin from './components/MasterAdmin'
import TemaToggle from './components/TemaToggle'
import { btnGhost, btnPrimary, inp, lbl } from './lib/utils'

type AbaId = 'inicio' | 'servicos' | 'pedidos' | 'financeiro' | 'precos' | 'master'

const MASTER_ROW_ID = '__master_config__'

function Painel({ modo, onSair }: { modo: Modo; onSair: () => void }) {
  const [aba, setAba] = useState<AbaId>('inicio')
  const [abrirNovoDireto, setAbrirNovoDireto] = useState(false)
  const [abrirPendencias, setAbrirPendencias] = useState(false)
  const [statusFiltroAtalho, setStatusFiltroAtalho] = useState<StatusBancada | '' | undefined>(undefined)

  // Controle da aba secreta Admin Master (5 toques/cliques no logo + PIN)
  const [masterDesbloqueado, setMasterDesbloqueado] = useState(false)
  const [modalPinAberto, setModalPinAberto] = useState(false)
  const [pinDigitado, setPinDigitado] = useState('')
  const [pinErro, setPinErro] = useState(false)
  const cliquesLogoRef = useRef<{ count: number; timer: any }>({ count: 0, timer: null })

  const servicos = useTable<Servico>(modo, 'servicos')
  const pedidos = useTable<Pedido>(modo, 'pedidos')
  const precos = useTable<Preco>(modo, 'precos', gerarCatalogo)
  const lojistas = useTable<Lojista>(modo, 'lojistas')

  const carregando = servicos.loading || pedidos.loading || precos.loading || lojistas.loading

  const masterConfig = useMemo<MasterConfig>(() => {
    const row = lojistas.items.find((x) => x.id === MASTER_ROW_ID) as any
    if (row && row.config) {
      return { ...MASTER_CONFIG_PADRAO, ...row.config }
    }
    try {
      const localRaw = localStorage.getItem('iphoncel:master_config')
      if (localRaw) return { ...MASTER_CONFIG_PADRAO, ...JSON.parse(localRaw) }
    } catch {
      // ignora
    }
    return MASTER_CONFIG_PADRAO
  }, [lojistas.items])

  const clientesReais = useMemo(() => lojistas.items.filter((x) => x.id !== MASTER_ROW_ID), [lojistas.items])

  function salvarMasterConfig(novaCfg: MasterConfig) {
    localStorage.setItem('iphoncel:master_config', JSON.stringify(novaCfg))
    lojistas.save({ id: MASTER_ROW_ID, nome: '', telefone: '', config: novaCfg } as any)
  }

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

  useEffect(() => {
    document.title = masterConfig.nomeLoja || 'IPhoncel'
  }, [masterConfig.nomeLoja])

  function cliqueSecretoLogo() {
    if (masterDesbloqueado) {
      setAba('master')
      return
    }
    const ref = cliquesLogoRef.current
    ref.count += 1
    clearTimeout(ref.timer)
    if (ref.count >= 5) {
      ref.count = 0
      setPinDigitado('')
      setPinErro(false)
      setModalPinAberto(true)
    } else {
      ref.timer = setTimeout(() => {
        ref.count = 0
      }, 1800)
    }
  }

  function confirmarPin(e: React.FormEvent) {
    e.preventDefault()
    if (pinDigitado === (masterConfig.pinMaster || '1234')) {
      setMasterDesbloqueado(true)
      setModalPinAberto(false)
      setAba('master')
    } else {
      setPinErro(true)
    }
  }

  const ABAS = [
    { id: 'inicio' as AbaId, nome: masterConfig.abaInicio, completo: masterConfig.abaInicio, icone: Home },
    { id: 'servicos' as AbaId, nome: masterConfig.abaServicos, completo: masterConfig.abaServicos, icone: Wrench },
    { id: 'pedidos' as AbaId, nome: 'Pedidos', completo: masterConfig.abaPedidos, icone: Package },
    { id: 'financeiro' as AbaId, nome: masterConfig.abaFinanceiro, completo: masterConfig.abaFinanceiro, icone: BarChart3 },
    { id: 'precos' as AbaId, nome: 'Preços', completo: masterConfig.abaPrecos, icone: Tag },
    ...(masterDesbloqueado
      ? [{ id: 'master' as AbaId, nome: 'Master', completo: 'Admin Master', icone: ShieldCheck }]
      : []),
  ]

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      <header className="sticky top-0 z-20 bg-red-600 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cliqueSecretoLogo}
              className="flex items-center gap-2 text-left focus:outline-none"
            >
              <Smartphone size={22} />
              <span className="text-lg font-bold tracking-tight">{masterConfig.nomeLoja}</span>
            </button>
            {modo === 'local' && (
              <span className="ml-1 flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                <FlaskConical size={11} /> teste local
              </span>
            )}
          </div>

          <nav className="hidden gap-1 md:flex">
            {ABAS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  aba === a.id ? 'bg-white text-red-600 shadow-sm' : 'text-red-50 hover:bg-red-700'
                }`}
              >
                <a.icone size={16} /> {a.completo}
              </button>
            ))}
          </nav>

          <TemaToggle />
          <button
            onClick={onSair}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-red-50 hover:bg-red-700"
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4">
        <h1 className="mb-4 text-xl font-bold text-slate-900 md:hidden">
          {ABAS.find((a) => a.id === aba)?.completo || masterConfig.abaInicio}
        </h1>
        {carregando ? (
          <p className="py-16 text-center text-slate-500">Carregando…</p>
        ) : (
          <>
            {aba === 'inicio' && (
              <Inicio
                servicos={servicos.items}
                pedidos={pedidos.items}
                config={masterConfig}
                onNovoServico={() => {
                  setAbrirNovoDireto(true)
                  setAba('servicos')
                }}
                onIrParaServicos={(status) => {
                  setStatusFiltroAtalho(status ?? '')
                  setAba('servicos')
                }}
                onIrParaFinanceiro={() => setAba('financeiro')}
                onIrParaPendencias={() => {
                  setAbrirPendencias(true)
                  setAba('servicos')
                }}
              />
            )}
            {aba === 'servicos' && (
              <Servicos
                servicos={servicos.items}
                lojistas={clientesReais}
                precos={precos.items}
                config={masterConfig}
                abrirNovoDireto={abrirNovoDireto}
                statusInicialFiltro={statusFiltroAtalho}
                onConsumiuAtalho={() => {
                  setAbrirNovoDireto(false)
                  setAbrirPendencias(false)
                  setStatusFiltroAtalho(undefined)
                }}
                abrirPendenciasDireto={abrirPendencias}
                onSaveMany={servicos.saveMany}
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
            {aba === 'master' && masterDesbloqueado && (
              <MasterAdmin
                config={masterConfig}
                dadosBackup={{ servicos: servicos.items, pedidos: pedidos.items, lojistas: clientesReais, precos: precos.items }}
                onSaveConfig={salvarMasterConfig}
                onFecharMaster={() => {
                  setMasterDesbloqueado(false)
                  setAba('inicio')
                }}
              />
            )}
          </>
        )}
      </main>

      <nav
        className={`fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-white md:hidden ${
          masterDesbloqueado ? 'grid-cols-6' : 'grid-cols-5'
        }`}
      >
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              aba === a.id ? 'text-red-600' : 'text-slate-500'
            }`}
          >
            <a.icone size={19} />
            <span className="max-w-full truncate px-1">{a.nome}</span>
          </button>
        ))}
      </nav>

      {modalPinAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <ShieldCheck size={20} className="text-red-600" />
                <h3 className="font-bold">Acesso Admin Master</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPinAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={confirmarPin} className="space-y-3">
              <div>
                <label className={lbl}>Digite o PIN de administrador</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  className={inp}
                  placeholder="PIN (padrão: 1234)"
                  value={pinDigitado}
                  onChange={(e) => {
                    setPinErro(false)
                    setPinDigitado(e.target.value)
                  }}
                />
                {pinErro && <p className="mt-1 text-xs text-red-600">PIN incorreto.</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalPinAberto(false)} className={btnGhost}>
                  Cancelar
                </button>
                <button className={btnPrimary}>Desbloquear</button>
              </div>
            </form>
          </div>
        </div>
      )}
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
