'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Eye, Upload, FileSpreadsheet, FileJson, FileText,
  Search, Download, X, Copy
} from 'lucide-react'
import { parseExcelBuffer, type ParsedExcel, exportToExcel, downloadBlob } from '@/lib/excel-parser'

type ViewType = 'excel' | 'json' | 'text' | null

interface ViewerState {
  type: ViewType
  fileName: string
  excel?: ParsedExcel
  json?: unknown
  text?: string
  error?: string
}

export default function ViewerPage() {
  const [state, setState] = useState<ViewerState>({ type: null, fileName: '' })
  const [textInput, setTextInput] = useState('')
  const [activeSheet, setActiveSheet] = useState(0)
  const [search, setSearch] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setState({ type: null, fileName: '' })
    setTextInput('')
    setActiveSheet(0)
    setSearch('')
  }

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop() || ''
    try {
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const buf = await file.arrayBuffer()
        const parsed = parseExcelBuffer(buf, file.name)
        setState({ type: 'excel', fileName: file.name, excel: parsed })
        setActiveSheet(0)
      } else if (ext === 'json') {
        const txt = await file.text()
        const data = JSON.parse(txt)
        setState({ type: 'json', fileName: file.name, json: data, text: txt })
      } else {
        const txt = await file.text()
        // 尝试当 JSON 解析
        try {
          const data = JSON.parse(txt)
          setState({ type: 'json', fileName: file.name, json: data, text: txt })
        } catch {
          setState({ type: 'text', fileName: file.name, text: txt })
        }
      }
    } catch (e) {
      setState({ type: null, fileName: file.name, error: (e as Error).message })
    }
  }, [])

  const handleParseText = () => {
    const txt = textInput.trim()
    if (!txt) return
    try {
      const data = JSON.parse(txt)
      setState({ type: 'json', fileName: '粘贴的内容', json: data, text: txt })
    } catch {
      setState({ type: 'text', fileName: '粘贴的内容', text: txt })
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> 返回工具箱
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
          <Eye className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">数据查看器</h1>
          <p className="text-sm text-gray-500">
            上传 Excel/CSV 在线表格预览；上传或粘贴 JSON 自动展开；纯文本直接显示。所有处理在浏览器本地完成。
          </p>
        </div>
      </div>

      {/* Upload zone */}
      {!state.type && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-cyan-400 bg-cyan-50' : 'border-gray-300 hover:border-cyan-300 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <div className="text-sm font-medium text-gray-700">点击或拖拽文件到此处</div>
              <div className="text-xs text-gray-500 mt-1">
                支持 .xlsx / .xls / .csv / .json / .txt 等
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv,.json,.txt,.tsv,.md"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex-1 h-px bg-gray-200" />
              或粘贴文本（JSON 自动解析，否则按文本显示）
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder='例如：{"name":"晓天衡宇","items":[1,2,3]}'
              className="w-full h-40 p-3 font-mono text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-200"
              spellCheck={false}
            />
            <Button onClick={handleParseText} disabled={!textInput.trim()}>
              解析展示
            </Button>

            {state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {state.error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content view */}
      {state.type && (
        <Card>
          <CardContent className="p-4">
            {/* Header bar */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                {state.type === 'excel' && <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                {state.type === 'json' && <FileJson className="w-4 h-4 text-blue-600" />}
                {state.type === 'text' && <FileText className="w-4 h-4 text-gray-600" />}
                <span className="font-medium text-sm">{state.fileName}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {state.type === 'excel' ? `Excel · ${state.excel?.sheets.length} 表` : state.type.toUpperCase()}
                </Badge>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {state.type === 'excel' && (
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!state.excel) return
                    const blob = exportToExcel(
                      state.excel.sheets.map(s => ({ name: s.name, data: s.rows })),
                      state.fileName
                    )
                    downloadBlob(blob, state.fileName.replace(/\.[^.]+$/, '') + '_export.xlsx')
                  }}>
                    <Download className="w-3.5 h-3.5 mr-1" /> 导出 Excel
                  </Button>
                )}
                {(state.type === 'json' || state.type === 'text') && state.text && (
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(state.text!)}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> 复制内容
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={reset}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Excel view */}
            {state.type === 'excel' && state.excel && (
              <ExcelView
                excel={state.excel}
                activeSheet={activeSheet}
                setActiveSheet={setActiveSheet}
                search={search}
                setSearch={setSearch}
              />
            )}

            {/* JSON view */}
            {state.type === 'json' && (
              <JsonView data={state.json} />
            )}

            {/* Plain text */}
            {state.type === 'text' && (
              <pre className="p-4 bg-gray-50 border rounded-md text-xs whitespace-pre-wrap break-words max-h-[70vh] overflow-auto">
                {state.text}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* --------------------------- Excel view --------------------------- */
interface ExcelViewProps {
  excel: ParsedExcel
  activeSheet: number
  setActiveSheet: (n: number) => void
  search: string
  setSearch: (s: string) => void
}

function ExcelView({ excel, activeSheet, setActiveSheet, search, setSearch }: ExcelViewProps) {
  const sheet = excel.sheets[activeSheet]
  const filtered = useMemo(() => {
    if (!sheet) return []
    if (!search.trim()) return sheet.rows
    const q = search.toLowerCase()
    return sheet.rows.filter(row =>
      sheet.headers.some(h => String(row[h] ?? '').toLowerCase().includes(q))
    )
  }, [sheet, search])

  if (!sheet) return <div className="text-sm text-gray-500">空表格</div>

  return (
    <div className="space-y-3">
      {/* Sheet tabs */}
      {excel.sheets.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 border-b">
          {excel.sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveSheet(i)}
              className={`px-3 py-2 text-xs border-b-2 transition-colors -mb-px ${
                i === activeSheet
                  ? 'border-emerald-500 text-emerald-700 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {s.name}
              <span className="ml-1.5 text-[10px] text-gray-400">({s.rows.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索本表内容…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="text-xs text-gray-500">
          显示 <span className="font-medium text-gray-800">{filtered.length}</span> / {sheet.rows.length} 行
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-auto max-h-[70vh]">
        <table className="text-xs w-full border-collapse">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              <th className="px-2 py-2 border-r border-b text-gray-500 font-mono text-[10px] sticky left-0 bg-gray-100 z-20">
                #
              </th>
              {sheet.headers.map(h => (
                <th
                  key={h}
                  className="px-3 py-2 border-r border-b text-left font-medium text-gray-700 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="hover:bg-cyan-50">
                <td className="px-2 py-1.5 border-r border-b text-gray-400 font-mono text-[10px] sticky left-0 bg-white">
                  {i + 1}
                </td>
                {sheet.headers.map(h => {
                  const val = row[h]
                  const text = val === null || val === undefined ? '' : String(val)
                  return (
                    <td
                      key={h}
                      className="px-3 py-1.5 border-r border-b align-top whitespace-pre-wrap break-words"
                      style={{ maxWidth: 360 }}
                    >
                      {search && text ? <Highlight text={text} keyword={search} /> : text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword) return <>{text}</>
  const lower = text.toLowerCase()
  const k = keyword.toLowerCase()
  const idx = lower.indexOf(k)
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 px-0.5 rounded">{text.slice(idx, idx + keyword.length)}</mark>
      {text.slice(idx + keyword.length)}
    </>
  )
}

/* --------------------------- JSON view --------------------------- */
function JsonView({ data }: { data: unknown }) {
  return (
    <div className="border rounded-md p-4 bg-gray-50 max-h-[70vh] overflow-auto font-mono text-xs">
      <JsonNode value={data} keyName="" depth={0} isLast />
    </div>
  )
}

interface JsonNodeProps {
  value: unknown
  keyName: string
  depth: number
  isLast: boolean
}

function JsonNode({ value, keyName, depth }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const indent = { paddingLeft: depth * 12 }
  const renderKey = () =>
    keyName !== '' && <span className="text-purple-700">&quot;{keyName}&quot;</span>

  if (value === null) {
    return (
      <div style={indent}>
        {renderKey()}{keyName !== '' && ': '}<span className="text-gray-500">null</span>
      </div>
    )
  }
  if (typeof value !== 'object') {
    const className =
      typeof value === 'string'
        ? 'text-emerald-700'
        : typeof value === 'number'
        ? 'text-blue-700'
        : 'text-orange-700'
    const display = typeof value === 'string' ? `"${value}"` : String(value)
    return (
      <div style={indent} className="break-all">
        {renderKey()}{keyName !== '' && ': '}
        <span className={className}>{display}</span>
      </div>
    )
  }

  const isArr = Array.isArray(value)
  const entries = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>)
  const open = isArr ? '[' : '{'
  const close = isArr ? ']' : '}'

  return (
    <div style={indent}>
      <span
        onClick={() => setExpanded(e => !e)}
        className="cursor-pointer select-none hover:bg-gray-200 rounded px-0.5"
      >
        {renderKey()}{keyName !== '' && ': '}
        <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
        <span className="text-gray-700"> {open}</span>
        {!expanded && (
          <span className="text-gray-400 ml-1">
            {entries.length} {isArr ? '项' : '字段'} {close}
          </span>
        )}
      </span>
      {expanded && (
        <>
          {entries.map(([k, v], i) => (
            <JsonNode
              key={k}
              keyName={isArr ? '' : k}
              value={v}
              depth={depth + 1}
              isLast={i === entries.length - 1}
            />
          ))}
          <div style={indent}>
            <span className="text-gray-700">{close}</span>
          </div>
        </>
      )}
    </div>
  )
}
