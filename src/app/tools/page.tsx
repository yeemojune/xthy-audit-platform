'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileJson, FileText, GitCompare, Calculator, Wrench, Eye } from 'lucide-react'

const tools = [
  {
    href: '/tools/viewer',
    title: '数据查看器',
    desc: '上传或拖入 Excel/CSV/JSON 文件，自动识别类型并渲染为表格或 JSON 树。',
    icon: Eye,
    color: 'bg-cyan-50 text-cyan-600',
    tag: '推荐',
  },
  {
    href: '/tools/json-validator',
    title: 'JSON 校验与格式化',
    desc: '粘贴 JSON，一键检查语法错误、美化缩进或压缩为单行。',
    icon: FileJson,
    color: 'bg-blue-50 text-blue-600',
    tag: '常用',
  },
  {
    href: '/tools/json-text',
    title: 'JSON ↔ 纯文本提取',
    desc: '从 JSON 中抽取所有 string 字段为纯文本，或反向把段落转为 JSON 数组。',
    icon: FileText,
    color: 'bg-emerald-50 text-emerald-600',
    tag: '常用',
  },
  {
    href: '/tools/similarity',
    title: '向量相似度（独立版）',
    desc: '粘贴一组文本，按 TF-IDF + 余弦相似度算法计算两两相似度，支持阈值过滤。',
    icon: GitCompare,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    href: '/tools/text-stats',
    title: '字数 / Token 统计',
    desc: '统计文本中英文字符数、行数、空白占比，并估算 token 数量（按经验比例）。',
    icon: Calculator,
    color: 'bg-amber-50 text-amber-600',
  },
]

export default function ToolsIndexPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#0f1b2d] text-white flex items-center justify-center">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">工具箱</h1>
          <p className="text-sm text-gray-500 mt-1">
            一系列面向数据标注/审核人员的轻量工具，所有处理在浏览器本地完成，不上传服务器。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map(t => (
          <Link key={t.href} href={t.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.color}`}>
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{t.title}</h3>
                      {t.tag && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {t.tag}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
