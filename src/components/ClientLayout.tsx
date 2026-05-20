'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { AuthGuard } from '@/components/AuthGuard'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login' || pathname === '/login/'

  return (
    <AuthGuard>
      {isLoginPage ? (
        <>{children}</>
      ) : (
        <>
          <Sidebar />
          <main className="ml-60 min-h-screen">
            {children}
          </main>
        </>
      )}
    </AuthGuard>
  )
}
