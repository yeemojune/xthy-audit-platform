'use client'

import { useRef, useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuditStore } from '@/lib/audit-store'
import { useConfigStore } from '@/lib/config-store'
import { useAuthStore, canExecuteTask } from '@/lib/auth-store'
import { callLLM } from '@/lib/llm-client'
import { exportToExcel, downloadBlob } from '@/lib/excel-parser'
import { TaskProgressPanel } from '@/components/TaskProgressPanel'
import { Download, Play, Square } from 'lucide-react'
import Link from 'next/link'

const OVERLAP_PROMPT = `你是一名严谨的评分细则（rubric）质量审核专家。

你的任务是检查给定的 rubric 中，各评分项（[+N] 或 [-N] 开头的条目）之间是否存在**重叠/重复**。

重叠的定义：
1. **完全重复**：两个或多个 rubric 项评估的是完全相同的维度/要求，只是表述略有不同
2. **部分重叠**：一个 rubric 项的评估范围已经包含了另一个 rubric 项的评估范围（子集关系）
3. **交叉重叠**：两个 rubric 项评估的维度有明显交集，可能导致同一个表现被重复给分/扣分

注意：
- 同一维度的不同层级拆分（如"格式正确"拆为"标题格式"+"正文格式"）不算重叠
- 对同一对象的不同方面的考量不算重叠
- 只有当两个项可能对**同一个具体表现/产出**重复给分时，才算重叠

输出格式：
- 如果存在重叠，每组重叠列出：
  重叠组N：
  - rubric项A：[+N] 原文...
  - rubric项B：[+N] 原文...
  - 重叠说明：xxx

- 如果不存在重叠问题，输出：无重叠问题`

export default function OverlapPage() {
  const { auditRows, overlapProgress, setOverlapProgress, updateOverlapResult } = useAuditStore()
  const config = useConfigStore(s => s.getActiveConfig())
  const session = useAuthStore(s => s.session)
  const taskAllowed = canExecuteTask(session?.role || 'viewer')
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

    const queue = auditRows.filter(r => !r.overlapResult)
    const total = queue.length
    setOverlapProgress({ running: true, total, done: 0 })

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
        const userPrompt = `请检查以下 rubric 中各评分项之间是否存在重叠/重复：\n\n${row.rubric.slice(0, 12000)}`
        const res = await callLLM(config, OVERLAP_PROMPT, userPrompt)
        const result = res.success ? res.content : `【失败】${res.error}`
        if (!res.success) {
          errCount++
          setErrors(errCount)
        }
        updateOverlapResult(row.sheet, row.idx, result)
        done++
        setOverlapProgress({ done })
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

    setOverlapProgress({ running: false })
    setStarted(false)
  }

  const handleStop = () => {
    abortRef.current = true
  }

  const handleExport = () => {
    const data = auditRows
      .filter(r => r.overlapResult)
      .map((r, i) => ({
        序号: i + 1,
        领域: r.sheet,
        职业: r.occupation || '',
        '题目摘要': r.title.slice(0, 100),
        'rubric重叠检查': r.overlapResult,
      }))
    const blob = exportToExcel([{ name: 'Rubric重叠检查', data }], 'rubric重叠检查.xlsx')
    downloadBlob(blob, 'Rubric重叠检查结果.xlsx')
  }

  const doneCount = auditRows.filter(r => r.overlapResult).length
  const hasOverlap = auditRows.filter(r => r.overlapResult && !r.overlapResult.includes('无重叠')).length

  if (auditRows.length === 0) {
    return (
      <>
        <Header title="Rubric 重叠检查" />
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
      <Header title="Rubric 重叠检查" />
      <div className="p-6 space-y-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4 flex-wrap">
            {!overlapProgress.running ? (
              taskAllowed ? (
                <Button onClick={handleStart}>
                  <Play className="w-4 h-4 mr-2" />
                  {doneCount > 0 ? '继续检查' : '开始检查'}
                </Button>
              ) : (
                <Badge variant="outline" className="text-gray-400">查看模式（无操作权限）</Badge>
              )
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
              <Badge variant={hasOverlap > 0 ? 'destructive' : 'default'}>
                有重叠: {hasOverlap} 条
              </Badge>
            )}
          </CardContent>
        </Card>

        {(overlapProgress.running || (overlapProgress.done > 0 && overlapProgress.done < overlapProgress.total)) && (
          <TaskProgressPanel
            running={overlapProgress.running}
            done={overlapProgress.done}
            total={overlapProgress.total}
            errors={errors}
            startTime={startTime}
            sheetStats={sheetStats}
            label="Rubric 重叠检查中..."
          />
        )}

        {/* Results */}
        {doneCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">检查结果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto space-y-2">
                {auditRows.filter(r => r.overlapResult).map((r, i) => {
                  const hasIssue = r.overlapResult && !r.overlapResult.includes('无重叠')
                  return (
                    <details key={`${r.sheet}-${r.idx}`} className={`border rounded-lg p-3 ${hasIssue ? 'border-orange-200 bg-orange-50/50' : 'border-green-200 bg-green-50/50'}`}>
                      <summary className="cursor-pointer flex items-center gap-2">
                        <Badge variant={hasIssue ? 'destructive' : 'default'} className="text-xs">
                          {hasIssue ? '有重叠' : '无重叠'}
                        </Badge>
                        <span className="text-sm text-gray-600">[{r.sheet}] {r.title.slice(0, 60)}...</span>
                      </summary>
                      <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                        {r.overlapResult}
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
