'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTemplateStore } from '@/lib/template-store'
import { Plus, FileText, Edit3, Trash2, Lock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function TemplatesPage() {
  const templates = useTemplateStore((s) => s.templates)
  const removeTemplate = useTemplateStore((s) => s.removeTemplate)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">模板库</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理 Prompt 模板，含变量占位符（{'{{var}}'}）和输出 JSON Schema
          </p>
        </div>
        <Link href="/templates/edit?id=new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> 新建模板
          </Button>
        </Link>
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">暂无模板</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{t.description}</div>
                    )}
                  </div>
                </div>
                {t.builtin && (
                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                    <Lock className="w-2.5 h-2.5 mr-1" /> 内置
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {t.variables.length === 0 && (
                  <span className="text-[11px] text-gray-400">未识别到变量</span>
                )}
                {t.variables.map((v) => (
                  <Badge key={v} variant="outline" className="text-[10px] font-mono">
                    {'{{' + v + '}}'}
                  </Badge>
                ))}
              </div>

              <div className="text-xs text-gray-500">
                输出字段：{t.outputSchema.length} 个
                {t.outputSchema.length > 0 && (
                  <span className="ml-1 text-gray-400">
                    ({t.outputSchema.slice(0, 3).map((f) => f.name).join(', ')}
                    {t.outputSchema.length > 3 ? '...' : ''})
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t">
                <Link href={'/templates/edit?id=' + t.id}>
                  <Button variant="outline" size="sm">
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> {t.builtin ? '查看' : '编辑'}
                  </Button>
                </Link>
                {!t.builtin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirmId === t.id) {
                        removeTemplate(t.id)
                        setConfirmId(null)
                      } else {
                        setConfirmId(t.id)
                        setTimeout(() => setConfirmId((c) => (c === t.id ? null : c)), 3000)
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    {confirmId === t.id ? '确认删除' : '删除'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
