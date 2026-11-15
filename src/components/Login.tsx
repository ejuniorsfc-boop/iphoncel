import { useState } from 'react'
import { Smartphone, LogIn, FlaskConical, AlertTriangle } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { btnPrimary, inp, lbl } from '../lib/utils'

export default function Login({ onLocal }: { onLocal: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setErro('')
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setCarregando(false)
    if (error) setErro('E-mail ou senha incorretos.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-600 to-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="rounded-2xl bg-red-100 p-3 text-red-600">
            <Smartphone size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">IPhoncel</h1>
          <p className="text-sm text-slate-500">Gestão do laboratório · acesso restrito</p>
        </div>

        {!supabaseConfigurado && (
          <div className="mb-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Supabase ainda não configurado. Use o modo de teste local abaixo.</span>
          </div>
        )}

        <form onSubmit={entrar} className="space-y-3">
          <div>
            <label className={lbl}>E-mail</label>
            <input
              type="email"
              required
              className={inp}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className={lbl}>Senha</label>
            <input
              type="password"
              required
              className={inp}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button className={`${btnPrimary} w-full`} disabled={carregando || !supabaseConfigurado}>
            <LogIn size={16} /> {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <button
          onClick={onLocal}
          className="mx-auto mt-5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
        >
          <FlaskConical size={13} /> Entrar em Modo de Teste Local
        </button>
      </div>
    </div>
  )
}
