'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calculator } from 'lucide-react'

function analyze(text: string) {
  const totalChars = text.length
  const trimmed = text.trim()
  const noSpace = text.replace(/\s/g, '')
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  const englishLetters = (text.match(/[a-zA-Z]/g) || []).length
  const digits = (text.match(/[0-9]/g) || []).length
  const punctuation = (text.match(/[，。！？、；：""''（）【】《》,\.\!\?;:'"\(\)\[\]\{\}]/g) || []).length
  const lines = text === '' ? 0 : text.split('\n').length
  const nonEmptyLines = text.split('\n').filter(l => l.trim().length > 0).length

  // Token 估算（经验比例）
  // - 中文 ~ 1 token/字
  // - 英文 ~ 0.75 token/单词 (~ 4 字符/token)
  // - 数字+符号约 0.3 token/字
  const estTokensCN = chineseChars
  const estTokensEN = Math.ceil(englishLetters / 4)
  const estTokensOther = Math.ceil((digits + punctuation) * 0.3)
  const estTokensTotal = estTokensCN + estTokensEN + estTokensOther

  return {
    totalChars,
    trimmedChars: trimmed.length,
    noSpaceChars: noSpace.length,
    chineseChars,
    englishWords,
    englishLetters,
    digits,
    punctuation,
    lines,
    nonEmptyLines,
    bytes: new Blob([text]).size,
    estTokensTotal,
    estTokensCN,
    estTokensEN,
  }
}

interface StatItemProps {
  label: string
  value: number | string
  hint?: string
  highlight?: boolean
}

function StatItem({ label, value, hint, highlight }: StatItemProps) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${highlight ? 'text-amber-700' : 'text-gray-800'}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
  )
}

export default function TextStatsPage() {
  const [input, setInput] = useState('')
  const stats = useMemo(() => analyze(input), [input])

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> 返回工具箱
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">字数 / Token 统计</h1>
          <p className="text-sm text-gray-500">
            统计中英文字符、行数、字节数，并按经验比例估算 token 数（仅供参考，不同模型分词不同）。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">输入文本</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="粘贴或输入待统计的文本……"
              className="w-full h-[28rem] p-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-200"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">统计结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2.5">
              <StatItem
                label="估算 Token 总数"
                value={stats.estTokensTotal.toLocaleString()}
                hint={`中文≈${stats.estTokensCN} + 英文≈${stats.estTokensEN}`}
                highlight
              />
              <StatItem label="字节数 (UTF-8)" value={`${stats.bytes} B`} highlight />
              <StatItem label="总字符数" value={stats.totalChars} hint="含空白" />
              <StatItem label="去空白字符数" value={stats.noSpaceChars} />
              <StatItem label="中文字符" value={stats.chineseChars} />
              <StatItem label="英文字母" value={stats.englishLetters} hint={`${stats.englishWords} 个单词`} />
              <StatItem label="数字" value={stats.digits} />
              <StatItem label="标点" value={stats.punctuation} />
              <StatItem label="总行数" value={stats.lines} hint={`非空行 ${stats.nonEmptyLines}`} />
            </div>

            <div className="mt-4 p-3 bg-gray-50 border rounded-md text-[11px] text-gray-500 leading-relaxed">
              Token 估算依据经验比例：中文约 1 token/字，英文约 4 字符/token。实际取决于具体模型 tokenizer，
              GPT/Claude/Qwen 略有差异。如需精确数值，请使用对应模型官方接口的 token usage。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
