import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { aplicarTema, lerTema, salvarTema, Tema } from '../lib/tema'

export default function TemaToggle({ variant = 'header' }: { variant?: 'header' | 'login' }) {
  const [tema, setTema] = useState<Tema>(lerTema)

  function alternar() {
    const novo: Tema = tema === 'escuro' ? 'claro' : 'escuro'
    setTema(novo)
    aplicarTema(novo)
    salvarTema(novo)
  }

  const estilo =
    variant === 'login'
      ? 'absolute right-4 top-4 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white hover:bg-white/25'
      : 'rounded-lg px-2.5 py-1.5 text-sm text-red-50 hover:bg-red-700'

  return (
    <button
      type="button"
      onClick={alternar}
      className={`flex items-center gap-1.5 ${estilo}`}
      title={tema === 'escuro' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      aria-label={tema === 'escuro' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
    >
      {tema === 'escuro' ? <Sun size={16} /> : <Moon size={16} />}
      <span className="hidden sm:inline">{tema === 'escuro' ? 'Claro' : 'Escuro'}</span>
    </button>
  )
}
