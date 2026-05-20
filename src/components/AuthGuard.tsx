'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useAuthStore(s => s.session)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // 登录页无需守卫
    if (pathname === '/login') return
    if (!session) {
      router.replace('/login')
    }
  }, [session, pathname, router])

  // 登录页直接渲染
  if (pathname === '/login') return <>{children}</>

  // 未登录时不渲染内容
  if (!session) return null

  return <>{children}</>
}
