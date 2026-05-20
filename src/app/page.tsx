'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardCheck, FileText, BarChart3, Users, Package, Shield } from 'lucide-react'
import Link from 'next/link'

const modules = [
  { href: '/rubric-audit', title: '审核 Rubric', desc: '题目与评分细则的质量审核', icon: ClipboardCheck, active: true },
  { href: '/module-2', title: '数据标注', desc: '即将上线', icon: FileText, active: false },
  { href: '/module-3', title: '质量监控', desc: '即将上线', icon: BarChart3, active: false },
  { href: '/module-4', title: '人员管理', desc: '即将上线', icon: Users, active: false },
  { href: '/module-5', title: '任务分配', desc: '即将上线', icon: Package, active: false },
  { href: '/module-6', title: '权限管理', desc: '即将上线', icon: Shield, active: false },
]

export default function HomePage() {
  return (
    <>
      <Header title="工作台" />
      <div className="p-6">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] p-8 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-2">晓天衡宇数据审核平台</h2>
          <p className="text-blue-100 text-sm">高效、精准的数据质量审核与管理系统</p>
        </div>

        {/* Module grid */}
        <h3 className="text-sm font-medium text-gray-500 mb-4">功能模块</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(m => (
            <Link key={m.href} href={m.href}>
              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${!m.active ? 'opacity-50' : ''}`}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.active ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
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
    </>
  )
}
