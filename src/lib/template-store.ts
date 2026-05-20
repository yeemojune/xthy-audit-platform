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
  builtin?: boolean                // 是否为内置模板（不可删除）
  createdAt: number
  updatedAt: number
}

interface TemplateStore {
  templates: PromptTemplate[]
  addTemplate: (t: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTemplate: (id: string, partial: Partial<PromptTemplate>) => void
  removeTemplate: (id: string) => void
  getTemplate: (id: string) => PromptTemplate | undefined
}

function genId() {
  return 'tpl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const BUILTIN_TEMPLATES: PromptTemplate[] = [
  {
    id: 'builtin_rubric_score',
    name: 'Rubric 评分（默认）',
    description: '依据评分标准对模型回答打分，输出分数+理由',
    content:
      '你是一个严谨的数据审核专家。请依据下面的评分标准，对回答进行评分。\n\n' +
      '问题：{{question}}\n\n' +
      '评分标准：{{rubric}}\n\n' +
      '模型回答：{{answer}}\n\n' +
      '请给出 0-10 的整数分数和简洁的评分理由。',
    variables: ['question', 'rubric', 'answer'],
    outputSchema: [
      { name: 'score', type: 'number', description: '0-10 分', required: true },
      { name: 'reason', type: 'string', description: '评分理由', required: true },
    ],
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin_overlap_check',
    name: 'Rubric 重叠判定',
    description: '判断两条评分标准是否存在语义重叠',
    content:
      '请判断以下两条评分标准是否在含义上存在重叠或冗余。\n\n' +
      '标准 A：{{rubricA}}\n\n' +
      '标准 B：{{rubricB}}\n\n' +
      '请回答是否重叠及理由。',
    variables: ['rubricA', 'rubricB'],
    outputSchema: [
      { name: 'overlap', type: 'boolean', description: '是否存在重叠', required: true },
      { name: 'reason', type: 'string', description: '判断理由', required: true },
    ],
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin_classify',
    name: '文本分类（自定义类别）',
    description: '把文本分类到指定类别中',
    content:
      '请把下面的文本分类到给定类别中的一个。\n\n' +
      '类别：{{categories}}\n\n' +
      '文本：{{text}}',
    variables: ['categories', 'text'],
    outputSchema: [
      { name: 'category', type: 'string', description: '所属类别', required: true },
      { name: 'confidence', type: 'number', description: '置信度 0-1' },
    ],
    builtin: true,
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
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id || t.builtin) }))
      },

      getTemplate: (id) => get().templates.find((t) => t.id === id),
    }),
    {
      name: 'xthy-templates',
      version: 1,
      // 启动时确保内置模板始终存在（避免用户清空）
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const existIds = new Set(state.templates.map((t) => t.id))
        for (const b of BUILTIN_TEMPLATES) {
          if (!existIds.has(b.id)) {
            state.templates.push(b)
          }
        }
      },
    }
  )
)
