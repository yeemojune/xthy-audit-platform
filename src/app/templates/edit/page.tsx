'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CodeEditor } from '@/components/CodeEditor'
import { SchemaFieldsEditor } from '@/components/SchemaFieldsEditor'
import { useTemplateStore } from '@/lib/template-store'
import type { SchemaField } from '@/lib/schema-validator'
import { extractVariables } from '@/lib/template-engine'
import { schemaToPromptHint } from '@/lib/schema-validator'
import { ArrowLeft, Save, Lock } from 'lucide-react'

function EditorInner() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id') || 'new'
  const isNew = id === 'new'

  const getTemplate = useTemplateStore((s) => s.getTemplate)
  const addTemplate = useTemplateStore((s) => s.addTemplate)
  const updateTemplate = useTemplateStore((s) => s.updateTemplate)
  const existing = isNew ? null : getTemplate(id)
  const readOnly = !!existing?.builtin

  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [content, setContent] = useState(
    existing?.content ?? '请评估以下内容：\n\n{{input}}\n\n请简要给出你的判断。'
  )
  const [systemPrompt, setSystemPrompt] = useState(existing?.systemPrompt ?? '')
  const [schema, setSchema] = useState<SchemaField[]>(
    existing?.outputSchema ?? [
      { name: 'result', type: 'string', description: '评估结果', required: true },
    ]
  )

  const variables = useMemo(() => extractVariables(content), [content])

  // 没找到对应模板（比如刷新后 store 还没 hydrate），等等
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  function save() {
    if (!name.trim()) {
      alert('请填写模板名称')
      return
    }
    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      content,
      variables,
      outputSchema: schema.filter((f) => f.name.trim()),
      systemPrompt: systemPrompt.trim() || undefined,
    }
    if (isNew) {
      addTemplate(data)
    } else if (!readOnly) {
      updateTemplate(id, data)
    }
    router.push('/templates')
  }

  if (!hydrated) {
    return <div className="p-8 text-gray-400">加载中...</div>
  }

  if (!isNew && !existing) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-gray-500">未找到模板</div>
        <Button variant="outline" onClick={() => router.push('/templates')}>返回</Button>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/templates')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isNew ? '新建模板' : readOnly ? '查看模板' : '编辑模板'}
          </h1>
          {readOnly && (
            <Badge variant="secondary">
              <Lock className="w-3 h-3 mr-1" /> 内置只读
            </Badge>
          )}
        </div>
        {!readOnly && (
          <Button onClick={save}>
            <Save className="w-4 h-4 mr-2" /> 保存
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左：基本信息 + Prompt */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <Label className="text-xs text-gray-600">模板名称</Label>
              <Input
                value={name}
                disabled={readOnly}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：商品标题分类"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">说明（可选）</Label>
              <Input
                value={description}
                disabled={readOnly}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="一句话描述这个模板做什么"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">System Prompt（可选）</Label>
              <Input
                value={systemPrompt}
                disabled={readOnly}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="留空则使用默认：你是一个数据评测助手..."
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-gray-600">Prompt 模板内容</Label>
                <span className="text-[11px] text-gray-400">
                  使用 <code className="bg-gray-100 px-1 rounded">{'{{变量名}}'}</code> 占位符
                </span>
              </div>
              <CodeEditor
                value={content}
                onChange={readOnly ? undefined : setContent}
                language="plain"
                height="280px"
                readOnly={readOnly}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-gray-500">识别到的变量：</span>
                {variables.length === 0 ? (
                  <span className="text-xs text-gray-400">（无）</span>
                ) : (
                  variables.map((v) => (
                    <Badge key={v} variant="outline" className="text-[10px] font-mono">
                      {'{{' + v + '}}'}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 右：输出 Schema + 预览 */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <Label className="text-xs text-gray-600">输出 JSON Schema</Label>
              <p className="text-[11px] text-gray-400 mb-2">
                模型必须按此结构返回 JSON，将作为列追加到导出 Excel
              </p>
              <SchemaFieldsEditor schema={schema} onChange={setSchema} readOnly={readOnly} />
            </div>

            <div className="pt-3 border-t">
              <Label className="text-xs text-gray-600">附加给 LLM 的格式提示（自动生成）</Label>
              <pre className="mt-2 text-[11px] bg-gray-50 border rounded-md p-3 max-h-60 overflow-auto whitespace-pre-wrap text-gray-700">
                {schemaToPromptHint(schema.filter((f) => f.name.trim())) || '（未定义字段）'}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function TemplateEditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">加载中...</div>}>
      <EditorInner />
    </Suspense>
  )
}
