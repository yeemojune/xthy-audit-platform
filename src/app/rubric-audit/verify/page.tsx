'use client'

import { useRef, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuditStore } from '@/lib/audit-store'
import { useConfigStore } from '@/lib/config-store'
import { callLLM } from '@/lib/llm-client'
import { exportToExcel, downloadBlob } from '@/lib/excel-parser'
import { TaskProgressPanel } from '@/components/TaskProgressPanel'
import { Download, Play, Square } from 'lucide-react'
import Link from 'next/link'

const VERIFY_PROMPT = `你是一名严谨的题目与评分细则（rubric）对齐性审核专家。

## 背景
rubric 是对题目中交付物要求的量化拆解项，目的是通过拆分的要求项，**不重复**、**不遗漏**、**不错误**地构建对交付的量化指标。

## 你的任务（三项）
1. **未覆盖题目**：分析题目的交付物要求中，是否存在 rubric 项未覆盖的部分。
2. **与题目量化指标冲突**：分析 rubric 项中，是否存在与题目中明确指出的量化指标（明确说明了特定数字的指标）不同的地方。
3. **前后矛盾/重复**：分析 rubric 项中，是否存在自身的前后矛盾与重复。

## 严格规则
- 「未覆盖」：只有题目中明确要求了某项交付成果或具体要求，而 rubric 中完全没有对应评分项时才算
- 「量化指标冲突」：只有题目中给出了**明确数字**，而 rubric 中对应数字不一致时才算
- 如果题目未提及特定指标，rubric 自行添加了数字标准，**不算冲突**
- 务必列出所有问题项，不遗漏
- 仅列出问题项，无问题则输出"无问题"

## 输出格式（每个问题一段，问题间空行分隔）
问题类型：未覆盖题目/与题目量化指标冲突/前后矛盾/前后重复
rubric项：[+N] 原文引用
问题描述：具体说明问题`

export default function VerifyPage() {
  const { auditRows, verifyProgress, setVerifyProgress, updateVerifyResult } = useAuditStore()
  const config = useConfigStore(s => s.getActiveConfig())
  const abortRef = useRef(false)
  const [started, setStarted] = useState(false)
  const [errors, setErrors] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [sheetStats, setSheetStats] = useState<Record<string, { done: number; total: number }>>({})

  const handleStart = async () => {
    if (auditRows.length === 0) return
    abortRef.current = false
    setStarted(true)
    setErrors(0)
    setStartTime(Date.now())

    const queue = auditRows.filter(r => !r.verifyResult)
    const total = queue.length
    setVerifyProgress({ running: true, total, done: 0 })

    // 计算各领域总数
    const initStats: Record<string, { done: number; total: number }> = {}
    queue.forEach(r => {
      if (!initStats[r.sheet]) initStats[r.sheet] = { done: 0, total: 0 }
      initStats[r.sheet].total++
    })
    setSheetStats(initStats)

    let done = 0
    let errCount = 0
    const concurrency = config.concurrency

    const runBatch = async (batch: typeof queue) => {
      await Promise.all(batch.map(async (row) => {
        if (abortRef.current) return
        const userPrompt = `请审核以下题目与 rubric，按三维度找出所有问题项。\n\n【题目】\n${row.title.slice(0, 8000)}\n\n【Rubric】\n${row.rubric.slice(0, 10000)}`
        const res = await callLLM(config, VERIFY_PROMPT, userPrompt)
        const result = res.success ? res.content : `【失败】${res.error}`
        if (!res.success) {
          errCount++
          setErrors(errCount)
        }
        updateVerifyResult(row.sheet, row.idx, result)
        done++
        setVerifyProgress({ done })
        setSheetStats(prev => ({
          ...prev,
          [row.sheet]: { ...prev[row.sheet], done: (prev[row.sheet]?.done || 0) + 1 }
        }))
      }))
    }

    for (let i = 0; i < queue.length; i += concurrency) {
      if (abortRef.current) break
      await runBatch(queue.slice(i, i + concurrency))
    }

    setVerifyProgress({ running: false })
    setStarted(false)
  }

  const handleStop = () => {
    abortRef.current = true
  }

  const handleExport = () => {
    const data = auditRows
      .filter(r => r.verifyResult)
      .map((r, i) => ({
        序号: i + 1,
        领域: r.sheet,
        职业: r.occupation || '',
        '题目摘要': r.title.slice(0, 100),
        'AI校验结果': r.verifyResult,
      }))
    const blob = exportToExcel([{ name: 'AI校验', data }], 'AI校验.xlsx')
    downloadBlob(blob, 'AI校验结果.xlsx')
  }

  const doneCount = auditRows.filter(r => r.verifyResult).length
  const hasIssueCount = auditRows.filter(r => r.verifyResult && !r.verifyResult.includes('无问题')).length

  if (auditRows.length === 0) {
    return (
      <>
        <Header title="AI 校验" />
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
      <Header title="AI 校验" />
      <div className="p-6 space-y-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4 flex-wrap">
            {!verifyProgress.running ? (
              <Button onClick={handleStart}>
                <Play className="w-4 h-4 mr-2" />
                {doneCount > 0 ? '继续校验' : '开始校验'}
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleStop}>
                <Square className="w-4 h-4 mr-2" />
                停止
              </Button>
            )}
            {doneCount > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                导出 Excel
              </Button>
            )}
            <Badge variant="secondary">
              进度: {doneCount}/{auditRows.length}
            </Badge>
            {doneCount > 0 && (
              <Badge variant={hasIssueCount > 0 ? 'destructive' : 'default'}>
                有问题: {hasIssueCount} 条
              </Badge>
            )}
          </CardContent>
        </Card>

        {(verifyProgress.running || (verifyProgress.done > 0 && verifyProgress.done < verifyProgress.total)) && (
          <TaskProgressPanel
            running={verifyProgress.running}
            done={verifyProgress.done}
            total={verifyProgress.total}
            errors={errors}
            startTime={startTime}
            sheetStats={sheetStats}
            label="AI 三维度校验中..."
          />
        )}

        {/* Results */}
        {doneCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">校验结果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto space-y-2">
                {auditRows.filter(r => r.verifyResult).map((r, i) => {
                  const hasIssue = r.verifyResult && !r.verifyResult.includes('无问题')
                  return (
                    <details key={`${r.sheet}-${r.idx}`} className={`border rounded-lg p-3 ${hasIssue ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
                      <summary className="cursor-pointer flex items-center gap-2">
                        <Badge variant={hasIssue ? 'destructive' : 'default'} className="text-xs">
                          {hasIssue ? '有问题' : '无问题'}
                        </Badge>
                        <span className="text-sm text-gray-600">[{r.sheet}] {r.title.slice(0, 60)}...</span>
                      </summary>
                      <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                        {r.verifyResult}
                      </pre>
                    </details>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
