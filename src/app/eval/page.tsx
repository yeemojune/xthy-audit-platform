'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTaskStore } from '@/lib/task-store'
import { useDatasetStore } from '@/lib/dataset-store'
import { useTemplateStore } from '@/lib/template-store'
import { Plus, Eye, Trash2, ClipboardList, Play } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: '待开始', cls: 'bg-gray-100 text-gray-700' },
  running: { label: '运行中', cls: 'bg-blue-100 text-blue-700' },
  paused: { label: '已暂停', cls: 'bg-amber-100 text-amber-700' },
  done: { label: '已完成', cls: 'bg-emerald-100 text-emerald-700' },
  error: { label: '出错', cls: 'bg-red-100 text-red-700' },
}

export default function EvalListPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const removeTask = useTaskStore((s) => s.removeTask)
  const datasets = useDatasetStore((s) => s.datasets)
  const templates = useTemplateStore((s) => s.templates)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">评测中心</h1>
          <p className="text-sm text-gray-500 mt-1">所有数据评测任务一览，支持继续、查看、导出</p>
        </div>
        <Link href="/eval/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> 新建评测
          </Button>
        </Link>
      </div>

      {hydrated && tasks.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <div className="mb-4">还没有任务</div>
            <Link href="/eval/new">
              <Button size="sm">
                <Play className="w-4 h-4 mr-1" /> 创建第一个评测
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {tasks.map((t) => {
          const ds = datasets.find((d) => d.id === t.datasetId)
          const tpl = templates.find((x) => x.id === t.templateId)
          const status = STATUS_LABEL[t.status] || STATUS_LABEL.pending
          const percent =
            t.progress.total > 0 ? (t.progress.done / t.progress.total) * 100 : 0
          return (
            <Card key={t.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{t.name}</span>
                      <Badge className={'text-[10px] ' + status.cls}>{status.label}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      数据集：{ds?.name ?? '(已删除)'} · 模板：{tpl?.name ?? '(已删除)'} ·{' '}
                      创建：{new Date(t.createdAt).toLocaleString('zh-CN')}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1">
                        <Progress value={percent} className="h-1.5" />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {t.progress.done} / {t.progress.total}
                        {t.progress.failed > 0 && (
                          <span className="text-red-500 ml-1">· {t.progress.failed} 失败</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={'/eval/detail?id=' + t.id}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-3.5 h-3.5 mr-1" /> 查看
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirmId === t.id) {
                          removeTask(t.id)
                          setConfirmId(null)
                        } else {
                          setConfirmId(t.id)
                          setTimeout(() => setConfirmId((c) => (c === t.id ? null : c)), 3000)
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {confirmId === t.id ? '确认' : '删除'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
