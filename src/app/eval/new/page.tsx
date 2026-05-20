'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useDatasetStore } from '@/lib/dataset-store'
import { useTemplateStore } from '@/lib/template-store'
import { useTaskStore, type BindingItem } from '@/lib/task-store'
import { useConfigStore } from '@/lib/config-store'
import { renderTemplate } from '@/lib/template-engine'
import { valueToString } from '@/lib/json-path'
import { ArrowLeft, ArrowRight, Play, FileSpreadsheet, FileJson, FileText, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const STEPS = [
  { id: 1, label: '选数据集' },
  { id: 2, label: '选模板' },
  { id: 3, label: '字段绑定' },
  { id: 4, label: '运行参数' },
]

function WizardInner() {
  const router = useRouter()
  const params = useSearchParams()
  const presetDatasetId = params.get('datasetId') || ''
  const presetTemplateId = params.get('templateId') || ''

  const datasets = useDatasetStore((s) => s.datasets)
  const templates = useTemplateStore((s) => s.templates)
  const configs = useConfigStore((s) => s.configs)
  const activeConfigId = useConfigStore((s) => s.activeConfigId)
  const addTask = useTaskStore((s) => s.addTask)

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const [step, setStep] = useState(presetDatasetId ? (presetTemplateId ? 3 : 2) : 1)
  const [datasetId, setDatasetId] = useState(presetDatasetId)
  const [templateId, setTemplateId] = useState(presetTemplateId)
  const [bindings, setBindings] = useState<BindingItem[]>([])
  const [apiConfigId, setApiConfigId] = useState(activeConfigId)
  const [rowCount, setRowCount] = useState(0)
  const [taskName, setTaskName] = useState('')

  const dataset = useMemo(() => datasets.find((d) => d.id === datasetId), [datasets, datasetId])
  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId])

  // 模板变了，重建绑定
  useEffect(() => {
    if (!template) return
    setBindings(
      template.variables.map((v) => {
        // 同名字段自动匹配
        const exact = dataset?.fields.find((f) => f.path === v || f.label === v)
        return {
          variable: v,
          mode: 'field' as const,
          fieldPath: exact?.path,
        }
      })
    )
  }, [template, dataset])

  useEffect(() => {
    if (!dataset) return
    setRowCount(dataset.rowsCount)
    if (template && !taskName) {
      setTaskName(template.name + ' · ' + dataset.name)
    }
  }, [dataset, template, taskName])

  function next() {
    if (step === 1 && !datasetId) return alert('请选择数据集')
    if (step === 2 && !templateId) return alert('请选择模板')
    if (step === 3) {
      const missing = bindings.filter(
        (b) => b.mode === 'field' ? !b.fieldPath : (b.constantValue ?? '') === ''
      )
      if (missing.length > 0) {
        const ok = confirm(
          '存在 ' + missing.length + ' 个变量未绑定，会以空值代入。是否继续？'
        )
        if (!ok) return
      }
    }
    setStep(Math.min(4, step + 1))
  }

  function start() {
    if (!dataset || !template || !apiConfigId) return
    const id = addTask({
      name: taskName.trim() || (template.name + ' · ' + dataset.name),
      datasetId: dataset.id,
      templateId: template.id,
      bindings,
      apiConfigId,
      status: 'pending',
      progress: { total: rowCount, done: 0, failed: 0 },
      results: [],
      rowCount,
    })
    router.push('/eval/detail?id=' + id + '&autostart=1')
  }

  if (!hydrated) return <div className="p-8 text-gray-400">加载中...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/eval')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <h1 className="text-2xl font-semibold text-gray-900">创建评测任务</h1>
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

      {/* Step 1: 数据集 */}
      {step === 1 && (
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
      )}

      {/* Step 2: 模板 */}
      {step === 2 && (
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
                  onClick={() => setTemplateId(t.id)}
                  className={
                    'border rounded-lg p-3 cursor-pointer transition-all ' +
                    (templateId === t.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-gray-300')
                  }
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm">{t.name}</span>
                    {t.builtin && (
                      <Badge variant="secondary" className="text-[9px]">内置</Badge>
                    )}
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
      )}

      {/* Step 3: 绑定 */}
      {step === 3 && template && dataset && (
        <BindingStep
          dataset={dataset}
          template={template}
          bindings={bindings}
          setBindings={setBindings}
        />
      )}

      {/* Step 4: 参数 */}
      {step === 4 && template && dataset && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <Label className="text-xs text-gray-600">任务名称</Label>
              <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="mt-1" />
            </div>
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
              <p className="text-[11px] text-gray-400 mt-1">
                建议先跑 5-10 行验证 prompt 与 schema 是否合理，再扩大规模
              </p>
            </div>
            <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
              <div>数据集：<b>{dataset.name}</b></div>
              <div>模板：<b>{template.name}</b></div>
              <div>输出字段：{template.outputSchema.map((f) => f.name).join(', ') || '(无 schema)'}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* footer */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 上一步
        </Button>
        {step < 4 ? (
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
}: {
  dataset: NonNullable<ReturnType<typeof useDatasetStore.getState>['datasets'][number]>
  template: NonNullable<ReturnType<typeof useTemplateStore.getState>['templates'][number]>
  bindings: BindingItem[]
  setBindings: (b: BindingItem[]) => void
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
  )
}

export default function EvalNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">加载中...</div>}>
      <WizardInner />
    </Suspense>
  )
}
