import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BindingItem {
  variable: string                       // 模板变量名
  mode: 'field' | 'constant'
  fieldPath?: string                     // mode=field 时的数据集字段路径
  constantValue?: string                 // mode=constant 时的固定值
}

export interface EvalResult {
  rowIndex: number
  output?: Record<string, unknown>       // 解析+校验后的结构化输出
  raw?: string                           // LLM 原始返回
  error?: string                         // 错误信息（解析失败/网络/校验）
  validationErrors?: string[]            // schema 校验问题（不致命）
  durationMs?: number
}

export type EvalStatus = 'pending' | 'running' | 'paused' | 'done' | 'error'

export interface EvalTask {
  id: string
  name: string
  datasetId: string
  templateId: string
  bindings: BindingItem[]
  apiConfigId: string
  status: EvalStatus
  progress: { total: number; done: number; failed: number }
  results: EvalResult[]
  rowCount: number
  startTime?: number
  endTime?: number
  createdAt: number
}

interface TaskStore {
  tasks: EvalTask[]
  addTask: (t: Omit<EvalTask, 'id' | 'createdAt'>) => string
  updateTask: (id: string, partial: Partial<EvalTask>) => void
  appendResult: (id: string, result: EvalResult) => void
  removeTask: (id: string) => void
  getTask: (id: string) => EvalTask | undefined
}

function genId() {
  return 'task_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (t) => {
        const id = genId()
        const task: EvalTask = { ...t, id, createdAt: Date.now() }
        set((s) => ({ tasks: [task, ...s.tasks] }))
        return id
      },

      updateTask: (id, partial) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...partial } : t)),
        }))
      },

      appendResult: (id, result) => {
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t
            // 替换或追加（按 rowIndex 唯一）
            const existIdx = t.results.findIndex((r) => r.rowIndex === result.rowIndex)
            const results = [...t.results]
            if (existIdx >= 0) results[existIdx] = result
            else results.push(result)
            const failed = results.filter((r) => r.error).length
            return {
              ...t,
              results,
              progress: { total: t.progress.total, done: results.length, failed },
            }
          }),
        }))
      },

      removeTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      },

      getTask: (id) => get().tasks.find((t) => t.id === id),
    }),
    { name: 'xthy-tasks', version: 1 }
  )
)
