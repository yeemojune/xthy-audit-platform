'use client'

import { Header } from '@/components/layout/Header'
import { CodeEditor } from '@/components/CodeEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Play, Square, Pin, Upload, History, Trash2, Copy, RotateCcw,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  usePromptTestStore,
  type PromptTestResult,
  type PromptVersion,
} from '@/lib/prompt-test-store'
import { useConfigStore } from '@/lib/config-store'
import { callLLM } from '@/lib/llm-client'

/** 把测试数据文本解析为 inputs[] */
function parseInputs(type: 'json' | 'text', raw: string): {
  inputs: string[]
  error?: string
} {
  const text = raw.trim()
  if (!text) return { inputs: [] }
  if (type === 'json') {
    try {
      const v = JSON.parse(text)
      if (Array.isArray(v)) {
        return {
          inputs: v.map((x) =>
            typeof x === 'string' ? x : JSON.stringify(x, null, 2)
          ),
        }
      }
      // 单个对象 → 单条
      return {
        inputs: [typeof v === 'string' ? v : JSON.stringify(v, null, 2)],
      }
    } catch (e) {
      return { inputs: [], error: 'JSON 解析失败：' + String(e) }
    }
  }
  // 纯文本：用空行分隔多条；若没有空行则按整段一条
  const blocks = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  return { inputs: blocks.length ? blocks : [text] }
}

/** 渲染 prompt 模板：{{input}} 占位符替换为单条数据 */
function renderPrompt(prompt: string, input: string): string {
  return prompt.replace(/\{\{\s*input\s*\}\}/g, input)
}

export default function PromptTestPage() {
  const {
    draftPrompt,
    draftSystem,
    draftTestType,
    draftTestText,
    versions,
    setDraftPrompt,
    setDraftSystem,
    setDraftTestType,
    setDraftTestText,
    loadDraftFromVersion,
    pinAsVersion,
    removeVersion,
  } = usePromptTestStore()

  const { configs, activeConfigId, setActiveConfig } = useConfigStore()
  const activeConfig = useMemo(
    () =>
      configs.find((c) => c.id === activeConfigId) || configs[0],
    [configs, activeConfigId]
  )

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  // 解析测试数据
  const parsed = useMemo(
    () => parseInputs(draftTestType, draftTestText),
    [draftTestType, draftTestText]
  )

  // 执行状态
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<PromptTestResult[]>([])
  const [progress, setProgress] = useState(0)
  const stopRef = useRef(false)
  const [currentVersionId, setCurrentVersionId] = useState<string>('')

  // pin 弹窗
  const [pinOpen, setPinOpen] = useState(false)
  const [pinName, setPinName] = useState('')
  const [pinNotes, setPinNotes] = useState('')

  const handleUploadFile = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      setDraftTestText(text)
      // 根据扩展名自动切换 tab
      const isJson =
        f.name.toLowerCase().endsWith('.json') ||
        text.trim().startsWith('[') ||
        text.trim().startsWith('{')
      setDraftTestType(isJson ? 'json' : 'text')
    }
    reader.readAsText(f)
    // reset 以便相同文件可重选
    e.target.value = ''
  }

  const runTest = async () => {
    if (!activeConfig) {
      alert('请先在系统设置中配置 API')
      return
    }
    if (parsed.inputs.length === 0) {
      alert('请先填写测试数据')
      return
    }
    setRunning(true)
    stopRef.current = false
    setProgress(0)
    const init: PromptTestResult[] = parsed.inputs.map((raw, i) => ({
      index: i,
      input: renderPrompt(draftPrompt, raw),
      rawInput: raw,
    }))
    setResults(init)

    const concurrency = Math.max(1, Math.min(activeConfig.concurrency || 5, 10))
    let cursor = 0
    let finished = 0

    const worker = async () => {
      while (!stopRef.current) {
        const i = cursor++
        if (i >= init.length) break
        const item = init[i]
        const t0 = Date.now()
        const res = await callLLM(
          activeConfig,
          draftSystem || '',
          item.input
        )
        const dur = Date.now() - t0
        setResults((prev) => {
          const next = [...prev]
          next[i] = res.success
            ? { ...item, output: res.content, durationMs: dur }
            : { ...item, error: res.error || '调用失败', durationMs: dur }
          return next
        })
        finished++
        setProgress(Math.round((finished / init.length) * 100))
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, init.length) }, () => worker())
    )
    setRunning(false)
  }

  const stopTest = () => {
    stopRef.current = true
  }

  const resetResults = () => {
    setResults([])
    setProgress(0)
    setCurrentVersionId('')
  }

  const openPinDialog = () => {
    if (results.length === 0) {
      alert('请先执行测试，再固定版本')
      return
    }
    const n = versions.length + 1
    setPinName('v' + n)
    setPinNotes('')
    setPinOpen(true)
  }

  const confirmPin = () => {
    const id = pinAsVersion({
      versionName: pinName.trim() || 'v' + (versions.length + 1),
      promptContent: draftPrompt,
      systemPrompt: draftSystem,
      testType: draftTestType,
      testInputs: parsed.inputs,
      results,
      notes: pinNotes,
    })
    setPinOpen(false)
    setCurrentVersionId(id)
  }

  const restoreVersion = (id: string) => {
    const v = versions.find((x) => x.id === id)
    if (!v) return
    if (
      !confirm(
        `将草稿恢复为「${v.versionName}」的内容？当前未保存的草稿会被覆盖。`
      )
    )
      return
    loadDraftFromVersion(id)
    setResults(v.results)
    setProgress(100)
    setCurrentVersionId(id)
  }

  const deleteVersion = (v: PromptVersion) => {
    if (!confirm(`确定删除版本「${v.versionName}」？`)) return
    removeVersion(v.id)
    if (currentVersionId === v.id) setCurrentVersionId('')
  }

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <>
      <Header title="Prompt 测试" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 左：Prompt 编辑器 */}
          <div className="lg:col-span-5 space-y-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Prompt 编辑器</CardTitle>
                <div className="flex items-center gap-2">
                  {hydrated && versions.length > 0 && (
                    <Select
                      value={currentVersionId || ''}
                      onValueChange={(v) => v && restoreVersion(v)}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue placeholder="历史版本..." />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.versionName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">
                    System Prompt（可选）
                  </Label>
                  <Input
                    placeholder="例如：你是严谨的数据评测专家"
                    value={draftSystem}
                    onChange={(e) => setDraftSystem(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">
                    User Prompt（用 <code className="bg-gray-100 px-1 rounded">{'{{input}}'}</code> 引用单条数据）
                  </Label>
                  <CodeEditor
                    value={draftPrompt}
                    onChange={setDraftPrompt}
                    language="plain"
                    height="380px"
                    placeholder="输入 Prompt 模板..."
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  执行时，每条测试数据都会替换 {'{{input}}'} 后单独发起一次调用。
                </p>
              </CardContent>
            </Card>

            {/* 历史版本列表 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  已固定版本
                  {hydrated && (
                    <Badge variant="secondary" className="ml-1">
                      {versions.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!hydrated ? (
                  <div className="text-xs text-gray-400">加载中...</div>
                ) : versions.length === 0 ? (
                  <div className="text-xs text-gray-400">
                    暂无版本。执行测试后点击「固定为版本」可保存。
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {versions.map((v) => (
                      <div
                        key={v.id}
                        className={
                          'border rounded-md px-3 py-2 text-xs transition ' +
                          (currentVersionId === v.id
                            ? 'border-blue-400 bg-blue-50/40'
                            : 'hover:bg-gray-50')
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">
                              {v.versionName}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {v.testType === 'json' ? 'JSON' : '纯文本'}
                            </Badge>
                            <span className="text-gray-400">
                              {v.testInputs.length} 条 · {v.results.length} 结果
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => restoreVersion(v.id)}
                              title="恢复为草稿"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-red-500 hover:text-red-600"
                              onClick={() => deleteVersion(v)}
                              title="删除"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {v.notes && (
                          <div className="mt-1 text-gray-500 line-clamp-2">
                            {v.notes}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] text-gray-400">
                          {new Date(v.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右：测试数据 + 执行 + 结果 */}
          <div className="lg:col-span-7 space-y-3">
            {/* 上：测试数据 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">测试数据</CardTitle>
                <div className="flex items-center gap-2">
                  {hydrated && (
                    <Badge variant="secondary">
                      已识别 {parsed.inputs.length} 条
                    </Badge>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".json,.txt,.csv,application/json,text/plain"
                      className="hidden"
                      onChange={handleUploadFile}
                    />
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded-md hover:bg-gray-50">
                      <Upload className="w-3 h-3" /> 上传文件
                    </span>
                  </label>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={draftTestType}
                  onValueChange={(v) =>
                    setDraftTestType(v as 'json' | 'text')
                  }
                >
                  <TabsList>
                    <TabsTrigger value="text">纯文本</TabsTrigger>
                    <TabsTrigger value="json">JSON 数组</TabsTrigger>
                  </TabsList>
                  <TabsContent value="text" className="mt-3">
                    <CodeEditor
                      value={draftTestText}
                      onChange={setDraftTestText}
                      language="plain"
                      height="180px"
                      placeholder="每条数据用空行分隔；只有一条则整段作为单条输入"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      多条数据请用 <span className="font-mono bg-gray-100 px-1">空行</span> 分隔。
                    </p>
                  </TabsContent>
                  <TabsContent value="json" className="mt-3">
                    <CodeEditor
                      value={draftTestText}
                      onChange={setDraftTestText}
                      language="json"
                      height="180px"
                      placeholder='例如：["输入A", "输入B"] 或 [{"text":"..."}]'
                    />
                    {parsed.error && (
                      <p className="text-[11px] text-red-500 mt-1">{parsed.error}</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* 中：执行控制 */}
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-500">API：</Label>
                    <Select
                      value={activeConfigId}
                      onValueChange={(v) => v && setActiveConfig(v)}
                    >
                      <SelectTrigger className="h-8 w-56 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {configs.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1" />

                  {!running ? (
                    <Button
                      onClick={runTest}
                      disabled={parsed.inputs.length === 0}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="w-4 h-4 mr-1" /> 执行测试
                    </Button>
                  ) : (
                    <Button onClick={stopTest} variant="outline">
                      <Square className="w-4 h-4 mr-1" /> 停止
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={resetResults}
                    disabled={running || results.length === 0}
                  >
                    清空结果
                  </Button>
                  <Button
                    onClick={openPinDialog}
                    disabled={running || results.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Pin className="w-4 h-4 mr-1" /> 固定为版本
                  </Button>
                </div>
                {(running || progress > 0) && (
                  <div className="mt-3">
                    <Progress value={progress} />
                    <div className="text-[11px] text-gray-500 mt-1">
                      {progress}% · {results.filter((r) => r.output || r.error).length}
                      /{results.length}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 下：结果 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">测试结果</CardTitle>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <div className="text-xs text-gray-400 py-8 text-center">
                    尚未执行。配置好 Prompt 与数据后，点击「执行测试」。
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-y-auto">
                    {results.map((r) => (
                      <div
                        key={r.index}
                        className="border rounded-md overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{r.index + 1}</Badge>
                            {r.durationMs != null && (
                              <span className="text-gray-400">
                                {r.durationMs} ms
                              </span>
                            )}
                            {r.error && (
                              <Badge variant="destructive">错误</Badge>
                            )}
                            {r.output && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">
                                完成
                              </Badge>
                            )}
                            {!r.output && !r.error && running && (
                              <Badge variant="secondary">运行中</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() =>
                              copyText(r.output || r.error || '')
                            }
                            title="复制结果"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 text-xs">
                          <div className="p-2 border-r bg-white">
                            <div className="text-[10px] text-gray-400 mb-1">
                              输入
                            </div>
                            <pre className="whitespace-pre-wrap break-words text-gray-700 max-h-40 overflow-y-auto">
                              {r.rawInput}
                            </pre>
                          </div>
                          <div className="p-2 bg-white">
                            <div className="text-[10px] text-gray-400 mb-1">
                              输出
                            </div>
                            {r.error ? (
                              <pre className="whitespace-pre-wrap break-words text-red-600 max-h-40 overflow-y-auto">
                                {r.error}
                              </pre>
                            ) : r.output ? (
                              <pre className="whitespace-pre-wrap break-words text-gray-800 max-h-40 overflow-y-auto">
                                {r.output}
                              </pre>
                            ) : (
                              <span className="text-gray-400">等待中...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Pin 对话框 */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>固定为新版本</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">
                版本名
              </Label>
              <Input
                value={pinName}
                onChange={(e) => setPinName(e.target.value)}
                placeholder="例如 v1 / 客服回复-初版"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">
                备注（可选）
              </Label>
              <Input
                value={pinNotes}
                onChange={(e) => setPinNotes(e.target.value)}
                placeholder="记录效果点 / 改动 / 待优化项"
              />
            </div>
            <div className="text-[11px] text-gray-400">
              将快照保存：Prompt、System、{parsed.inputs.length} 条测试输入、
              {results.length} 条结果。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinOpen(false)}>
              取消
            </Button>
            <Button
              onClick={confirmPin}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              保存版本
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
