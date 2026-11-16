import { Preco, SERVICO_CHAVE, SERVICOS_POR_TIPO, PrecoKey, MASTER_CONFIG_PADRAO, MasterConfig, Servico } from '../types'

export const inp =
  'w-full min-w-0 max-w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100'
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

export const whatsLink = (tel: string, texto?: string) => {
  let d = soDigitos(tel)
  if (!d) return ''
  if (d.length <= 11) d = '55' + d
  const baseUrl = `https://wa.me/${d}`
  return texto ? `${baseUrl}?text=${encodeURIComponent(texto)}` : baseUrl
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

export const intervaloSemanaAtual = () => {
  const h = hoje()
  const dt = paraDataUTC(h)
  const diaSem = dt.getUTCDay() // 0=Dom, 1=Seg...6=Sab
  const diffSeg = diaSem === 0 ? -6 : 1 - diaSem
  const ini = addDias(h, diffSeg)
  const fim = addDias(ini, 6)
  return { ini, fim }
}

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

/** Texto de busca: sem acento/maiúscula, "series"="serie", "44mm"="44 mm", separadores viram espaço. */
export const normBusca = (s: string) =>
  norm(s)
    .replace(/\bseries\b/g, 'serie')
    .replace(/(\d)\s*mm\b/g, '$1 mm')
    .replace(/[\/\-–_,.()+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Todas as palavras digitadas precisam começar alguma palavra do nome (ex.: "a1566" acha "IPAD AIR 2 - A1566 / A1567"). */
export function modeloCombina(nome: string, busca: string): boolean {
  const q = normBusca(busca)
  if (!q) return true
  const palavras = normBusca(nome).split(' ')
  return q.split(' ').every((t) => palavras.some((p) => p.startsWith(t)))
}

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
  if (alias.length) return preferirMarca(alias)
  // busca por palavras/códigos soltos (ex.: "A1566", "serie 6 44mm"): só aceita se identificar um único modelo
  const parciais = cands.filter((p) => modeloCombina(p.modelo, modelo))
  const porMarca = norm(marca) === 'outros' ? parciais : parciais.filter((p) => norm(p.marca) === norm(marca))
  const lista = porMarca.length ? porMarca : parciais
  return lista.length === 1 ? lista[0] : undefined
}

export function valorAuto(p: Preco | undefined, servico: string): number | undefined {
  if (!p) return undefined
  const par = Object.entries(SERVICO_CHAVE).find(([nome]) => norm(nome) === norm(servico))
  if (!par) return undefined
  // Relógio: "Troca de Vidro" puxa o valor existente (sem ou com touch), conforme a tabela do modelo
  if (p.tipo === 'Relógio' && norm(servico) === 'troca de vidro') {
    const rv = p.vidroSemTouch ?? p.vidroComTouch
    return rv == null ? undefined : rv
  }
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

/** Aviso de "aparelho pronto" para um serviço. Variáveis: {cliente} {loja} {aparelho} {servico} {valor} {data} */
export function formatarMensagemPronto(s: Servico, cfg: MasterConfig = MASTER_CONFIG_PADRAO): string {
  const tpl = cfg.whatsPronto || MASTER_CONFIG_PADRAO.whatsPronto
  const vars: Record<string, string> = {
    cliente: s.lojista,
    loja: cfg.nomeLoja,
    aparelho: nomeAparelho(s),
    servico: s.servico,
    valor: brl(s.valor),
    data: fmtData(s.dataEntrada),
  }
  return Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), tpl)
}

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
