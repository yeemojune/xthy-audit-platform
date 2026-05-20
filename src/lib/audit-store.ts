import { create } from 'zustand'
import { ParsedExcel, SheetData } from './excel-parser'
import { SimilarityResult } from './similarity'

export interface AuditRow {
  sheet: string
  idx: number
  title: string
  rubric: string
  occupation?: string
  overlapResult?: string
  verifyResult?: string
}

export interface AuditState {
  // uploaded data
  parsedExcel: ParsedExcel | null
  auditRows: AuditRow[]
  setParsedExcel: (data: ParsedExcel) => void

  // similarity
  similarityResult: SimilarityResult | null
  setSimilarityResult: (r: SimilarityResult) => void

  // overlap check
  overlapProgress: { done: number; total: number; running: boolean }
  setOverlapProgress: (p: Partial<AuditState['overlapProgress']>) => void
  updateOverlapResult: (sheet: string, idx: number, result: string) => void

  // verify
  verifyProgress: { done: number; total: number; running: boolean }
  setVerifyProgress: (p: Partial<AuditState['verifyProgress']>) => void
  updateVerifyResult: (sheet: string, idx: number, result: string) => void

  // reset
  reset: () => void
}

const DOMAIN_SHEETS = ['信息技术服务业', '金融业', '教育_在线教育', '高校_研究所',
  '法院_检察院_律所', '人力资源', '媒体_新媒体']

function extractRows(sheets: SheetData[]): AuditRow[] {
  const rows: AuditRow[] = []
  for (const sheet of sheets) {
    if (!DOMAIN_SHEETS.includes(sheet.name) && !sheet.headers.includes('rubric') && !sheet.headers.includes('rubric_final')) continue
    for (let i = 0; i < sheet.rows.length; i++) {
      const row = sheet.rows[i]
      const title = (row['题目_final'] || row['题目'] || '') as string
      const rubric = (row['rubric_final'] || row['rubric'] || '') as string
      if (!title || !rubric) continue
      rows.push({
        sheet: sheet.name,
        idx: i,
        title: String(title),
        rubric: String(rubric),
        occupation: row['职业'] ? String(row['职业']) : undefined,
      })
    }
  }
  return rows
}

export const useAuditStore = create<AuditState>((set, get) => ({
  parsedExcel: null,
  auditRows: [],
  setParsedExcel: (data) => {
    const rows = extractRows(data.sheets)
    set({ parsedExcel: data, auditRows: rows })
  },

  similarityResult: null,
  setSimilarityResult: (r) => set({ similarityResult: r }),

  overlapProgress: { done: 0, total: 0, running: false },
  setOverlapProgress: (p) => set((s) => ({ overlapProgress: { ...s.overlapProgress, ...p } })),
  updateOverlapResult: (sheet, idx, result) => set((s) => ({
    auditRows: s.auditRows.map(r => r.sheet === sheet && r.idx === idx ? { ...r, overlapResult: result } : r)
  })),

  verifyProgress: { done: 0, total: 0, running: false },
  setVerifyProgress: (p) => set((s) => ({ verifyProgress: { ...s.verifyProgress, ...p } })),
  updateVerifyResult: (sheet, idx, result) => set((s) => ({
    auditRows: s.auditRows.map(r => r.sheet === sheet && r.idx === idx ? { ...r, verifyResult: result } : r)
  })),

  reset: () => set({
    parsedExcel: null, auditRows: [],
    similarityResult: null,
    overlapProgress: { done: 0, total: 0, running: false },
    verifyProgress: { done: 0, total: 0, running: false },
  }),
}))
