import { useCallback, useEffect, useState } from 'react'
import { Modo, Tabela, listAll, saveMany as dbSaveMany, saveRow, deleteRow } from './db'

export function useTable<T extends { id: string }>(modo: Modo, tabela: Tabela, seed?: () => T[]) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      setLoading(true)
      try {
        let rows = await listAll<T>(modo, tabela)
        if (rows.length === 0 && seed) {
          rows = seed()
          await dbSaveMany(modo, tabela, rows)
        }
        if (ativo) setItems(rows)
      } catch (e: any) {
        console.error(e)
        alert(`Erro ao carregar "${tabela}": ${e?.message || e}`)
      } finally {
        if (ativo) setLoading(false)
      }
    })()
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, tabela])

  const save = useCallback(
    async (row: T) => {
      setItems((p) => (p.some((x) => x.id === row.id) ? p.map((x) => (x.id === row.id ? row : x)) : [...p, row]))
      try {
        await saveRow(modo, tabela, row)
      } catch (e: any) {
        alert(`Erro ao salvar: ${e?.message || e}`)
      }
    },
    [modo, tabela]
  )

  const saveMany = useCallback(
    async (rows: T[]) => {
      setItems((p) => {
        const mapa = new Map(p.map((x) => [x.id, x]))
        rows.forEach((r) => mapa.set(r.id, r))
        return [...mapa.values()]
      })
      try {
        await dbSaveMany(modo, tabela, rows)
      } catch (e: any) {
        alert(`Erro ao salvar: ${e?.message || e}`)
      }
    },
    [modo, tabela]
  )

  const remove = useCallback(
    async (id: string) => {
      setItems((p) => p.filter((x) => x.id !== id))
      try {
        await deleteRow(modo, tabela, id)
      } catch (e: any) {
        alert(`Erro ao excluir: ${e?.message || e}`)
      }
    },
    [modo, tabela]
  )

  return { items, loading, save, saveMany, remove }
}
