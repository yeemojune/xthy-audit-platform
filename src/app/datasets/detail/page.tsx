'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDatasetStore } from '@/lib/dataset-store'
import { ArrowLeft, Play, FileSpreadsheet, FileJson } from 'lucide-react'
import Link from 'next/link'

function DetailInner() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id') || ''
  const getDataset = useDatasetStore((s) => s.getDataset)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  const dataset = getDataset(id)

  if (!hydrated) {
    return <div className="p-8 text-gray-400">加载中...</div>
  }

  if (!dataset) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-gray-500">未找到数据集</div>
        <Button variant="outline" onClick={() => router.push('/datasets')}>返回</Button>
      </div>
    )
  }

  const previewRows = dataset.rows.slice(0, 10)
  const visibleFields = dataset.fields.slice(0, 8)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/datasets')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
          <div className="flex items-center gap-2">
            {dataset.source === 'excel' ? (
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            ) : (
              <FileJson className="w-5 h-5 text-emerald-600" />
            )}
            <h1 className="text-2xl font-semibold text-gray-900">{dataset.name}</h1>
          </div>
        </div>
        <Link href={'/eval/new?datasetId=' + dataset.id}>
          <Button>
            <Play className="w-4 h-4 mr-2" /> 用此数据集创建评测
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="行数" value={dataset.rowsCount} />
        <StatCard label="字段数" value={dataset.fields.length} />
        <StatCard label="来源" value={dataset.source.toUpperCase()} />
        <StatCard label="上传时间" value={new Date(dataset.uploadAt).toLocaleString('zh-CN')} small />
      </div>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">字段列表</h2>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">路径</th>
                  <th className="px-3 py-2 text-left w-24">类型</th>
                  <th className="px-3 py-2 text-left">示例</th>
                </tr>
              </thead>
              <tbody>
                {dataset.fields.map((f) => (
                  <tr key={f.path} className="border-t">
                    <td className="px-3 py-1.5 font-mono text-xs">{f.path}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-600 truncate max-w-[500px]">
                      {f.sample === null || f.sample === undefined
                        ? '(空)'
                        : typeof f.sample === 'object'
                        ? JSON.stringify(f.sample).slice(0, 100)
                        : String(f.sample).slice(0, 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">数据预览（前 10 行）</h2>
          <div className="border rounded-md overflow-auto max-w-full">
            <table className="text-xs min-w-full">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-1.5 text-left w-10">#</th>
                  {visibleFields.map((f) => (
                    <th key={f.path} className="px-2 py-1.5 text-left font-mono whitespace-nowrap">
                      {f.path}
                    </th>
                  ))}
                  {dataset.fields.length > visibleFields.length && (
                    <th className="px-2 py-1.5 text-left text-gray-400">
                      +{dataset.fields.length - visibleFields.length}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                    {visibleFields.map((f) => (
                      <td key={f.path} className="px-2 py-1.5 max-w-[240px] truncate">
                        {r[f.path] === null || r[f.path] === undefined
                          ? ''
                          : typeof r[f.path] === 'object'
                          ? JSON.stringify(r[f.path])
                          : String(r[f.path])}
                      </td>
                    ))}
                    {dataset.fields.length > visibleFields.length && (
                      <td className="px-2 py-1.5 text-gray-400">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={small ? 'text-sm font-medium mt-1' : 'text-xl font-semibold mt-0.5'}>{value}</div>
      </CardContent>
    </Card>
  )
}

export default function DatasetDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">加载中...</div>}>
      <DetailInner />
    </Suspense>
  )
}
