export type Tema = 'claro' | 'escuro'

const CHAVE = 'iphoncel:tema'

/** Tema salvo neste aparelho; se nunca escolheu, segue o tema do sistema (celular/computador). */
export function lerTema(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch {
    // ignora
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function aplicarTema(t: Tema) {
  document.documentElement.classList.toggle('dark', t === 'escuro')
}

export function salvarTema(t: Tema) {
  try {
    localStorage.setItem(CHAVE, t)
  } catch {
    // ignora
  }
}
