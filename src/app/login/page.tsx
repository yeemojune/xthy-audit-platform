'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuthStore, authenticate, ROLE_LABELS } from '@/lib/auth-store'
import { Lock, User, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore(s => s.login)
  const router = useRouter()

  const handleLogin = () => {
    setError('')
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    const role = authenticate(username, password)
    if (!role) {
      setError('用户名或密码错误')
      return
    }
    login(username.trim(), role)
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
          <p className="text-sm text-gray-500 mt-1">请使用账号密码登录</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              用户名
            </Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              密码
            </Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button className="w-full" onClick={handleLogin}>
            登录
          </Button>

          <div className="pt-3 border-t">
            <p className="text-xs text-gray-400 mb-2">示范账号（仅供测试）：</p>
            <div className="space-y-1 text-xs text-gray-500 font-mono">
              <div>{ROLE_LABELS.admin}：admin / admin_xthy</div>
              <div>{ROLE_LABELS.operator}：operator / operator_xthy</div>
              <div>{ROLE_LABELS.viewer}：viewer / viewer_xthy</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
