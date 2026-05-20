'use client'

import { useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuditStore } from '@/lib/audit-store'
import { useAuthStore, canUpload, canExecuteTask, getUploadRowLimit } from '@/lib/auth-store'
import { parseExcelBuffer } from '@/lib/excel-parser'
import { Upload, GitCompare, Layers, ShieldCheck, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

export default function RubricAuditPage() {
  const { parsedExcel, auditRows, setParsedExcel, reset } = useAuditStore()
  const session = useAuthStore(s => s.session)
  const role = session?.role || 'viewer'
  const uploadAllowed = canUpload(role)
  const taskAllowed = canExecuteTask(role)
  const rowLimit = getUploadRowLimit(role)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buffer = await file.arrayBuffer()
    const parsed = parseExcelBuffer(buffer, file.name)
    // 运营角色限制行数
    if (rowLimit) {
      const totalRows = parsed.sheets.reduce((sum, s) => sum + s.rows.length, 0)
      if (totalRows > rowLimit) {
        alert(`您的角色为“运营”，最多只能上传 ${rowLimit} 行数据，当前文件包含 ${totalRows} 行。`)
        return
      }
    }
    setParsedExcel(parsed)
  }, [setParsedExcel, rowLimit])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    if (!uploadAllowed) return
    const file = e.dataTransfer.files[0]
    if (!file) return
    const buffer = await file.arrayBuffer()
    const parsed = parseExcelBuffer(buffer, file.name)
    if (rowLimit) {
      const totalRows = parsed.sheets.reduce((sum, s) => sum + s.rows.length, 0)
      if (totalRows > rowLimit) {
        alert(`您的角色为“运营”，最多只能上传 ${rowLimit} 行数据，当前文件包含 ${totalRows} 行。`)
        return
      }
    }
    setParsedExcel(parsed)
  }, [setParsedExcel, uploadAllowed, rowLimit])

  return (
    <>
      <Header title="审核 Rubric" />
      <div className="p-6 space-y-6">
        {/* Upload area */}
        {!parsedExcel ? (
          <Card>
            <CardContent className="pt-6">
              {uploadAllowed ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">拖拽 Excel 文件到此处，或点击选择</p>
                  <p className="text-sm text-gray-400 mb-1">支持 .xlsx 格式</p>
                  {rowLimit && (
                    <p className="text-xs text-orange-500 mb-3">您的角色为“运营”，最多可上传 {rowLimit} 行数据</p>
                  )}
                  <label className="inline-block">
                    <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm cursor-pointer hover:bg-blue-700">
                      选择文件
                    </span>
                  </label>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                  <Upload className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400">您的角色为“查看人员”，无法上传数据</p>
                  <p className="text-sm text-gray-300 mt-1">请联系管理员或运营人员上传</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* File info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div>
                    <CardTitle className="text-base">{parsedExcel.fileName}</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {parsedExcel.sheets.length} 个 Sheet &middot; {auditRows.length} 行有效数据
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={reset}>
                  重新上传
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parsedExcel.sheets.map(s => (
                    <Badge key={s.name} variant="secondary">
                      {s.name} ({s.rows.length})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Function cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/rubric-audit/similarity">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                      <GitCompare className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base">向量相似度分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      基于 TF-IDF + 余弦相似度，分析题目间的文本相似程度，发现重复/高度相似的题目对
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/rubric-audit/overlap">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-2">
                      <Layers className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base">Rubric 重叠检查</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      调用 AI 检查每条 rubric 内部的评分项是否存在重叠/重复评分风险
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/rubric-audit/verify">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-2">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base">AI 校验</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      三维度全面校验：未覆盖题目 / 量化指标冲突 / 前后矛盾重复
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  )
}
