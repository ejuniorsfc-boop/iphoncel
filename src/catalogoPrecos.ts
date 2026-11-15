import { Marca, Preco, Tipo } from './types'
import { CATALOGO_PRECOS } from './catalogoOficial'

/**
 * CATÁLOGO OFICIAL IPhoncel.
 * Os dados originais ficam em `catalogoOficial.ts` (CATALOGO_PRECOS), exatamente como enviados.
 * Este arquivo converte essa tabela para o formato usado pelo sistema.
 */
export { CATALOGO_PRECOS }

type Item = Omit<Preco, 'id'>

export const chaveModelo = (tipo: Tipo, marca: Marca, modelo: string) =>
  `${tipo}|${marca}|${modelo}`.toLowerCase().replace(/\s+/g, ' ').trim()

const semNull = (n: number | null | undefined) => (n == null ? undefined : n)

// "iPhone 12/12 Pro" -> ["iPhone 12", "iPhone 12 Pro"], para que cada modelo seja encontrado na busca
function expandirApple(modelo: string): string[] {
  if (!modelo.includes('/')) return [modelo]
  return modelo.split('/').map((p, i) => {
    const t = p.trim()
    return i === 0 || /^iphone/i.test(t) ? t : `iPhone ${t}`
  })
}

export function montarCatalogo(): Item[] {
  const mapa = new Map<string, Item>()

  const guardar = (item: Item) => {
    const k = chaveModelo(item.tipo, item.marca, item.modelo)
    mapa.set(k, { ...(mapa.get(k) || {}), ...item })
  }

  // Celulares: troca de vidro
  ;(Object.keys(CATALOGO_PRECOS.celular) as Marca[]).forEach((marca) => {
    ;(CATALOGO_PRECOS.celular as Record<string, { modelo: string; valor: number }[]>)[marca].forEach((i) => {
      const nomes = marca === 'Apple' ? expandirApple(i.modelo) : [i.modelo]
      nomes.forEach((modelo) => guardar({ tipo: 'Celular', marca, modelo, vidro: i.valor }))
    })
  })

  // iPhones: tampa traseira (só queimar / peça solta / troca completa)
  CATALOGO_PRECOS.tampaTraseiraApple.forEach((i) =>
    guardar({
      tipo: 'Celular',
      marca: 'Apple',
      modelo: i.modelo,
      tampaQueimar: semNull(i.soQueimar),
      tampaSolta: semNull(i.pecaSolta),
      tampaCompleta: semNull(i.tampaCompleta),
    })
  )

  // Apple Watch
  CATALOGO_PRECOS.relogioAppleWatch.forEach((i) =>
    guardar({
      tipo: 'Relógio',
      marca: 'Apple',
      modelo: `Apple Watch ${i.modelo}`,
      vidroSemTouch: semNull(i.semTouch),
      vidroComTouch: semNull(i.comTouch),
    })
  )

  // Tablets
  ;(Object.keys(CATALOGO_PRECOS.tablet) as Marca[]).forEach((marca) => {
    ;(CATALOGO_PRECOS.tablet as Record<string, { modelo: string; valor: number }[]>)[marca].forEach((i) =>
      guardar({ tipo: 'Tablet', marca, modelo: i.modelo, vidro: i.valor })
    )
  })

  // remove campos undefined (para não gravar chaves vazias)
  return [...mapa.values()].map((p) => JSON.parse(JSON.stringify(p)))
}

export const catalogoInicial: Item[] = montarCatalogo()

// ids "cat-N" identificam linhas vindas do catálogo oficial
export const gerarCatalogo = (): Preco[] => catalogoInicial.map((p, i) => ({ ...p, id: `cat-${i + 1}` }))
