import * as XLSX from 'xlsx'
import { Lojista, Pedido, Preco, Servico } from '../types'
import { hoje, norm, padronizarModelo, soma } from './utils'

const MOEDA = '"R$" #,##0.00'

const dataBR = (iso?: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type Linha = Record<string, string | number>

/** Cria uma aba a partir de linhas, aplicando formato de moeda e largura de colunas. */
function aba(linhas: Linha[], cabecalho: string[], moeda: string[] = [], larguras?: number[]) {
  const ws: any = XLSX.utils.json_to_sheet(linhas, { header: cabecalho })
  moeda.forEach((nome) => {
    const c = cabecalho.indexOf(nome)
    if (c < 0) return
    for (let r = 1; r <= linhas.length; r++) {
      const cel = ws[XLSX.utils.encode_cell({ r, c })]
      if (cel && typeof cel.v === 'number') cel.z = MOEDA
    }
  })
  ws['!cols'] = (larguras || cabecalho.map((h) => Math.max(12, h.length + 2))).map((wch) => ({ wch }))
  return ws
}

// ---------------------------------------------------------------------------
// Abas reutilizadas
// ---------------------------------------------------------------------------
const COLS_SERVICO = [
  'Data de entrada', 'Cliente', 'Telefone', 'Tipo', 'Marca', 'Modelo', 'Serviço',
  'Valor', 'Status', 'Financeiro', 'Data do pagamento', 'Observação',
]

const linhaServico = (s: Servico): Linha => ({
  'Data de entrada': dataBR(s.dataEntrada),
  Cliente: s.lojista,
  Telefone: s.telefone || '',
  Tipo: s.tipo,
  Marca: s.marca,
  Modelo: s.modelo,
  Serviço: s.servico,
  Valor: s.valor,
  Status: s.statusBancada,
  Financeiro: s.statusFin,
  'Data do pagamento': dataBR(s.dataPagamento),
  Observação: s.obs || '',
})

const ordenar = (itens: Servico[]) =>
  [...itens].sort((a, b) => a.dataEntrada.localeCompare(b.dataEntrada) || a.lojista.localeCompare(b.lojista, 'pt-BR'))

const abaServicos = (itens: Servico[]) =>
  aba(ordenar(itens).map(linhaServico), COLS_SERVICO, ['Valor'], [15, 24, 16, 10, 12, 28, 42, 13, 14, 12, 18, 30])

const abaPedidos = (itens: Pedido[]) =>
  aba(
    [...itens]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((p) => ({ Data: dataBR(p.data), Fornecedor: p.fornecedor, Descrição: p.descricao, Valor: p.valor })),
    ['Data', 'Fornecedor', 'Descrição', 'Valor'],
    ['Valor'],
    [13, 26, 46, 13]
  )

/** Quanto cada cliente deve hoje (todas as datas). */
function abaPendencias(todos: Servico[]) {
  const mapa = new Map<string, { cliente: string; telefone: string; qtd: number; total: number; desde: string }>()
  todos
    .filter((s) => s.statusFin === 'Pendente')
    .forEach((s) => {
      const k = norm(s.lojista)
      const g = mapa.get(k) || { cliente: s.lojista, telefone: '', qtd: 0, total: 0, desde: s.dataEntrada }
      g.qtd += 1
      g.total += s.valor
      if (!g.telefone && s.telefone) g.telefone = s.telefone
      if (s.dataEntrada < g.desde) g.desde = s.dataEntrada
      mapa.set(k, g)
    })
  const grupos = [...mapa.values()].sort((a, b) => b.total - a.total)
  const linhas: Linha[] = grupos.map((g) => ({
    Cliente: g.cliente,
    Telefone: g.telefone,
    'Aparelhos pendentes': g.qtd,
    'Pendente desde': dataBR(g.desde),
    'Total a receber': g.total,
  }))
  if (grupos.length) {
    linhas.push({
      Cliente: 'TOTAL',
      Telefone: '',
      'Aparelhos pendentes': soma(grupos.map((g) => g.qtd)),
      'Pendente desde': '',
      'Total a receber': soma(grupos.map((g) => g.total)),
    })
  }
  return aba(linhas, ['Cliente', 'Telefone', 'Aparelhos pendentes', 'Pendente desde', 'Total a receber'], ['Total a receber'], [28, 16, 20, 16, 18])
}

// ---------------------------------------------------------------------------
// Fechamento do mês / período (botão no Financeiro)
// ---------------------------------------------------------------------------
export interface DadosFechamento {
  slug: string // vai no nome do arquivo (ex.: 2026-11)
  rotulo: string // ex.: "Novembro de 2026" ou "01/11/2026 a 15/11/2026"
  ini: string
  fim: string
  todos: Servico[] // todos os serviços (para as pendências)
  entradas: Servico[] // serviços que entraram no período
  pagos: Servico[] // serviços pagos no período (regime de caixa)
  pedidos: Pedido[] // pedidos/insumos do período
  ind: { recebido: number; producao: number; aReceber: number; insumos: number; lucro: number }
}

export function exportarFechamento(d: DadosFechamento) {
  const wb = XLSX.utils.book_new()

  // Resumo
  const resumo: (string | number)[][] = [
    ['Fechamento financeiro', d.rotulo],
    ['Gerado em', dataBR(hoje())],
    [],
    ['Recebido no período (caixa)', d.ind.recebido],
    ['Produção / entradas no período', d.ind.producao],
    ['A receber (total pendente, todas as datas)', d.ind.aReceber],
    ['Pedidos / insumos', d.ind.insumos],
    ['Lucro líquido real (recebido − insumos)', d.ind.lucro],
    [],
    ['Aparelhos que entraram', d.entradas.length],
    ['Pagamentos no período', d.pagos.length],
  ]
  const wsResumo: any = XLSX.utils.aoa_to_sheet(resumo)
  ;[3, 4, 5, 6, 7].forEach((r) => {
    const cel = wsResumo[XLSX.utils.encode_cell({ r, c: 1 })]
    if (cel) cel.z = MOEDA
  })
  wsResumo['!cols'] = [{ wch: 46 }, { wch: 28 }]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  XLSX.utils.book_append_sheet(wb, abaServicos(d.entradas), 'Entradas no período')
  XLSX.utils.book_append_sheet(wb, abaServicos(d.pagos), 'Recebidos no período')
  XLSX.utils.book_append_sheet(wb, abaPedidos(d.pedidos), 'Pedidos e insumos')

  // Por cliente
  const porCliente = new Map<string, { cliente: string; aparelhos: number; producao: number; recebido: number; aReceber: number }>()
  const get = (nome: string) => {
    const k = norm(nome)
    const g = porCliente.get(k) || { cliente: nome, aparelhos: 0, producao: 0, recebido: 0, aReceber: 0 }
    porCliente.set(k, g)
    return g
  }
  d.entradas.forEach((s) => {
    const g = get(s.lojista)
    g.aparelhos += 1
    g.producao += s.valor
  })
  d.pagos.forEach((s) => (get(s.lojista).recebido += s.valor))
  d.todos.filter((s) => s.statusFin === 'Pendente').forEach((s) => (get(s.lojista).aReceber += s.valor))
  const linhasCliente: Linha[] = [...porCliente.values()]
    .sort((a, b) => b.producao - a.producao || b.aReceber - a.aReceber)
    .map((g) => ({
      Cliente: g.cliente,
      'Aparelhos no período': g.aparelhos,
      'Produção no período': g.producao,
      'Recebido no período': g.recebido,
      'A receber (total)': g.aReceber,
    }))
  XLSX.utils.book_append_sheet(
    wb,
    aba(
      linhasCliente,
      ['Cliente', 'Aparelhos no período', 'Produção no período', 'Recebido no período', 'A receber (total)'],
      ['Produção no período', 'Recebido no período', 'A receber (total)'],
      [28, 20, 20, 20, 18]
    ),
    'Por cliente'
  )

  // Por modelo
  const porModelo = new Map<string, { marca: string; modelo: string; qtd: number; fat: number }>()
  d.entradas.forEach((s) => {
    const modelo = padronizarModelo(s.modelo)
    const k = `${norm(s.marca)}|${norm(modelo)}`
    const g = porModelo.get(k) || { marca: s.marca, modelo, qtd: 0, fat: 0 }
    g.qtd += 1
    g.fat += s.valor
    porModelo.set(k, g)
  })
  XLSX.utils.book_append_sheet(
    wb,
    aba(
      [...porModelo.values()]
        .sort((a, b) => b.fat - a.fat)
        .map((g) => ({ Marca: g.marca, Modelo: g.modelo, Quantidade: g.qtd, Produção: g.fat })),
      ['Marca', 'Modelo', 'Quantidade', 'Produção'],
      ['Produção'],
      [14, 32, 12, 16]
    ),
    'Por modelo'
  )

  XLSX.utils.book_append_sheet(wb, abaPendencias(d.todos), 'Pendências por cliente')

  XLSX.writeFile(wb, `iphoncel-fechamento-${d.slug}.xlsx`)
}

// ---------------------------------------------------------------------------
// Backup completo (botão no Admin Master)
// ---------------------------------------------------------------------------
export function exportarBackup(d: { servicos: Servico[]; pedidos: Pedido[]; lojistas: Lojista[]; precos: Preco[] }) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, abaServicos(d.servicos), 'Serviços')
  XLSX.utils.book_append_sheet(wb, abaPedidos(d.pedidos), 'Pedidos e insumos')
  XLSX.utils.book_append_sheet(
    wb,
    aba(
      [...d.lojistas]
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((l) => ({ Cliente: l.nome, WhatsApp: l.telefone || '' })),
      ['Cliente', 'WhatsApp'],
      [],
      [30, 18]
    ),
    'Clientes'
  )
  XLSX.utils.book_append_sheet(wb, abaPendencias(d.servicos), 'Pendências por cliente')

  // Mesmo formato aceito pelo botão "Importar Excel" da Tabela de Preços
  const COLS_PRECO = ['Tipo', 'Marca', 'Modelo', 'Vidro', 'Tampa Queimar', 'Tampa Solta', 'Tampa Completa', 'Vidro S/ Touch', 'Vidro C/ Touch']
  const num = (n?: number) => (n == null ? '' : n)
  XLSX.utils.book_append_sheet(
    wb,
    aba(
      [...d.precos]
        .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo, 'pt-BR', { numeric: true }))
        .map((p) => ({
          Tipo: p.tipo,
          Marca: p.marca,
          Modelo: p.modelo,
          Vidro: num(p.vidro),
          'Tampa Queimar': num(p.tampaQueimar),
          'Tampa Solta': num(p.tampaSolta),
          'Tampa Completa': num(p.tampaCompleta),
          'Vidro S/ Touch': num(p.vidroSemTouch),
          'Vidro C/ Touch': num(p.vidroComTouch),
        })),
      COLS_PRECO,
      COLS_PRECO.slice(3),
      [10, 12, 40, 10, 14, 12, 15, 15, 15]
    ),
    'Tabela de preços'
  )

  XLSX.writeFile(wb, `iphoncel-backup-${hoje()}.xlsx`)
}
