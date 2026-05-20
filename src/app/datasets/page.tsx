'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDatasetStore } from '@/lib/dataset-store'
import { Plus, Database, Eye, Trash2, FileSpreadsheet, FileJson } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function DatasetsPage() {
  const datasets = useDatasetStore((s) => s.datasets)
  const remove = useDatasetStore((s) => s.removeDataset)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">数据集</h1>
          <p className="text-sm text-gray-500 mt-1">上传 Excel / JSON 数据，平台会自动识别字段供模板绑定</p>
        </div>
        <Link href="/datasets/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> 上传数据集
          </Button>
        </Link>
      </div>

      {hydrated && datasets.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <div>还没有数据集，请先上传</div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((d) => (
          <Card key={d.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  {d.source === 'excel' ? (
                    <FileSpreadsheet className="w-4 h-4" />
                  ) : (
                    <FileJson className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{d.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {d.rowsCount} 行 · {d.fields.length} 字段 ·{' '}
                    {new Date(d.uploadAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {d.fields.slice(0, 5).map((f) => (
                  <Badge key={f.path} variant="outline" className="text-[10px] font-mono">
                    {f.path}
                  </Badge>
                ))}
                {d.fields.length > 5 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{d.fields.length - 5}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t">
                <Link href={'/datasets/detail?id=' + d.id}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-3.5 h-3.5 mr-1" /> 查看
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (confirmId === d.id) {
                      remove(d.id)
                      setConfirmId(null)
                    } else {
                      setConfirmId(d.id)
                      setTimeout(() => setConfirmId((c) => (c === d.id ? null : c)), 3000)
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {confirmId === d.id ? '确认' : '删除'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
