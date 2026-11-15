import { Preco, SERVICO_CHAVE, SERVICOS_POR_TIPO, PrecoKey, MASTER_CONFIG_PADRAO, MasterConfig, Servico } from '../types'

export const inp =
  'w-full min-w-0 max-w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100'
export const lbl = 'mb-1 block text-xs font-medium text-slate-600'
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50'
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
export const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'

export const uid = () =>
  (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)

export const hoje = () => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export const nomeMesAtual = () => {
  const d = new Date()
  const nome = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

export const brl = (n: number) =>
  (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtData = (iso: string) => {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// Semana 1 = dias 1-7, Semana 2 = 8-14, Semana 3 = 15-21, Semana 4 = 22 em diante
export const semanaDoMes = (iso: string) => {
  const dia = Number(iso.split('-')[2]) || 1
  return Math.min(4, Math.ceil(dia / 7))
}

export const norm = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const soDigitos = (s: string) => (s || '').replace(/\D/g, '')

export const whatsLink = (tel: string) => {
  let d = soDigitos(tel)
  if (!d) return ''
  if (d.length <= 11) d = '55' + d
  return `https://wa.me/${d}`
}

export async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = texto
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}

export const soma = (arr: number[]) => arr.reduce((a, b) => a + (Number(b) || 0), 0)

// ---------- datas ----------
export const ultimoDiaDoMes = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
const paraDataUTC = (iso: string) => new Date(iso + 'T00:00:00Z')
export const addDias = (iso: string, n: number) =>
  new Date(paraDataUTC(iso).getTime() + n * 86400000).toISOString().slice(0, 10)
export const diffDias = (a: string, b: string) =>
  Math.round((paraDataUTC(b).getTime() - paraDataUTC(a).getTime()) / 86400000)

// ---------- padronização de textos ----------
export const capitalizar = (t: string) =>
  (t || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase())

const MAPA_FIXO: Record<string, string> = {
  iphone: 'iPhone',
  ipad: 'iPad',
  ipod: 'iPod',
  airpods: 'AirPods',
  macbook: 'MacBook',
  imac: 'iMac',
}
const SIGLAS = new Set(['fe', 'se', 'gt', 'xr', 'xs', 'sm', 'ci', 'lte', 'nfc', 'gb', 'tb', 'hd', 'oled', 'amoled', 'lcd'])
const MINUSCULAS = new Set(['com', 'sem', 'touch', 'de', 'da', 'do'])

function palavra(p: string): string {
  const m = p.match(/^([^a-zA-Z0-9À-ÿ]*)(.*?)([^a-zA-Z0-9À-ÿ]*)$/)
  if (!m || !m[2]) return p
  const [, pre, core, pos] = m
  const l = core.toLowerCase()
  let r: string
  if (MAPA_FIXO[l]) r = MAPA_FIXO[l]
  else if (/^\d+mm$/.test(l)) r = l
  else if (MINUSCULAS.has(l)) r = l
  else if (/^[a-z](\.[a-z])+$/.test(l)) r = l.toUpperCase()
  else if (SIGLAS.has(l) || l.length === 1) r = l.toUpperCase()
  else if (/\d/.test(l)) r = l.toUpperCase()
  else r = l.charAt(0).toUpperCase() + l.slice(1)
  return pre + r + pos
}

/** "iphone 17 pro max" -> "iPhone 17 Pro Max" · "poco x6 pro 5g" -> "Poco X6 Pro 5G" */
export function padronizarModelo(texto: string): string {
  const t = (texto || '').trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return t
    .split(/(\s|\/|\-|\+)/)
    .map((p) => (/^(\s|\/|\-|\+)$/.test(p) ? p : palavra(p)))
    .join('')
}

// ---------- tabela de preços ----------
const semPrefixo = (n: string) => n.replace(/^(galaxy|samsung|motorola|moto|xiaomi) /, '')
const variantes = (s: string) => {
  const n = norm(s)
  return [n, semPrefixo(n)]
}
const baseDoNome = (s: string) => s.split(' - ')[0]

/** Procura o preço do modelo digitado (ignora maiúsculas/acentos e entende nomes agrupados com "/"). */
export function buscarPreco(precos: Preco[], tipo: string, marca: string, modelo: string): Preco | undefined {
  const alvo = variantes(modelo)
  if (!alvo[0]) return undefined
  const t = norm(tipo)
  const cands = precos.filter((p) => norm(p.tipo) === t)
  const bate = (nome: string) => variantes(nome).some((v) => alvo.includes(v))
  const preferirMarca = (lista: Preco[]) =>
    norm(marca) === 'outros' ? lista[0] : lista.find((p) => norm(p.marca) === norm(marca)) || lista[0]
  const exatos = cands.filter((p) => bate(p.modelo))
  if (exatos.length) return preferirMarca(exatos)
  const alias = cands.filter((p) => p.modelo.split('/').some((parte) => bate(baseDoNome(parte))))
  return alias.length ? preferirMarca(alias) : undefined
}

export function valorAuto(p: Preco | undefined, servico: string): number | undefined {
  if (!p) return undefined
  const par = Object.entries(SERVICO_CHAVE).find(([nome]) => norm(nome) === norm(servico))
  if (!par) return undefined
  const v = p[par[1] as PrecoKey]
  return v == null ? undefined : v
}

export function servicosDoTipo(tipo: string): string[] {
  const k = Object.keys(SERVICOS_POR_TIPO).find((x) => norm(x) === norm(tipo))
  if (k) return (SERVICOS_POR_TIPO as Record<string, string[]>)[k]
  return [...new Set(Object.values(SERVICOS_POR_TIPO).flat())]
}

export const nomeAparelho = (s: { marca: string; modelo: string }) =>
  s.marca && norm(s.marca) !== 'apple' && norm(s.marca) !== 'outros' && !norm(s.modelo).includes(norm(s.marca))
    ? `${s.marca} ${s.modelo}`
    : s.modelo

export function formatarMensagemCobranca(
  clienteNome: string,
  itens: Servico[],
  cfg: MasterConfig = MASTER_CONFIG_PADRAO
): string {
  const aplicarVars = (tpl: string, vars: Record<string, string>) =>
    Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), tpl)

  const cabecalho = aplicarVars(cfg.whatsCabecalho, {
    cliente: clienteNome,
    loja: cfg.nomeLoja,
  })

  const linhas = [...itens]
    .sort((a, b) => a.dataEntrada.localeCompare(b.dataEntrada))
    .map((s, i) =>
      aplicarVars(cfg.whatsLinha, {
        numero: String(i + 1),
        data: fmtData(s.dataEntrada),
        aparelho: nomeAparelho(s),
        servico: s.servico,
        valor: brl(s.valor),
        cliente: clienteNome,
        loja: cfg.nomeLoja,
      })
    )

  const totalFmt = brl(soma(itens.map((s) => s.valor)))
  const totalLinha = aplicarVars(cfg.whatsTotal, {
    total: totalFmt,
    cliente: clienteNome,
    loja: cfg.nomeLoja,
  })

  const rodape = aplicarVars(cfg.whatsRodape, {
    cliente: clienteNome,
    loja: cfg.nomeLoja,
    total: totalFmt,
  })

  return [cabecalho, '', ...linhas, '', totalLinha, '', rodape].join('\n')
}
