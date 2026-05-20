'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeEditor } from '@/components/CodeEditor'
import { useDatasetStore, type DatasetField } from '@/lib/dataset-store'
import { parseExcelBuffer } from '@/lib/excel-parser'
import { flattenJson, inferFieldsFromRows } from '@/lib/json-flatten'
import { ArrowLeft, Upload, FileSpreadsheet, FileJson, Save, AlertCircle } from 'lucide-react'

export default function DatasetNewPage() {
  const router = useRouter()
  const addDataset = useDatasetStore((s) => s.addDataset)

  const [tab, setTab] = useState<'excel' | 'json'>('excel')
  const [name, setName] = useState('')
  const [excelFileName, setExcelFileName] = useState('')
  const [excelRows, setExcelRows] = useState<Record<string, unknown>[]>([])
  const [excelFields, setExcelFields] = useState<DatasetField[]>([])
  const [excelSheetInfo, setExcelSheetInfo] = useState('')

  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [jsonRows, setJsonRows] = useState<Record<string, unknown>[]>([])
  const [jsonFields, setJsonFields] = useState<DatasetField[]>([])
  const [jsonRaw, setJsonRaw] = useState<unknown>(null)

  async function handleExcel(file: File) {
    const buf = await file.arrayBuffer()
    const parsed = parseExcelBuffer(buf, file.name)
    if (parsed.sheets.length === 0) {
      alert('未识别到任何 Sheet 数据')
      return
    }
    // 仅取首个 Sheet 作为主数据。多 Sheet 用户可以多次上传。
    const sheet = parsed.sheets[0]
    const fields: DatasetField[] = sheet.headers.map((h) => {
      const sample = sheet.rows.find((r) => r[h] !== null && r[h] !== undefined && r[h] !== '')?.[h]
      const t = typeof sample
      return {
        path: h,
        label: h,
        type: (t === 'number' ? 'number' : t === 'boolean' ? 'boolean' : 'string') as DatasetField['type'],
        sample: sample ?? null,
      }
    })
    const rows: Record<string, unknown>[] = sheet.rows.map((r) => ({ ...r }))
    setExcelFileName(file.name)
    setExcelFields(fields)
    setExcelRows(rows)
    setExcelSheetInfo(
      parsed.sheets.length > 1
        ? '检测到 ' + parsed.sheets.length + ' 个 Sheet，仅导入第一个：' + sheet.name
        : 'Sheet：' + sheet.name
    )
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
  }

  function handleJsonParse() {
    setJsonError('')
    if (!jsonText.trim()) {
      setJsonError('请输入或粘贴 JSON 内容')
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch (e) {
      setJsonError('JSON 解析失败：' + String(e))
      return
    }
    setJsonRaw(parsed)
    // 找到第一个数组当作行列表；如果根就是数组直接用；如果是对象则按对象自身作为单行
    let rows: unknown[] = []
    if (Array.isArray(parsed)) {
      rows = parsed
    } else if (parsed && typeof parsed === 'object') {
      // 找第一个数组属性
      const obj = parsed as Record<string, unknown>
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]))
      if (arrayKey) {
        rows = obj[arrayKey] as unknown[]
      } else {
        rows = [parsed]
      }
    }
    if (rows.length === 0) {
      setJsonError('未识别到任何数据行')
      return
    }
    // 推断字段（跨行取并集）
    const inferred = inferFieldsFromRows(rows.slice(0, 50))
    const fields: DatasetField[] = inferred.map((f) => ({
      path: f.path,
      label: f.path,
      type: f.type,
      sample: f.sample,
    }))
    // 把每行扁平化为 { path: value }
    const flatRows = rows.map((r) => {
      const flat = flattenJson(r)
      const obj: Record<string, unknown> = {}
      for (const f of flat) obj[f.path] = f.value
      return obj
    })
    setJsonRows(flatRows)
    setJsonFields(fields)
    if (!name) setName('json-dataset-' + new Date().toISOString().slice(0, 10))
  }

  function save() {
    if (!name.trim()) {
      alert('请填写数据集名称')
      return
    }
    if (tab === 'excel') {
      if (excelRows.length === 0) {
        alert('请先上传 Excel 文件')
        return
      }
      const id = addDataset({
        name: name.trim(),
        source: 'excel',
        fileName: excelFileName,
        fields: excelFields,
        rows: excelRows,
      })
      router.push('/datasets/detail?id=' + id)
    } else {
      if (jsonRows.length === 0) {
        alert('请先解析 JSON')
        return
      }
      const id = addDataset({
        name: name.trim(),
        source: 'json',
        fields: jsonFields,
        rows: jsonRows,
        rawJson: jsonRaw,
      })
      router.push('/datasets/detail?id=' + id)
    }
  }

  const currentFields = tab === 'excel' ? excelFields : jsonFields
  const currentRowsCount = tab === 'excel' ? excelRows.length : jsonRows.length
  const overSized = currentRowsCount > 500

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/datasets')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">上传数据集</h1>
        </div>
        <Button onClick={save} disabled={currentRowsCount === 0}>
          <Save className="w-4 h-4 mr-2" /> 保存
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div>
            <Label className="text-xs text-gray-600">数据集名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：商品标题样本-2024Q1"
              className="mt-1"
            />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'excel' | 'json')}>
            <TabsList>
              <TabsTrigger value="excel">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel / CSV
              </TabsTrigger>
              <TabsTrigger value="json">
                <FileJson className="w-3.5 h-3.5 mr-1" /> JSON
              </TabsTrigger>
            </TabsList>

            <TabsContent value="excel" className="space-y-3 mt-4">
              <label className="block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleExcel(f)
                  }}
                />
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <div className="text-sm text-gray-600">点击选择 Excel/CSV 文件</div>
                {excelFileName && (
                  <div className="text-xs text-emerald-600 mt-2">已选：{excelFileName}</div>
                )}
                {excelSheetInfo && <div className="text-xs text-gray-500 mt-1">{excelSheetInfo}</div>}
              </label>
            </TabsContent>

            <TabsContent value="json" className="space-y-3 mt-4">
              <CodeEditor
                value={jsonText}
                onChange={setJsonText}
                language="json"
                height="240px"
                placeholder='粘贴 JSON：可以是数组 [...] 或包含数组属性的对象 { "data": [...] }'
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleJsonParse}>
                  解析 JSON
                </Button>
                {jsonRows.length > 0 && (
                  <span className="text-xs text-emerald-600">
                    已识别 {jsonRows.length} 行 / {jsonFields.length} 字段
                  </span>
                )}
              </div>
              {jsonError && (
                <div className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {jsonError}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {currentFields.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-600">识别到的字段</Label>
                <span className="text-xs text-gray-500">{currentRowsCount} 行</span>
              </div>
              {overSized && (
                <div className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  数据量较大（超过 500 行），建议分批上传以避免浏览器存储压力
                </div>
              )}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">字段路径</th>
                      <th className="px-3 py-2 text-left w-24">类型</th>
                      <th className="px-3 py-2 text-left">示例值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFields.slice(0, 30).map((f) => (
                      <tr key={f.path} className="border-t">
                        <td className="px-3 py-1.5 font-mono text-xs">{f.path}</td>
                        <td className="px-3 py-1.5">
                          <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-600 truncate max-w-[400px]">
                          {f.sample === null || f.sample === undefined
                            ? '(空)'
                            : typeof f.sample === 'object'
                            ? JSON.stringify(f.sample).slice(0, 80)
                            : String(f.sample).slice(0, 80)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {currentFields.length > 30 && (
                  <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t">
                    还有 {currentFields.length - 30} 个字段未显示...
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
