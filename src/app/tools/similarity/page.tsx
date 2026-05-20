'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, GitCompare, Play } from 'lucide-react'
import { computeSimilarity } from '@/lib/similarity'

export default function SimilarityToolPage() {
  const [input, setInput] = useState('')
  const [separator, setSeparator] = useState('\\n')
  const [threshold, setThreshold] = useState(0.3)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof computeSimilarity> | null>(null)

  const realSep = useMemo(() => separator.replace(/\\n/g, '\n').replace(/\\t/g, '\t'), [separator])

  const items = useMemo(() => {
    if (!input.trim()) return []
    return input
      .split(realSep)
      .map((s, i) => ({ sheet: '默认', title: `#${i + 1}`, text: s.trim() }))
      .filter(x => x.text.length > 0)
  }, [input, realSep])

  const handleRun = () => {
    if (items.length < 2) return
    setRunning(true)
    setTimeout(() => {
      const r = computeSimilarity(items, threshold)
      setResult(r)
      setRunning(false)
    }, 50)
  }

  const handleExportCsv = () => {
    if (!result || result.pairs.length === 0) return
    const header = '序号A,文本A,序号B,文本B,相似度\n'
    const rows = result.pairs.map(p => {
      const ta = items[p.idxA].text.replace(/"/g, '""')
      const tb = items[p.idxB].text.replace(/"/g, '""')
      return `${p.idxA + 1},"${ta}",${p.idxB + 1},"${tb}",${p.similarity}`
    }).join('\n')
    const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `相似度结果_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> 返回工具箱
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
          <GitCompare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">向量相似度（独立版）</h1>
          <p className="text-sm text-gray-500">
            基于 TF-IDF + 余弦相似度，对一组文本两两计算相似度。算法纯前端运行，适合快速排查重复。
          </p>
        </div>
      </div>

      {/* Options */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">分隔符（支持 \n、\t）</Label>
            <Input
              value={separator}
              onChange={e => setSeparator(e.target.value)}
              className="w-32 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">相似度阈值（0.0 ~ 1.0）</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value || '0'))}
              className="w-28"
            />
          </div>
          <div className="text-xs text-gray-500">
            待比对：<span className="font-medium text-gray-800">{items.length}</span> 条
          </div>
          <Button
            className="ml-auto"
            disabled={items.length < 2 || running}
            onClick={handleRun}
          >
            <Play className="w-4 h-4 mr-1" />
            {running ? '计算中…' : '开始计算'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">输入文本（每条一行）</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={'例如：\n请评估模型在数学推理任务上的表现\n请说明模型在算术能力方面的优劣\n如何评价模型的逻辑推理能力'}
              className="w-full h-96 p-3 font-mono text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-200"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                结果
                {result && (
                  <Badge variant="secondary" className="ml-2">
                    {result.pairs.length} 对超阈值
                  </Badge>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={!result || result.pairs.length === 0}
                onClick={handleExportCsv}
              >
                导出 CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-y-auto border rounded-md">
              {!result ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                  在左侧填入文本后，点击「开始计算」
                </div>
              ) : result.pairs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                  没有相似度高于 {threshold} 的文本对
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr className="text-left">
                      <th className="px-2 py-2 w-12">A</th>
                      <th className="px-2 py-2 w-12">B</th>
                      <th className="px-2 py-2 w-20">相似度</th>
                      <th className="px-2 py-2">预览</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.pairs.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-2 font-mono text-gray-600">#{p.idxA + 1}</td>
                        <td className="px-2 py-2 font-mono text-gray-600">#{p.idxB + 1}</td>
                        <td className="px-2 py-2">
                          <Badge
                            className={
                              p.similarity >= 0.7
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : p.similarity >= 0.5
                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            }
                          >
                            {p.similarity.toFixed(3)}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-gray-700">
                          <div className="line-clamp-1">{items[p.idxA]?.text}</div>
                          <div className="line-clamp-1 text-gray-500">{items[p.idxB]?.text}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
