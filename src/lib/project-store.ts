import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
  id: string
  name: string
  description?: string
  templateIds: string[]                                    // 关联的模板ID列表
  datasetId?: string                                       // 预绑定的数据集
  fieldBindings: Record<string, Record<string, string>>    // { templateId: { varName: fieldPath } }
  createdAt: number
  updatedAt: number
}

interface ProjectStore {
  projects: Project[]
  addProject: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateProject: (id: string, partial: Partial<Project>) => void
  removeProject: (id: string) => void
  getProject: (id: string) => Project | undefined
}

function genId() {
  return 'proj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const BUILTIN_PROJECTS: Project[] = [
  {
    id: 'proj_rubric_audit',
    name: 'Rubric 质量审核',
    description: '综合审查 + 重复情况审查 + 题目重复度审查',
    templateIds: ['builtin_rubric_review', 'builtin_rubric_overlap', 'builtin_topic_similarity'],
    fieldBindings: {},
    createdAt: 0,
    updatedAt: 0,
  },
]

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: BUILTIN_PROJECTS,

      addProject: (p) => {
        const id = genId()
        const proj: Project = { ...p, id, createdAt: Date.now(), updatedAt: Date.now() }
        set((s) => ({ projects: [proj, ...s.projects] }))
        return id
      },

      updateProject: (id, partial) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...partial, updatedAt: Date.now() } : p
          ),
        }))
      },

      removeProject: (id) => {
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
      },

      getProject: (id) => get().projects.find((p) => p.id === id),
    }),
    {
      name: 'xthy-projects',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const existIds = new Set(state.projects.map((p) => p.id))
        for (const b of BUILTIN_PROJECTS) {
          if (!existIds.has(b.id)) {
            state.projects.push(b)
          }
        }
      },
    }
  )
)
