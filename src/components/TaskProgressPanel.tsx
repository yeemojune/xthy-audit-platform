'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Zap, CheckCircle2, XCircle, Layers } from 'lucide-react'

export interface TaskProgressProps {
  running: boolean
  done: number
  total: number
  errors: number
  startTime: number | null  // timestamp ms
  sheetStats?: Record<string, { done: number; total: number }>
  label?: string
}

export function TaskProgressPanel({ running, done, total, errors, startTime, sheetStats, label }: TaskProgressProps) {
  const [now, setNow] = useState(Date.now())

  // 每秒刷新一次，确保速度/ETA实时更新
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])

  const percent = total > 0 ? (done / total) * 100 : 0
  const elapsed = startTime ? (now - startTime) / 1000 : 0
  const speed = elapsed > 0 ? done / elapsed : 0
  const eta = speed > 0 ? (total - done) / speed : 0

  function formatTime(sec: number) {
    if (sec < 60) return `${Math.round(sec)}s`
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`
    return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`
  }

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {running ? (label || '任务执行中...') : done === total && total > 0 ? '任务完成' : '等待开始'}
          </span>
          <span className="text-sm text-gray-500">{done} / {total}</span>
        </div>

        {/* Progress bar */}
        <Progress value={percent} className="h-2.5" />

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-gray-500">速度:</span>
            <span className="font-medium">{speed.toFixed(1)}/s</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-gray-500">预计剩余:</span>
            <span className="font-medium">{running && eta > 0 ? formatTime(eta) : '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-gray-500">成功:</span>
            <span className="font-medium text-green-600">{done - errors}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-gray-500">失败:</span>
            <span className={`font-medium ${errors > 0 ? 'text-red-600' : ''}`}>{errors}</span>
          </div>
        </div>

        {/* Elapsed */}
        {elapsed > 0 && (
          <div className="text-xs text-gray-400">
            已耗时: {formatTime(elapsed)}
            {!running && done === total && total > 0 && ` · 平均 ${(elapsed / total).toFixed(1)}s/条`}
          </div>
        )}

        {/* Per-sheet stats */}
        {sheetStats && Object.keys(sheetStats).length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
              <Layers className="w-3 h-3" />
              <span>各领域进度</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(sheetStats).map(([sheet, stat]) => (
                <div key={sheet} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
                  <span className="text-gray-600 truncate max-w-[100px]">{sheet}</span>
                  <Badge variant={stat.done === stat.total ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                    {stat.done}/{stat.total}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
