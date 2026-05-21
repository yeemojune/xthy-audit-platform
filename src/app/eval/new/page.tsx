'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useDatasetStore } from '@/lib/dataset-store'
import { useTemplateStore, type PromptTemplate } from '@/lib/template-store'
import { useProjectStore } from '@/lib/project-store'
import { useTaskStore, type BindingItem } from '@/lib/task-store'
import { useConfigStore } from '@/lib/config-store'
import { renderTemplate } from '@/lib/template-engine'
import { valueToString } from '@/lib/json-path'
import { ArrowLeft, ArrowRight, Play, FileSpreadsheet, FileJson, FileText, CheckCircle2, FolderKanban, Zap } from 'lucide-react'
import Link from 'next/link'

const STEPS_PROJECT = [
  { id: 1, label: '选项目' },
  { id: 2, label: '确认模板' },
  { id: 3, label: '选数据集' },
  { id: 4, label: '字段绑定' },
  { id: 5, label: '运行参数' },
]

const STEPS_QUICK = [
  { id: 1, label: '选数据集' },
  { id: 2, label: '选模板' },
  { id: 3, label: '字段绑定' },
  { id: 4, label: '运行参数' },
]

function WizardInner() {
  const router = useRouter()
  const params = useSearchParams()
  const presetProjectId = params.get('projectId') || ''
  const presetDatasetId = params.get('datasetId') || ''
  const presetTemplateId = params.get('templateId') || ''

  const datasets = useDatasetStore((s) => s.datasets)
  const templates = useTemplateStore((s) => s.templates)
  const projects = useProjectStore((s) => s.projects)
  const configs = useConfigStore((s) => s.configs)
  const activeConfigId = useConfigStore((s) => s.activeConfigId)
  const addTask = useTaskStore((s) => s.addTask)

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  // 模式：project 或 quick
  const [mode, setMode] = useState<'project' | 'quick'>(presetProjectId ? 'project' : (presetDatasetId || presetTemplateId ? 'quick' : '')  as 'project' | 'quick')
  const [step, setStep] = useState(1)

  // 项目模式状态
  const [projectId, setProjectId] = useState(presetProjectId)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])

  // 快捷模式状态
  const [quickTemplateId, setQuickTemplateId] = useState(presetTemplateId)

  // 公共状态
  const [datasetId, setDatasetId] = useState(presetDatasetId)
  // 多模板绑定：{ templateId: BindingItem[] }
  const [allBindings, setAllBindings] = useState<Record<string, BindingItem[]>>({})
  const [apiConfigId, setApiConfigId] = useState(activeConfigId)
  const [rowCount, setRowCount] = useState(0)
  const [taskName, setTaskName] = useState('')

  const dataset = useMemo(() => datasets.find((d) => d.id === datasetId), [datasets, datasetId])
  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId])

  // 当前生效的模板列表
  const activeTemplates = useMemo(() => {
    if (mode === 'project') {
      return selectedTemplateIds
        .map((id) => templates.find((t) => t.id === id))
        .filter(Boolean) as PromptTemplate[]
    }
    const t = templates.find((t) => t.id === quickTemplateId)
    return t ? [t] : []
  }, [mode, selectedTemplateIds, quickTemplateId, templates])

  // 选了项目后，初始化模板勾选
  useEffect(() => {
    if (project) {
      setSelectedTemplateIds([...project.templateIds])
    }
  }, [project])

  // 数据集或模板变了，重建绑定
  useEffect(() => {
    if (!dataset || activeTemplates.length === 0) return
    const newBindings: Record<string, BindingItem[]> = {}
    for (const tpl of activeTemplates) {
      // 复用项目预设绑定
      const presetBindings = project?.fieldBindings?.[tpl.id] || {}
      newBindings[tpl.id] = tpl.variables.map((v) => {
        const preset = presetBindings[v]
        const exact = dataset.fields.find((f) => f.path === v || f.label === v)
        return {
          variable: v,
          mode: 'field' as const,
          fieldPath: preset || exact?.path,
        }
      })
    }
    setAllBindings(newBindings)
  }, [activeTemplates.map((t) => t.id).join(','), dataset?.id])

  useEffect(() => {
    if (!dataset) return
    setRowCount(dataset.rowsCount)
    if (!taskName) {
      const prefix = mode === 'project' && project ? project.name : activeTemplates[0]?.name || ''
      setTaskName(prefix + ' · ' + dataset.name)
    }
  }, [dataset, activeTemplates.length])

  const STEPS = mode === 'project' ? STEPS_PROJECT : STEPS_QUICK
  const maxStep = STEPS.length

  function next() {
    if (mode === 'project') {
      if (step === 1 && !projectId) return alert('请选择项目')
      if (step === 2 && selectedTemplateIds.length === 0) return alert('请至少选择一个模板')
      if (step === 3 && !datasetId) return alert('请选择数据集')
    } else {
      if (step === 1 && !datasetId) return alert('请选择数据集')
      if (step === 2 && !quickTemplateId) return alert('请选择模板')
    }
    setStep(Math.min(maxStep, step + 1))
  }

  function start() {
    if (!dataset || activeTemplates.length === 0 || !apiConfigId) return
    // 为每个模板创建一个任务
    const taskIds: string[] = []
    for (const tpl of activeTemplates) {
      const bindings = allBindings[tpl.id] || []
      const name = activeTemplates.length > 1
        ? (taskName.trim() || project?.name || '') + ' / ' + tpl.name
        : taskName.trim() || tpl.name + ' · ' + dataset.name
      const id = addTask({
        name,
        datasetId: dataset.id,
        templateId: tpl.id,
        bindings,
        apiConfigId,
        status: 'pending',
        progress: { total: rowCount, done: 0, failed: 0 },
        results: [],
        rowCount,
      })
      taskIds.push(id)
    }
    // 跳转到第一个任务并自动开始
    router.push('/eval/detail?id=' + taskIds[0] + '&autostart=1')
  }

  if (!hydrated) return <div className="p-8 text-gray-400">加载中...</div>

  // 选模式页
  if (!mode) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/eval')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">创建评测任务</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-400"
            onClick={() => { setMode('project'); setStep(1) }}
          >
            <CardContent className="pt-6 pb-5 space-y-2 text-center">
              <FolderKanban className="w-10 h-10 text-blue-600 mx-auto" />
              <div className="font-semibold text-lg">从项目启动</div>
              <p className="text-sm text-gray-500">选择已配置好的项目，多模板一键跑批</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-gray-400"
            onClick={() => { setMode('quick'); setStep(1) }}
          >
            <CardContent className="pt-6 pb-5 space-y-2 text-center">
              <Zap className="w-10 h-10 text-amber-500 mx-auto" />
              <div className="font-semibold text-lg">快捷模式</div>
              <p className="text-sm text-gray-500">直接选数据集 + 单模板，快速开跑</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 项目模式的“选项目”步
  const renderProjectStep = () => (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <Label>选择项目</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setProjectId(p.id)}
              className={
                'border rounded-lg p-3 cursor-pointer transition-all ' +
                (projectId === p.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300')
              }
            >
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm">{p.name}</span>
              </div>
              {p.description && (
                <div className="text-xs text-gray-500 mt-1">{p.description}</div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {p.templateIds.length} 个模板
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  // 项目模式的“确认模板”步（多选）
  const renderTemplateConfirmStep = () => (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <Label>确认模板（可多选）</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {project?.templateIds.map((tid) => {
            const t = templates.find((x) => x.id === tid)
            if (!t) return null
            const selected = selectedTemplateIds.includes(tid)
            return (
              <div
                key={tid}
                onClick={() => {
                  setSelectedTemplateIds((ids) =>
                    selected ? ids.filter((x) => x !== tid) : [...ids, tid]
                  )
                }}
                className={
                  'border rounded-lg p-3 cursor-pointer transition-all ' +
                  (selected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 hover:border-gray-300')
                }
              >
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selected} readOnly className="rounded" />
                  {t.type === 'similarity' ? (
                    <Zap className="w-4 h-4 text-amber-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="font-medium text-sm">{t.name}</span>
                  <Badge variant="outline" className="text-[9px]">
                    {t.type === 'similarity' ? '相似度' : 'LLM'}
                  </Badge>
                </div>
                {t.description && (
                  <div className="text-xs text-gray-500 mt-1 ml-6 line-clamp-2">{t.description}</div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )

  // 数据集选择
  const renderDatasetStep = () => (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label>选择数据集</Label>
          <Link href="/datasets/new" className="text-xs text-blue-600 hover:underline">
            + 上传新数据集
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {datasets.map((d) => (
            <div
              key={d.id}
              onClick={() => setDatasetId(d.id)}
              className={
                'border rounded-lg p-3 cursor-pointer transition-all ' +
                (datasetId === d.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300')
              }
            >
              <div className="flex items-center gap-2">
                {d.source === 'excel' ? (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                ) : (
                  <FileJson className="w-4 h-4 text-emerald-600" />
                )}
                <span className="font-medium text-sm">{d.name}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {d.rowsCount} 行 · {d.fields.length} 字段
              </div>
            </div>
          ))}
          {datasets.length === 0 && (
            <div className="col-span-2 py-8 text-center text-gray-400 text-sm">
              还没有数据集，请先去上传
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // 快捷模式的“选模板”（单选）
  const renderQuickTemplateStep = () => (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label>选择模板</Label>
          <Link href="/templates/edit?id=new" className="text-xs text-blue-600 hover:underline">
            + 新建模板
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => setQuickTemplateId(t.id)}
              className={
                'border rounded-lg p-3 cursor-pointer transition-all ' +
                (quickTemplateId === t.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300')
              }
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm">{t.name}</span>
                <Badge variant="outline" className="text-[9px]">
                  {t.type === 'similarity' ? '相似度' : 'LLM'}
                </Badge>
              </div>
              {t.description && (
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</div>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {t.variables.map((v) => (
                  <Badge key={v} variant="outline" className="text-[10px] font-mono">
                    {'{{' + v + '}}'}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  // 字段绑定（多模板）
  const bindingStepNum = mode === 'project' ? 4 : 3
  const renderBindingStep = () => (
    <div className="space-y-4">
      {activeTemplates.map((tpl) => (
        <BindingStep
          key={tpl.id}
          dataset={dataset!}
          template={tpl}
          bindings={allBindings[tpl.id] || []}
          setBindings={(b) => setAllBindings((prev) => ({ ...prev, [tpl.id]: b }))}
          showTitle={activeTemplates.length > 1}
        />
      ))}
    </div>
  )

  // 运行参数
  const paramStepNum = mode === 'project' ? 5 : 4
  const renderParamStep = () => (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div>
          <Label className="text-xs text-gray-600">任务名称</Label>
          <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="mt-1" />
        </div>
        {activeTemplates.some((t) => t.type === 'llm') && (
          <div>
            <Label className="text-xs text-gray-600">API 配置</Label>
            <select
              value={apiConfigId}
              onChange={(e) => setApiConfigId(e.target.value)}
              className="mt-1 w-full border rounded-md h-9 px-2 text-sm bg-white"
            >
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（并发 {c.concurrency}）
                </option>
              ))}
            </select>
          </div>
        )}
        {dataset && (
          <div>
            <Label className="text-xs text-gray-600">运行行数（最多 {dataset.rowsCount}）</Label>
            <Input
              type="number"
              value={rowCount}
              min={1}
              max={dataset.rowsCount}
              onChange={(e) => setRowCount(Math.max(1, Math.min(dataset.rowsCount, Number(e.target.value) || 1)))}
              className="mt-1"
            />
          </div>
        )}
        <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
          {dataset && <div>数据集：<b>{dataset.name}</b></div>}
          <div>模板：<b>{activeTemplates.map((t) => t.name).join('、')}</b></div>
        </div>
      </CardContent>
    </Card>
  )

  // 根据模式和步骤渲染内容
  function renderStepContent() {
    if (mode === 'project') {
      if (step === 1) return renderProjectStep()
      if (step === 2) return renderTemplateConfirmStep()
      if (step === 3) return renderDatasetStep()
      if (step === 4 && dataset) return renderBindingStep()
      if (step === 5 && dataset) return renderParamStep()
    } else {
      if (step === 1) return renderDatasetStep()
      if (step === 2) return renderQuickTemplateStep()
      if (step === 3 && dataset) return renderBindingStep()
      if (step === 4 && dataset) return renderParamStep()
    }
    return null
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => {
          if (step === 1 && mode) { setMode('' as 'project' | 'quick'); return }
          router.push('/eval')
        }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <h1 className="text-2xl font-semibold text-gray-900">创建评测任务</h1>
        <Badge variant="outline" className="text-xs">
          {mode === 'project' ? '项目模式' : '快捷模式'}
        </Badge>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ' +
                (step >= s.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500')
              }
            >
              {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
            </div>
            <span className={step >= s.id ? 'text-sm font-medium' : 'text-sm text-gray-400'}>
              {s.label}
            </span>
            {idx < STEPS.length - 1 && (
              <div className={'w-12 h-0.5 ' + (step > s.id ? 'bg-blue-600' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {renderStepContent()}

      {/* footer */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 上一步
        </Button>
        {step < maxStep ? (
          <Button onClick={next}>
            下一步 <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={start}>
            <Play className="w-4 h-4 mr-1" /> 启动评测
          </Button>
        )}
      </div>
    </div>
  )
}

function BindingStep({
  dataset,
  template,
  bindings,
  setBindings,
  showTitle = false,
}: {
  dataset: NonNullable<ReturnType<typeof useDatasetStore.getState>['datasets'][number]>
  template: NonNullable<ReturnType<typeof useTemplateStore.getState>['templates'][number]>
  bindings: BindingItem[]
  setBindings: (b: BindingItem[]) => void
  showTitle?: boolean
}) {
  function update(idx: number, patch: Partial<BindingItem>) {
    setBindings(bindings.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
  }

  // 实时预览：用第一行数据渲染
  const preview = useMemo(() => {
    const vars: Record<string, string> = {}
    const row = dataset.rows[0] || {}
    for (const b of bindings) {
      if (b.mode === 'constant') vars[b.variable] = b.constantValue ?? ''
      else if (b.fieldPath) vars[b.variable] = valueToString(row[b.fieldPath])
      else vars[b.variable] = ''
    }
    return renderTemplate(template.content, vars, { keepUnresolved: true })
  }, [bindings, dataset, template])

  return (
    <div className="space-y-2">
      {showTitle && (
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">{template.type === 'similarity' ? '相似度' : 'LLM'}</Badge>
          <span className="font-medium text-sm text-gray-700">{template.name}</span>
        </div>
      )}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="font-medium text-sm">字段绑定</div>
          <p className="text-xs text-gray-500">
            把模板变量映射到数据集字段；也可以填固定值（常量模式）
          </p>
          {bindings.map((b, idx) => (
            <div key={b.variable} className="border rounded-md p-3 bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-blue-600">{'{{' + b.variable + '}}'}</span>
                <select
                  value={b.mode}
                  onChange={(e) => update(idx, { mode: e.target.value as BindingItem['mode'] })}
                  className="text-xs border rounded px-2 py-1 bg-white"
                >
                  <option value="field">数据集字段</option>
                  <option value="constant">固定值</option>
                </select>
              </div>
              {b.mode === 'field' ? (
                <select
                  value={b.fieldPath ?? ''}
                  onChange={(e) => update(idx, { fieldPath: e.target.value })}
                  className="w-full border rounded-md h-9 px-2 text-sm bg-white"
                >
                  <option value="">— 选择字段 —</option>
                  {dataset.fields.map((f) => (
                    <option key={f.path} value={f.path}>
                      {f.path} ({f.type})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={b.constantValue ?? ''}
                  onChange={(e) => update(idx, { constantValue: e.target.value })}
                  placeholder="输入固定值"
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-2">
          <div className="font-medium text-sm">实时预览（第 1 行）</div>
          <p className="text-xs text-gray-500">渲染后的 Prompt（不含追加的 schema 提示）</p>
          <pre className="text-xs bg-gray-50 border rounded-md p-3 max-h-[420px] overflow-auto whitespace-pre-wrap font-mono">
            {preview}
          </pre>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}

export default function EvalNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">加载中...</div>}>
      <WizardInner />
    </Suspense>
  )
}
