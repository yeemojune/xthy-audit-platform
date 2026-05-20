import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ApiConfig {
  id: string
  name: string
  apiUrl: string
  apiKey: string
  model: string
  concurrency: number
}

interface ConfigStore {
  configs: ApiConfig[]
  activeConfigId: string
  addConfig: (config: Omit<ApiConfig, 'id'>) => void
  updateConfig: (id: string, partial: Partial<ApiConfig>) => void
  removeConfig: (id: string) => void
  setActiveConfig: (id: string) => void
  // 便捷获取当前激活配置
  getActiveConfig: () => ApiConfig
}

const DEFAULT_CONFIG: ApiConfig = {
  id: 'default',
  name: '默认 (Routify Claude)',
  apiUrl: 'https://routify.alibaba-inc.com/protocol/anthropic/v1/messages',
  apiKey: 'sk-9eba1adb38fa4cb1af5dca05f58f8472',
  model: 'claude-sonnet-4-6-20260217',
  concurrency: 10,
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      configs: [DEFAULT_CONFIG],
      activeConfigId: 'default',

      addConfig: (config) => {
        const newConfig = { ...config, id: generateId() }
        set((s) => ({ configs: [...s.configs, newConfig] }))
      },

      updateConfig: (id, partial) => {
        set((s) => ({
          configs: s.configs.map(c => c.id === id ? { ...c, ...partial } : c)
        }))
      },

      removeConfig: (id) => {
        set((s) => {
          const filtered = s.configs.filter(c => c.id !== id)
          const activeId = s.activeConfigId === id
            ? (filtered[0]?.id || 'default')
            : s.activeConfigId
          return { configs: filtered, activeConfigId: activeId }
        })
      },

      setActiveConfig: (id) => set({ activeConfigId: id }),

      getActiveConfig: () => {
        const state = get()
        return state.configs.find(c => c.id === state.activeConfigId) || state.configs[0] || DEFAULT_CONFIG
      },
    }),
    { 
      name: 'xthy-api-config',
      version: 1,
      // 迁移：v0 -> v1 默认并发从 20 调为 10
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { configs?: ApiConfig[]; activeConfigId?: string }
        if (version < 1 && state?.configs) {
          state.configs = state.configs.map(c =>
            c.concurrency === 20 ? { ...c, concurrency: 10 } : c
          )
        }
        return state
      },
    }
  )
)

// 向后兼容：导出 config 属性的 hook
export function useActiveConfig(): ApiConfig {
  const { configs, activeConfigId } = useConfigStore()
  return configs.find(c => c.id === activeConfigId) || configs[0] || DEFAULT_CONFIG
}
