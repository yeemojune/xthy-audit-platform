'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Construction } from 'lucide-react'

export default function PlaceholderPage() {
  return (
    <>
      <Header title="功能开发中" />
      <div className="p-6">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Construction className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">功能开发中</h2>
            <p className="text-gray-400">该模块正在建设中，敬请期待</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
