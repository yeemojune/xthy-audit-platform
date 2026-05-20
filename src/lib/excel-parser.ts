import * as XLSX from 'xlsx'

export interface SheetData {
  name: string
  headers: string[]
  rows: Record<string, string | number | null>[]
}

export interface ParsedExcel {
  sheets: SheetData[]
  fileName: string
}

export function parseExcelBuffer(buffer: ArrayBuffer, fileName: string): ParsedExcel {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheets: SheetData[] = []

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const json = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(ws, { defval: null })
    if (json.length === 0) continue
    const headers = Object.keys(json[0])
    sheets.push({ name, headers, rows: json })
  }

  return { sheets, fileName }
}

export interface ExportColumn {
  header: string
  key: string
}

export function exportToExcel(
  sheets: { name: string; data: Record<string, unknown>[]; columns?: ExportColumn[] }[],
  fileName: string
): Blob {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  }
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
