import { supabase } from './supabase'

export type Modo = 'local' | 'supabase'
export type Tabela = 'servicos' | 'pedidos' | 'precos' | 'lojistas'

const chave = (t: Tabela) => `iphoncel:${t}`

export async function listAll<T extends { id: string }>(modo: Modo, tabela: Tabela): Promise<T[]> {
  if (modo === 'local' || !supabase) {
    try {
      return JSON.parse(localStorage.getItem(chave(tabela)) || '[]')
    } catch {
      return []
    }
  }
  const { data, error } = await supabase.from(tabela).select('id,data')
  if (error) throw error
  return (data || []).map((r: any) => ({ ...r.data, id: r.id }))
}

export async function saveMany<T extends { id: string }>(modo: Modo, tabela: Tabela, rows: T[]) {
  if (rows.length === 0) return
  if (modo === 'local' || !supabase) {
    const atual: T[] = await listAll<T>('local', tabela)
    const mapa = new Map(atual.map((x) => [x.id, x]))
    rows.forEach((r) => mapa.set(r.id, r))
    localStorage.setItem(chave(tabela), JSON.stringify([...mapa.values()]))
    return
  }
  for (let i = 0; i < rows.length; i += 500) {
    const lote = rows.slice(i, i + 500).map((r) => ({ id: r.id, data: r, updated_at: new Date().toISOString() }))
    const { error } = await supabase.from(tabela).upsert(lote)
    if (error) throw error
  }
}

export async function saveRow<T extends { id: string }>(modo: Modo, tabela: Tabela, row: T) {
  await saveMany(modo, tabela, [row])
}

export async function deleteRow(modo: Modo, tabela: Tabela, id: string) {
  if (modo === 'local' || !supabase) {
    const atual = await listAll<any>('local', tabela)
    localStorage.setItem(chave(tabela), JSON.stringify(atual.filter((x) => x.id !== id)))
    return
  }
  const { error } = await supabase.from(tabela).delete().eq('id', id)
  if (error) throw error
}
