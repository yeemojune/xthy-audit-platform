import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PromptTestResult {
  index: number
  input: string                    // 替换后的实际输入（变量已渲染）
  rawInput: string                 // 原始输入（未替换前的项）
  output?: string
  error?: string
  durationMs?: number
}

export interface PromptVersion {
  id: string
  versionName: string              // 如 v1 / v2 / 用户起的名
  promptContent: string
  systemPrompt?: string
  testType: 'json' | 'text'
  testInputs: string[]             // 固定时的测试 inputs
  results: PromptTestResult[]      // 固定时的结果快照
  notes?: string
  createdAt: number
}

interface PromptTestStore {
  // 当前草稿
  draftPrompt: string
  draftSystem: string
  draftTestType: 'json' | 'text'
  draftTestText: string

  // 历史固定版本
  versions: PromptVersion[]

  setDraftPrompt: (v: string) => void
  setDraftSystem: (v: string) => void
  setDraftTestType: (v: 'json' | 'text') => void
  setDraftTestText: (v: string) => void
  loadDraftFromVersion: (id: string) => void

  pinAsVersion: (data: Omit<PromptVersion, 'id' | 'createdAt'>) => string
  removeVersion: (id: string) => void
  updateVersion: (id: string, partial: Partial<PromptVersion>) => void
  getVersion: (id: string) => PromptVersion | undefined
}

function genId() {
  return 'ver_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const DEFAULT_PROMPT =
  '你是一个数据评测助手。请阅读输入的内容，判断质量并简要点评。\n\n输入：\n{{input}}\n\n请给出 1-2 句中文点评。'

export const usePromptTestStore = create<PromptTestStore>()(
  persist(
    (set, get) => ({
      draftPrompt: DEFAULT_PROMPT,
      draftSystem: '',
      draftTestType: 'text',
      draftTestText: '',
      versions: [],

      setDraftPrompt: (v) => set({ draftPrompt: v }),
      setDraftSystem: (v) => set({ draftSystem: v }),
      setDraftTestType: (v) => set({ draftTestType: v }),
      setDraftTestText: (v) => set({ draftTestText: v }),

      loadDraftFromVersion: (id) => {
        const v = get().versions.find((x) => x.id === id)
        if (!v) return
        set({
          draftPrompt: v.promptContent,
          draftSystem: v.systemPrompt ?? '',
          draftTestType: v.testType,
          draftTestText:
            v.testType === 'json'
              ? JSON.stringify(v.testInputs.map((s) => safeParse(s)), null, 2)
              : v.testInputs.join('\n'),
        })
      },

      pinAsVersion: (data) => {
        const id = genId()
        const version: PromptVersion = { ...data, id, createdAt: Date.now() }
        set((s) => ({ versions: [version, ...s.versions] }))
        return id
      },

      removeVersion: (id) => {
        set((s) => ({ versions: s.versions.filter((v) => v.id !== id) }))
      },

      updateVersion: (id, partial) => {
        set((s) => ({
          versions: s.versions.map((v) => (v.id === id ? { ...v, ...partial } : v)),
        }))
      },

      getVersion: (id) => get().versions.find((v) => v.id === id),
    }),
    { name: 'xthy-prompt-test', version: 1 }
  )
)

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}
