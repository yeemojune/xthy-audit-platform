'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuthStore, UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/auth-store'
import { Shield, Users, Eye } from 'lucide-react'

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="w-6 h-6" />,
  operator: <Users className="w-6 h-6" />,
  viewer: <Eye className="w-6 h-6" />,
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
  operator: 'border-green-300 bg-green-50 hover:bg-green-100',
  viewer: 'border-gray-300 bg-gray-50 hover:bg-gray-100',
}

const ROLE_ACTIVE_COLORS: Record<UserRole, string> = {
  admin: 'ring-2 ring-blue-500 border-blue-500 bg-blue-100',
  operator: 'ring-2 ring-green-500 border-green-500 bg-green-100',
  viewer: 'ring-2 ring-gray-500 border-gray-500 bg-gray-200',
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const login = useAuthStore(s => s.login)
  const router = useRouter()

  const handleLogin = () => {
    if (!username.trim() || !selectedRole) return
    login(username.trim(), selectedRole)
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1b2d] to-[#1E3A5F] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#1E3A5F] flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg">衡</span>
          </div>
          <CardTitle className="text-xl">晓天衡宇数据审核平台</CardTitle>
          <p className="text-sm text-gray-500 mt-1">请选择角色登录</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="space-y-2">
            <Label>选择角色</Label>
            <div className="grid grid-cols-1 gap-3">
              {(['admin', 'operator', 'viewer'] as UserRole[]).map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    selectedRole === role ? ROLE_ACTIVE_COLORS[role] : ROLE_COLORS[role]
                  }`}
                >
                  <div className="text-gray-600">{ROLE_ICONS[role]}</div>
                  <div>
                    <div className="font-medium text-sm">{ROLE_LABELS[role]}</div>
                    <div className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[role]}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={!username.trim() || !selectedRole}
          >
            登录
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
