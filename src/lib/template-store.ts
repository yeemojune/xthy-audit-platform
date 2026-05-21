import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SchemaField } from './schema-validator'

export type { SchemaField }

export interface PromptTemplate {
  id: string
  name: string
  description?: string
  content: string                  // 含 {{var}} 占位符的 prompt
  variables: string[]              // 自动从 content 提取
  outputSchema: SchemaField[]
  systemPrompt?: string
  type: 'llm' | 'similarity'      // 执行类型
  projectId?: string               // 归属项目
  createdAt: number
  updatedAt: number
}

interface TemplateStore {
  templates: PromptTemplate[]
  addTemplate: (t: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTemplate: (id: string, partial: Partial<PromptTemplate>) => void
  removeTemplate: (id: string) => void
  getTemplate: (id: string) => PromptTemplate | undefined
  getByProject: (projectId: string) => PromptTemplate[]
}

function genId() {
  return 'tpl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const RUBRIC_REVIEW_PROMPT = `## 背景
rubric指的是对题目中的交付物要求作量化的拆解项，以确保能够通过拆分的要求项，**不重复**、**不遗漏**、**不错误**的量化要求项，构建对交付的量化指标。

## 任务说明
你的任务有三项：
1.分析题目的交付物要求中，是否存在rubric项未覆盖的部分。
2.分析当前的rubric项中，是否存在与题目中明确指出的量化指标不同的地方。注：量化指标指的是明确说明了特定的数字的指标。
3.分析当前的rubric项中，是否存在自身的前后矛盾与重复。

## 输入
题目：
{{题目_final}}

Rubric：
{{rubric_final}}

## 输出规范
问题类型：未覆盖题目/与题目量化指标冲突/前后矛盾/前后重复
rubric项：[] xxx
问题描述：xxx

## 注意事项
1.仅列出问题项即可。
2.务必列出所有问题项，没有遗漏。
3.如果题目中未提及特定指标要求，而rubric项中提及了，请忽略它。
4.如果题目中提及了特定指标要求，而rubric中与该指标不**数值**不符，请一定要明确说明。`

const RUBRIC_OVERLAP_PROMPT = `## 任务
请系统地检查以下rubric评分项之间是否存在重叠风险。

## rubric内容
{{rubric_final}}

## 输出规范
对每组重叠，输出：

重叠组N：
- rubric项A：[+X] xxx
- rubric项B：[+X] xxx
- 重叠说明：xxx

## 注意事项
1.重叠指的是两个或多个评分项在评估时可能对同一具体表现重复给分。
2.仅关注实质性重叠，忽略措辞相似但评估维度确实不同的项。
3.如无重叠，输出"未发现重叠问题"。`

const BUILTIN_TEMPLATES: PromptTemplate[] = [
  {
    id: 'builtin_rubric_review',
    name: 'Rubric 综合审查',
    description: '检查rubric是否完整覆盖题目、量化指标是否一致、是否存在前后矛盾或重复',
    content: RUBRIC_REVIEW_PROMPT,
    variables: ['题目_final', 'rubric_final'],
    outputSchema: [
      { name: 'issues', type: 'string', description: '问题列表', required: true },
    ],
    type: 'llm',
    projectId: 'proj_rubric_audit',
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin_rubric_overlap',
    name: 'Rubric 重复情况审查',
    description: '检查同一份rubric内部各评分项之间是否存在语义重叠或重复给分',
    content: RUBRIC_OVERLAP_PROMPT,
    variables: ['rubric_final'],
    outputSchema: [
      { name: 'overlaps', type: 'string', description: '重叠组列表', required: true },
    ],
    type: 'llm',
    projectId: 'proj_rubric_audit',
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin_topic_similarity',
    name: '题目重复度审查',
    description: '使用TF-IDF向量相似度检查多个题目之间的重复程度',
    content: '本模板使用本地向量相似度计算，不调用LLM。\n将所有行的「{{题目_final}}」字段进行TF-IDF向量化后两两计算余弦相似度，输出高相似度对。',
    variables: ['题目_final'],
    outputSchema: [
      { name: 'pairs', type: 'string', description: '高相似度对列表', required: true },
    ],
    type: 'similarity',
    projectId: 'proj_rubric_audit',
    createdAt: 0,
    updatedAt: 0,
  },
]

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: BUILTIN_TEMPLATES,

      addTemplate: (t) => {
        const id = genId()
        const tpl: PromptTemplate = { ...t, id, createdAt: Date.now(), updatedAt: Date.now() }
        set((s) => ({ templates: [tpl, ...s.templates] }))
        return id
      },

      updateTemplate: (id, partial) => {
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, ...partial, updatedAt: Date.now() } : t
          ),
        }))
      },

      removeTemplate: (id) => {
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
      },

      getTemplate: (id) => get().templates.find((t) => t.id === id),

      getByProject: (projectId) => get().templates.filter((t) => t.projectId === projectId),
    }),
    {
      name: 'xthy-templates',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          // v1->v2: 迁移旧模板，添加 type 字段
          const state = persisted as { templates?: PromptTemplate[] }
          if (state?.templates) {
            state.templates = state.templates
              .filter((t) => !t.id.startsWith('builtin_'))
              .map((t) => ({ ...t, type: t.type || 'llm' }))
            state.templates.push(...BUILTIN_TEMPLATES)
          }
        }
        return persisted
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const existIds = new Set(state.templates.map((t) => t.id))
        for (const b of BUILTIN_TEMPLATES) {
          if (!existIds.has(b.id)) {
            state.templates.push(b)
          }
        }
        // 确保所有模板都有 type 字段
        state.templates = state.templates.map((t) => ({ ...t, type: t.type || 'llm' }))
      },
    }
  )
)
