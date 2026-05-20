'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ArrowLeft, FileText, Copy, ArrowRight, ArrowLeftRight } from 'lucide-react'

type Mode = 'json2text' | 'text2json'

// 递归提取 JSON 中所有 string
function extractStrings(value: unknown, out: string[] = [], minLen = 1): string[] {
  if (typeof value === 'string') {
    if (value.trim().length >= minLen) out.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) extractStrings(item, out, minLen)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) extractStrings(v, out, minLen)
  }
  return out
}

export default function JsonTextPage() {
  const [mode, setMode] = useState<Mode>('json2text')
  const [input, setInput] = useState('')
  const [separator, setSeparator] = useState('\\n\\n')
  const [minLen, setMinLen] = useState(2)
  const [copied, setCopied] = useState(false)

  const realSep = useMemo(() => separator.replace(/\\n/g, '\n').replace(/\\t/g, '\t'), [separator])

  const result = useMemo(() => {
    if (!input.trim()) return { output: '', error: '', count: 0 }
    try {
      if (mode === 'json2text') {
        const data = JSON.parse(input)
        const strings = extractStrings(data, [], minLen)
        return { output: strings.join(realSep), error: '', count: strings.length }
      } else {
        const segments = input
          .split(realSep)
          .map(s => s.trim())
          .filter(s => s.length >= minLen)
        return {
          output: JSON.stringify(segments, null, 2),
          error: '',
          count: segments.length,
        }
      }
    } catch (e) {
      return { output: '', error: (e as Error).message, count: 0 }
    }
  }, [input, mode, realSep, minLen])

  const handleCopy = async () => {
    if (!result.output) return
    await navigator.clipboard.writeText(result.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const swap = () => {
    setMode(m => (m === 'json2text' ? 'text2json' : 'json2text'))
    setInput(result.output)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> 返回工具箱
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">JSON ↔ 纯文本提取</h1>
          <p className="text-sm text-gray-500">
            JSON 模式：递归抽取所有 string 字段；文本模式：按分隔符切分为 JSON 字符串数组。
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={mode === 'json2text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('json2text')}
        >
          JSON → 纯文本
        </Button>
        <Button variant="ghost" size="sm" onClick={swap} title="交换方向">
          <ArrowLeftRight className="w-4 h-4" />
        </Button>
        <Button
          variant={mode === 'text2json' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('text2json')}
        >
          纯文本 → JSON 数组
        </Button>
      </div>

      {/* Options */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">分隔符（支持 \n、\t）</Label>
            <Input
              value={separator}
              onChange={e => setSeparator(e.target.value)}
              className="w-40 font-mono text-sm"
              placeholder="\n\n"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">最小字符长度（过滤短串）</Label>
            <Input
              type="number"
              min={0}
              value={minLen}
              onChange={e => setMinLen(parseInt(e.target.value || '0', 10))}
              className="w-28"
            />
          </div>
          <div className="text-xs text-gray-500 ml-auto">
            提取数量：<span className="font-medium text-gray-800">{result.count}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              输入（{mode === 'json2text' ? 'JSON' : '纯文本'}）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                mode === 'json2text'
                  ? '{"items": [{"text": "示例文本"}]}'
                  : '段落 1\n\n段落 2\n\n段落 3'
              }
              className="w-full h-96 p-3 font-mono text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-200"
              spellCheck={false}
            />
            {result.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {result.error}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                输出（{mode === 'json2text' ? '纯文本' : 'JSON 数组'}）
              </CardTitle>
              <Button size="sm" variant="ghost" disabled={!result.output} onClick={handleCopy}>
                <Copy className="w-3.5 h-3.5 mr-1" />
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={result.output}
              readOnly
              className="w-full h-96 p-3 font-mono text-xs border rounded-md bg-gray-50 focus:outline-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
