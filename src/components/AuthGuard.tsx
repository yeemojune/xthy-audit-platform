'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useAuthStore(s => s.session)
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!hasHydrated) return // 等待从 localStorage 恢复
    if (pathname === '/login') return
    if (!session) {
      router.replace('/login')
    }
  }, [session, pathname, router, hasHydrated])

  // 未 hydrate 完成前不渲染，避免闪烁跳转
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">加载中…</div>
      </div>
    )
  }

  // 登录页直接渲染
  if (pathname === '/login') return <>{children}</>

  // 未登录时不渲染内容
  if (!session) return null

  return <>{children}</>
}
