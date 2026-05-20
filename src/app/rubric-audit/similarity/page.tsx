'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuditStore } from '@/lib/audit-store'
import { computeSimilarity } from '@/lib/similarity'
import { exportToExcel, downloadBlob } from '@/lib/excel-parser'
import { GitCompare, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'

function getSimilarityColor(sim: number) {
  if (sim >= 0.95) return 'bg-red-100 text-red-800'
  if (sim >= 0.9) return 'bg-orange-100 text-orange-800'
  if (sim >= 0.8) return 'bg-yellow-100 text-yellow-800'
  if (sim >= 0.7) return 'bg-blue-100 text-blue-800'
  if (sim >= 0.5) return 'bg-purple-100 text-purple-800'
  return 'bg-gray-100 text-gray-700'
}

export default function SimilarityPage() {
  const { auditRows, similarityResult, setSimilarityResult } = useAuditStore()
  const [computing, setComputing] = useState(false)
  const [threshold, setThreshold] = useState(0.3)

  const handleCompute = () => {
    if (auditRows.length === 0) return
    setComputing(true)
    setTimeout(() => {
      const items = auditRows.map(r => ({
        sheet: r.sheet,
        title: r.title.slice(0, 200),
        text: r.title + ' ' + r.rubric,
      }))
      const result = computeSimilarity(items, threshold)
      setSimilarityResult(result)
      setComputing(false)
    }, 100)
  }

  const handleExport = () => {
    if (!similarityResult) return
    const data = similarityResult.pairs.map((p, i) => ({
      序号: i + 1,
      '领域A': p.sheetA,
      '题目A摘要': p.titleA,
      '领域B': p.sheetB,
      '题目B摘要': p.titleB,
      '相似度': p.similarity,
    }))
    const blob = exportToExcel([{ name: '相似度分析结果', data }], '相似度分析.xlsx')
    downloadBlob(blob, '题目相似度分析结果.xlsx')
  }

  if (auditRows.length === 0) {
    return (
      <>
        <Header title="向量相似度分析" />
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <p>请先在 <Link href="/rubric-audit" className="text-blue-600 underline">审核 Rubric</Link> 页面上传数据</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="向量相似度分析" />
      <div className="p-6 space-y-4">
        {/* Controls */}
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">阈值:</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={threshold}
                onChange={e => setThreshold(parseFloat(e.target.value))}
              >
                <option value={0.3}>0.30 (宽松)</option>
                <option value={0.5}>0.50 (中等)</option>
                <option value={0.7}>0.70 (严格)</option>
                <option value={0.9}>0.90 (极严)</option>
              </select>
            </div>
            <Button onClick={handleCompute} disabled={computing}>
              {computing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCompare className="w-4 h-4 mr-2" />}
              {computing ? '计算中...' : '开始分析'}
            </Button>
            {similarityResult && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                导出 Excel
              </Button>
            )}
            {similarityResult && (
              <Badge variant="secondary">
                {similarityResult.totalDocs} 条数据 &middot; {similarityResult.pairs.length} 对相似
              </Badge>
            )}
          </CardContent>
        </Card>

        {computing && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-2">正在计算 TF-IDF + 余弦相似度...</p>
              <Progress value={50} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {similarityResult && similarityResult.pairs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                相似度 ≥ {threshold} 的题目对（共 {similarityResult.pairs.length} 对）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto space-y-2">
                {similarityResult.pairs.slice(0, 200).map((p, i) => (
                  <div key={i} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getSimilarityColor(p.similarity)}>
                        {(p.similarity * 100).toFixed(1)}%
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {p.sheetA === p.sheetB ? '同领域' : '跨领域'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-400">[{p.sheetA}]</span>
                        <p className="text-gray-700 line-clamp-2">{p.titleA}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">[{p.sheetB}]</span>
                        <p className="text-gray-700 line-clamp-2">{p.titleB}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
