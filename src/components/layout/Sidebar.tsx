'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  FlaskConical, Settings, LayoutDashboard,
  Package, FileText, Users, BarChart3, Shield, LogOut, Wrench,
  Sparkles, Database, FolderKanban
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore, canAccessSettings, ROLE_LABELS } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { href: '/', label: '工作台', icon: LayoutDashboard },
  { href: '/projects', label: '项目', icon: FolderKanban },
  { href: '/eval', label: '评测中心', icon: Sparkles },
  { href: '/templates', label: '模板库', icon: FileText },
  { href: '/datasets', label: '数据集', icon: Database },
  { href: '/prompt-test', label: 'Prompt 测试', icon: FlaskConical },
  { href: '/tools', label: '工具箱', icon: Wrench },
  { href: '/module-3', label: '质量监控', icon: BarChart3 },
  { href: '/module-4', label: '人员管理', icon: Users },
  { href: '/module-5', label: '任务分配', icon: Package },
]

const adminNavItems = [
  { href: '/admin/users', label: '权限管理', icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const session = useAuthStore(s => s.session)
  const logout = useAuthStore(s => s.logout)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const showSettings = session && canAccessSettings(session.role)

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-[#0f1b2d] text-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold">
          衡
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide">晓天衡宇</div>
          <div className="text-[10px] text-blue-300/70">数据审核平台</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-blue-600/30 text-blue-200 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
        {/* 仅管理员可见的模块 */}
        {showSettings && adminNavItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-blue-600/30 text-blue-200 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: settings + user */}
      <div className="px-3 py-3 border-t border-white/10 space-y-1">
        {showSettings && (
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === '/settings'
                ? 'bg-blue-600/30 text-blue-200'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            )}
          >
            <Settings className="w-4 h-4" />
            系统设置
          </Link>
        )}
        {session && (
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center text-[10px] text-blue-200">
                {session.username[0]}
              </div>
              <div>
                <div className="text-xs text-gray-300">{session.username}</div>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-white/10 text-gray-400">
                  {ROLE_LABELS[session.role]}
                </Badge>
              </div>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-gray-300 transition-colors" title="退出登录">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
