'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useAuthStore(s => s.session)
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // 客户端挂载后再读取 zustand 状态，避免 SSR 首屏 hydration 不一致
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (pathname === '/login') return
    if (!session) {
      router.replace('/login')
    }
  }, [session, pathname, router, mounted])

  // 登录页：始终直接渲染，不被 hydration 状态阻塞
  if (pathname === '/login') return <>{children}</>

  // 受保护页面：客户端 mount 前显示占位
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">加载中…</div>
      </div>
    )
  }

  // mount 后未登录则不渲染（useEffect 会触发跳转）
  if (!session) return null

  return <>{children}</>
}
