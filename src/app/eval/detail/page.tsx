'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TaskProgressPanel } from '@/components/TaskProgressPanel'
import { useTaskStore, type EvalResult } from '@/lib/task-store'
import { useDatasetStore } from '@/lib/dataset-store'
import { useTemplateStore } from '@/lib/template-store'
import { useConfigStore } from '@/lib/config-store'
import { runEvalTask } from '@/lib/eval-runner'
import { exportToExcel, downloadBlob } from '@/lib/excel-parser'
import { ArrowLeft, Play, Pause, RotateCw, Download, AlertCircle } from 'lucide-react'

function DetailInner() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id') || ''
  const autostart = params.get('autostart') === '1'

  const tasks = useTaskStore((s) => s.tasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const appendResult = useTaskStore((s) => s.appendResult)
  const datasets = useDatasetStore((s) => s.datasets)
  const templates = useTemplateStore((s) => s.templates)
  const configs = useConfigStore((s) => s.configs)

  const task = useMemo(() => tasks.find((t) => t.id === id), [tasks, id])
  const dataset = useMemo(
    () => (task ? datasets.find((d) => d.id === task.datasetId) : undefined),
    [datasets, task]
  )
  const template = useMemo(
    () => (task ? templates.find((x) => x.id === task.templateId) : undefined),
    [templates, task]
  )
  const apiConfig = useMemo(
    () => (task ? configs.find((c) => c.id === task.apiConfigId) || configs[0] : undefined),
    [configs, task]
  )

  const stopRef = useRef(false)
  const runningRef = useRef(false)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const [startedAt, setStartedAt] = useState<number | null>(task?.startTime ?? null)

  function start() {
    if (!task || !dataset || !template || !apiConfig) return
    if (runningRef.current) return
    runningRef.current = true
    stopRef.current = false
    const ts = Date.now()
    setStartedAt(ts)
    updateTask(task.id, { status: 'running', startTime: ts })

    const doneSet = new Set<number>()
    for (const r of task.results) if (!r.error) doneSet.add(r.rowIndex)

    runEvalTask({
      apiConfig,
      template,
      dataset,
      bindings: task.bindings,
      rowCount: task.rowCount,
      concurrency: apiConfig.concurrency || 5,
      doneRowIndexes: doneSet,
      callbacks: {
        onResult: (r: EvalResult) => appendResult(task.id, r),
        shouldStop: () => stopRef.current,
      },
    })
      .then(() => {
        runningRef.current = false
        const cur = useTaskStore.getState().tasks.find((t) => t.id === task.id)
        if (!cur) return
        if (stopRef.current) {
          updateTask(task.id, { status: 'paused' })
        } else {
          const allDone = cur.results.length >= cur.progress.total
          updateTask(task.id, {
            status: allDone ? 'done' : 'paused',
            endTime: allDone ? Date.now() : undefined,
          })
        }
      })
      .catch((e) => {
        runningRef.current = false
        updateTask(task.id, { status: 'error' })
        console.error(e)
      })
  }

  function pause() {
    stopRef.current = true
  }

  function reset() {
    if (!task) return
    if (!confirm('确认清空已有结果并重新开始？')) return
    updateTask(task.id, { results: [], progress: { total: task.rowCount, done: 0, failed: 0 }, status: 'pending', startTime: undefined, endTime: undefined })
  }

  // 自动启动
  useEffect(() => {
    if (autostart && task && dataset && template && apiConfig && !runningRef.current && task.status === 'pending') {
      start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, dataset?.id, template?.id, apiConfig?.id])

  function exportResults() {
    if (!task || !dataset || !template) return
    const schemaCols = template.outputSchema.map((f) => f.name)
    const data = []
    for (let i = 0; i < task.rowCount; i++) {
      const row = dataset.rows[i] || {}
      const result = task.results.find((r) => r.rowIndex === i)
      const merged: Record<string, unknown> = { '#行号': i + 1, ...row }
      for (const col of schemaCols) {
        merged['LLM_' + col] = result?.output?.[col] ?? ''
      }
      merged['LLM_原始返回'] = result?.raw ?? ''
      merged['LLM_错误'] = result?.error ?? ''
      data.push(merged)
    }
    const blob = exportToExcel(
      [{ name: '评测结果', data }],
      task.name + '-' + new Date().toISOString().slice(0, 10)
    )
    downloadBlob(blob, task.name + '-' + new Date().toISOString().slice(0, 10) + '.xlsx')
  }

  if (!hydrated) return <div className="p-8 text-gray-400">加载中...</div>

  if (!task) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-gray-500">未找到任务</div>
        <Button variant="outline" onClick={() => router.push('/eval')}>返回</Button>
      </div>
    )
  }

  const running = task.status === 'running'
  const isDone = task.status === 'done'
  const errorsCount = task.progress.failed
  const sortedResults = [...task.results].sort((a, b) => a.rowIndex - b.rowIndex)
  const schemaCols = template?.outputSchema.map((f) => f.name) ?? []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/eval')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">{task.name}</h1>
          <Badge variant="secondary">{task.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {!running && !isDone && (
            <Button onClick={start} disabled={!dataset || !template || !apiConfig}>
              <Play className="w-4 h-4 mr-1" />
              {task.results.length > 0 ? '继续' : '开始'}
            </Button>
          )}
          {running && (
            <Button variant="outline" onClick={pause}>
              <Pause className="w-4 h-4 mr-1" /> 暂停
            </Button>
          )}
          <Button variant="outline" onClick={reset} disabled={running}>
            <RotateCw className="w-4 h-4 mr-1" /> 重置
          </Button>
          <Button variant="outline" onClick={exportResults} disabled={task.results.length === 0}>
            <Download className="w-4 h-4 mr-1" /> 导出 Excel
          </Button>
        </div>
      </div>

      {(!dataset || !template || !apiConfig) && (
        <Card>
          <CardContent className="pt-5 text-amber-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            关联的数据集 / 模板 / API 配置已被删除，无法执行
          </CardContent>
        </Card>
      )}

      <TaskProgressPanel
        running={running}
        done={task.progress.done}
        total={task.progress.total}
        errors={errorsCount}
        startTime={startedAt}
        label="评测执行中..."
      />

      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            结果（{sortedResults.length} / {task.rowCount}）
          </h2>
          <div className="border rounded-md overflow-auto max-w-full">
            <table className="text-xs min-w-full">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left w-10">#</th>
                  {schemaCols.map((c) => (
                    <th key={c} className="px-2 py-1.5 text-left whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-left">状态 / 错误</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r) => (
                  <tr key={r.rowIndex} className="border-t">
                    <td className="px-2 py-1.5 text-gray-400">{r.rowIndex + 1}</td>
                    {schemaCols.map((c) => (
                      <td key={c} className="px-2 py-1.5 max-w-[280px] truncate">
                        {r.output?.[c] === null || r.output?.[c] === undefined
                          ? ''
                          : typeof r.output[c] === 'object'
                          ? JSON.stringify(r.output[c])
                          : String(r.output[c])}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      {r.error ? (
                        <span className="text-red-600 truncate inline-block max-w-[300px]">
                          {r.error}
                        </span>
                      ) : r.validationErrors && r.validationErrors.length > 0 ? (
                        <span className="text-amber-600 text-[10px]">
                          {r.validationErrors[0]}
                        </span>
                      ) : (
                        <span className="text-emerald-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedResults.length === 0 && (
                  <tr>
                    <td colSpan={schemaCols.length + 2} className="px-3 py-8 text-center text-gray-400">
                      暂无结果
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function EvalDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">加载中...</div>}>
      <DetailInner />
    </Suspense>
  )
}
