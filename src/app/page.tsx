'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FlaskConical, FileText, BarChart3, Users, Package, Shield,
  Sparkles, Database, Wrench, ArrowRight, Plus, FolderKanban,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTaskStore } from '@/lib/task-store'
import { useDatasetStore } from '@/lib/dataset-store'
import { useTemplateStore } from '@/lib/template-store'

const coreModules = [
  { href: '/projects', title: '项目管理', desc: '配置项目工作流，多模板一键跑批', icon: FolderKanban, color: 'bg-indigo-50 text-indigo-600' },
  { href: '/eval', title: '评测中心', desc: '上传数据 → 选模板 → 跑批 → 导出', icon: Sparkles, color: 'bg-blue-50 text-blue-600' },
  { href: '/templates', title: '模板库', desc: 'Prompt 模板 + 输出 JSON Schema', icon: FileText, color: 'bg-purple-50 text-purple-600' },
  { href: '/datasets', title: '数据集', desc: 'Excel / JSON 数据上传与字段管理', icon: Database, color: 'bg-emerald-50 text-emerald-600' },
  { href: '/prompt-test', title: 'Prompt 测试', desc: '快速调优 Prompt，对比不同版本效果', icon: FlaskConical, color: 'bg-cyan-50 text-cyan-600' },
  { href: '/tools', title: '工具箱', desc: 'JSON 校验、相似度、数据查看器等', icon: Wrench, color: 'bg-amber-50 text-amber-600' },
]

const futureModules = [
  { href: '/module-3', title: '质量监控', icon: BarChart3 },
  { href: '/module-4', title: '人员管理', icon: Users },
  { href: '/module-5', title: '任务分配', icon: Package },
  { href: '/module-6', title: '权限管理', icon: Shield },
]

export default function HomePage() {
  const tasks = useTaskStore((s) => s.tasks)
  const datasets = useDatasetStore((s) => s.datasets)
  const templates = useTemplateStore((s) => s.templates)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  return (
    <>
      <Header title="工作台" />
      <div className="p-6 space-y-6">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] p-8 text-white relative overflow-hidden">
          <h2 className="text-2xl font-bold mb-2">晓天衡宇数据评测平台</h2>
          <p className="text-blue-100 text-sm mb-5">
            上传 Excel / JSON，选字段，写 Prompt，批量调用 LLM，自动整理回 Excel
          </p>
          <div className="flex items-center gap-2">
            <Link href="/eval/new">
              <Button className="bg-white text-blue-700 hover:bg-blue-50">
                <Plus className="w-4 h-4 mr-2" /> 新建评测
              </Button>
            </Link>
            <Link href="/templates">
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                浏览模板库 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {hydrated && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="数据集" value={datasets.length} href="/datasets" icon={Database} />
            <StatCard label="模板" value={templates.length} href="/templates" icon={FileText} />
            <StatCard label="评测任务" value={tasks.length} href="/eval" icon={Sparkles} />
            <StatCard
              label="进行中"
              value={tasks.filter((t) => t.status === 'running').length}
              href="/eval"
              icon={ArrowRight}
            />
          </div>
        )}

        {/* 核心模块 */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">核心功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreModules.map((m) => (
              <Link key={m.href} href={m.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className={'w-10 h-10 rounded-lg flex items-center justify-center ' + m.color}>
                      <m.icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base">{m.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">{m.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* 即将上线 */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">规划中</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {futureModules.map((m) => (
              <Link key={m.href} href={m.href}>
                <Card className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                  <CardContent className="pt-4 pb-3 flex items-center gap-2">
                    <m.icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{m.title}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string
  value: number
  href: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-4 pb-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-2xl font-semibold mt-0.5">{value}</div>
          </div>
          <Icon className="w-6 h-6 text-blue-500/60" />
        </CardContent>
      </Card>
    </Link>
  )
}
