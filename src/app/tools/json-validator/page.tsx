'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileJson, Check, AlertCircle, Copy, Trash2, Minimize2, Maximize2 } from 'lucide-react'

interface ParseResult {
  ok: boolean
  data?: unknown
  error?: string
  errorLine?: number
  errorCol?: number
}

function parseJson(text: string): ParseResult {
  try {
    return { ok: true, data: JSON.parse(text) }
  } catch (e) {
    const msg = (e as Error).message
    // 尝试解析 "at position N"
    const posMatch = /position\s+(\d+)/i.exec(msg)
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10)
      const before = text.slice(0, pos)
      const line = before.split('\n').length
      const col = pos - before.lastIndexOf('\n')
      return { ok: false, error: msg, errorLine: line, errorCol: col }
    }
    return { ok: false, error: msg }
  }
}

export default function JsonValidatorPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => {
    if (!input.trim()) return null
    return parseJson(input)
  }, [input])

  const stats = useMemo(() => {
    if (!result?.ok) return null
    const text = JSON.stringify(result.data)
    return {
      bytes: new Blob([text]).size,
      type: Array.isArray(result.data) ? `Array (${result.data.length})` : typeof result.data,
    }
  }, [result])

  const handleFormat = (indent: number) => {
    if (!result?.ok) return
    setOutput(JSON.stringify(result.data, null, indent))
  }

  const handleMinify = () => {
    if (!result?.ok) return
    setOutput(JSON.stringify(result.data))
  }

  const handleCopy = async () => {
    const target = output || input
    if (!target) return
    await navigator.clipboard.writeText(target)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> 返回工具箱
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <FileJson className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">JSON 校验与格式化</h1>
          <p className="text-sm text-gray-500">粘贴 JSON 文本，自动校验语法。可格式化为缩进或压缩为单行。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">输入</CardTitle>
              <div className="flex items-center gap-2">
                {result && (
                  result.ok ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      <Check className="w-3 h-3 mr-1" /> 有效 JSON
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                      <AlertCircle className="w-3 h-3 mr-1" /> 语法错误
                    </Badge>
                  )
                )}
                <Button size="sm" variant="ghost" onClick={handleClear}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder='{"name": "晓天衡宇", "data": [...]}'
              className="w-full h-96 p-3 font-mono text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
              spellCheck={false}
            />
            {result && !result.ok && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                <div className="font-medium mb-1">{result.error}</div>
                {result.errorLine && (
                  <div className="text-xs text-red-600">
                    位置：第 {result.errorLine} 行，第 {result.errorCol} 列
                  </div>
                )}
              </div>
            )}
            {stats && (
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span>类型：<code className="text-gray-700">{stats.type}</code></span>
                <span>压缩后大小：<code className="text-gray-700">{stats.bytes} B</code></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">输出</CardTitle>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={!result?.ok} onClick={() => handleFormat(2)}>
                  <Maximize2 className="w-3.5 h-3.5 mr-1" /> 缩进 2
                </Button>
                <Button size="sm" variant="outline" disabled={!result?.ok} onClick={() => handleFormat(4)}>
                  缩进 4
                </Button>
                <Button size="sm" variant="outline" disabled={!result?.ok} onClick={handleMinify}>
                  <Minimize2 className="w-3.5 h-3.5 mr-1" /> 压缩
                </Button>
                <Button size="sm" variant="ghost" disabled={!output} onClick={handleCopy}>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={output}
              readOnly
              placeholder="点击「缩进」或「压缩」按钮生成结果"
              className="w-full h-96 p-3 font-mono text-xs border rounded-md bg-gray-50 focus:outline-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
