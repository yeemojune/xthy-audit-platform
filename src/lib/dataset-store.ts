import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JsonValueType } from './json-flatten'

export interface DatasetField {
  path: string
  label: string
  type: JsonValueType
  sample: unknown
}

export interface Dataset {
  id: string
  name: string
  source: 'excel' | 'json'
  fileName?: string
  uploadAt: number
  fields: DatasetField[]
  rows: Record<string, unknown>[]    // 扁平后行数据，key=path
  rawJson?: unknown                  // JSON 模式保留原结构（用于查看）
  rowsCount: number
}

interface DatasetStore {
  datasets: Dataset[]
  addDataset: (d: Omit<Dataset, 'id' | 'uploadAt' | 'rowsCount'>) => string
  updateDataset: (id: string, partial: Partial<Dataset>) => void
  removeDataset: (id: string) => void
  getDataset: (id: string) => Dataset | undefined
}

function genId() {
  return 'ds_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const useDatasetStore = create<DatasetStore>()(
  persist(
    (set, get) => ({
      datasets: [],

      addDataset: (d) => {
        const id = genId()
        const dataset: Dataset = {
          ...d,
          id,
          uploadAt: Date.now(),
          rowsCount: d.rows.length,
        }
        set((s) => ({ datasets: [dataset, ...s.datasets] }))
        return id
      },

      updateDataset: (id, partial) => {
        set((s) => ({
          datasets: s.datasets.map((d) => (d.id === id ? { ...d, ...partial } : d)),
        }))
      },

      removeDataset: (id) => {
        set((s) => ({ datasets: s.datasets.filter((d) => d.id !== id) }))
      },

      getDataset: (id) => get().datasets.find((d) => d.id === id),
    }),
    { name: 'xthy-datasets', version: 1 }
  )
)
