export type Tipo = 'Celular' | 'Tablet' | 'Relógio'
export type Marca = 'Apple' | 'Samsung' | 'Motorola' | 'Xiaomi' | 'Outros'
export type StatusBancada = 'Em andamento' | 'Pronto' | 'Entregue'
export type StatusFin = 'Pendente' | 'Pago'

export const TIPOS: Tipo[] = ['Celular', 'Tablet', 'Relógio']
export const MARCAS: Marca[] = ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'Outros']
export const STATUS_BANCADA: StatusBancada[] = ['Em andamento', 'Pronto', 'Entregue']

export const SERVICOS_POR_TIPO: Record<Tipo, string[]> = {
  Celular: [
    'Troca de Vidro',
    'Tampa Traseira – Só Queimar',
    'Tampa Traseira – Peça Solta',
    'Tampa Traseira – Troca Completa',
  ],
  Tablet: ['Troca de Vidro'],
  Relógio: ['Vidro S/ Touch', 'Vidro C/ Touch'],
}

export type PrecoKey =
  | 'vidro'
  | 'tampaQueimar'
  | 'tampaSolta'
  | 'tampaCompleta'
  | 'vidroSemTouch'
  | 'vidroComTouch'

export const SERVICO_CHAVE: Record<string, PrecoKey> = {
  'Troca de Vidro': 'vidro',
  'Tampa Traseira – Só Queimar': 'tampaQueimar',
  'Tampa Traseira – Peça Solta': 'tampaSolta',
  'Tampa Traseira – Troca Completa': 'tampaCompleta',
  'Vidro S/ Touch': 'vidroSemTouch',
  'Vidro C/ Touch': 'vidroComTouch',
}

export const COLUNAS_PRECO: { key: PrecoKey; titulo: string; tipos: Tipo[] }[] = [
  { key: 'vidro', titulo: 'Vidro', tipos: ['Celular', 'Tablet'] },
  { key: 'tampaQueimar', titulo: 'Tampa: Só Queimar', tipos: ['Celular'] },
  { key: 'tampaSolta', titulo: 'Tampa: Peça Solta', tipos: ['Celular'] },
  { key: 'tampaCompleta', titulo: 'Tampa: Completa', tipos: ['Celular'] },
  { key: 'vidroSemTouch', titulo: 'Vidro S/ Touch', tipos: ['Relógio'] },
  { key: 'vidroComTouch', titulo: 'Vidro C/ Touch', tipos: ['Relógio'] },
]

export interface ItemServico {
  servico: string
  valor: number
}

export interface Servico {
  id: string
  dataEntrada: string // YYYY-MM-DD
  lojista: string // "Cliente" na interface (nome do campo mantido por compatibilidade com dados já salvos)
  telefone: string
  tipo: string
  marca: string
  modelo: string
  servico: string // nomes dos serviços unidos por " + "
  itens?: ItemServico[] // detalhamento quando há mais de um serviço no aparelho
  valor: number // total do aparelho
  obs: string
  statusBancada: StatusBancada
  statusFin: StatusFin
  dataPagamento: string
}

export interface Pedido {
  id: string
  data: string
  fornecedor: string
  descricao: string
  valor: number
}

export interface Preco {
  id: string
  tipo: Tipo
  marca: Marca
  modelo: string
  vidro?: number
  tampaQueimar?: number
  tampaSolta?: number
  tampaCompleta?: number
  vidroSemTouch?: number
  vidroComTouch?: number
}

export interface Lojista {
  id: string
  nome: string
  telefone: string
}

export interface MasterConfig {
  nomeLoja: string
  subtituloLogin: string
  abaInicio: string
  abaServicos: string
  abaPedidos: string
  abaFinanceiro: string
  abaPrecos: string
  labelCliente: string
  labelStatus: string
  labelObs: string
  whatsCabecalho: string
  whatsLinha: string
  whatsTotal: string
  whatsRodape: string
  pinMaster: string
}

export const MASTER_CONFIG_PADRAO: MasterConfig = {
  nomeLoja: 'IPhoncel',
  subtituloLogin: 'Gestão do laboratório · acesso restrito',
  abaInicio: 'Início',
  abaServicos: 'Serviços',
  abaPedidos: 'Pedidos & Insumos',
  abaFinanceiro: 'Financeiro',
  abaPrecos: 'Tabela de Preços',
  labelCliente: 'Cliente',
  labelStatus: 'Status',
  labelObs: 'Observação',
  whatsCabecalho: 'Olá, {cliente}! 👋\nSegue o resumo dos serviços pendentes no laboratório *{loja}*:',
  whatsLinha: '{numero}) {data} – {aparelho} – {servico} – {valor}',
  whatsTotal: '*Total a pagar: {total}*',
  whatsRodape: 'Qualquer dúvida é só chamar. Obrigado pela parceria! 🙏',
  pinMaster: '1234',
}
