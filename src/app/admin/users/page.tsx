'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore, canAccessSettings, ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from '@/lib/auth-store'
import { useProjectStore } from '@/lib/project-store'
import { Shield, UserPlus, Trash2, KeyRound, Users as UsersIcon, FolderKanban } from 'lucide-react'

export default function AdminUsersPage() {
  const session = useAuthStore(s => s.session)
  const accounts = useAuthStore(s => s.accounts)
  const addAccount = useAuthStore(s => s.addAccount)
  const updateAccount = useAuthStore(s => s.updateAccount)
  const removeAccount = useAuthStore(s => s.removeAccount)
  const projects = useProjectStore(s => s.projects)

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [accountForm, setAccountForm] = useState({ username: '', password: '', role: 'operator' as UserRole })
  const [editingAccount, setEditingAccount] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('operator')
  const [resetPwdFor, setResetPwdFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

  if (!hydrated) {
    return (
      <>
        <Header title="权限管理" />
        <div className="p-6 text-gray-400 text-sm">加载中...</div>
      </>
    )
  }

  if (!session || !canAccessSettings(session.role)) {
    return (
      <>
        <Header title="权限管理" />
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Shield className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p>您没有访问权限管理的权限，仅管理员可配置。</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  // 统计每个账号的项目数
  const projectCount = (username: string) => projects.filter(p => p.ownerId === username).length

  return (
    <>
      <Header title="权限管理" />
      <div className="p-6 max-w-5xl space-y-6">
        {/* 概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-800">{accounts.length}</div>
                  <div className="text-xs text-gray-500">账号总数</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-800">{accounts.filter(a => a.role === 'admin').length}</div>
                  <div className="text-xs text-gray-500">管理员</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-800">{projects.length}</div>
                  <div className="text-xs text-gray-500">项目总数</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 角色说明 */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-sm font-medium text-gray-700 mb-3">角色权限说明</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['admin', 'operator', 'viewer'] as UserRole[]).map(role => (
                <div key={role} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge className={
                      role === 'admin' ? 'bg-red-100 text-red-700' :
                      role === 'operator' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }>
                      {ROLE_LABELS[role]}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 账号列表 */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">账号列表</h2>
          <Button
            onClick={() => { setAccountForm({ username: '', password: '', role: 'operator' }); setShowAccountDialog(true) }}
            size="sm"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            新建账号
          </Button>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-[1fr_120px_120px_120px_120px] gap-2 px-3 py-2 text-xs font-medium text-gray-500 border-b">
              <span>用户名</span>
              <span>角色</span>
              <span>持有项目</span>
              <span>创建时间</span>
              <span className="text-right">操作</span>
            </div>
            {accounts.map((acc) => {
              const isSelf = acc.username === session.username
              const isLastAdmin = acc.role === 'admin' && accounts.filter(a => a.role === 'admin').length <= 1
              return (
                <div key={acc.username} className="grid grid-cols-[1fr_120px_120px_120px_120px] gap-2 px-3 py-3 items-center hover:bg-gray-50 rounded border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-xs font-medium">
                      {acc.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {acc.username}
                        {isSelf && <Badge className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0">当前</Badge>}
                      </div>
                    </div>
                  </div>
                  <div>
                    {editingAccount === acc.username ? (
                      <select
                        className="text-xs border rounded px-2 py-1 w-full"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        onBlur={() => {
                          updateAccount(acc.username, { role: editRole })
                          setEditingAccount(null)
                        }}
                        autoFocus
                      >
                        <option value="admin">管理员</option>
                        <option value="operator">运营</option>
                        <option value="viewer">查看人员</option>
                      </select>
                    ) : (
                      <Badge
                        className={`text-[10px] cursor-pointer ${
                          acc.role === 'admin' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                          acc.role === 'operator' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                          'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          if (!isSelf) {
                            setEditingAccount(acc.username)
                            setEditRole(acc.role)
                          }
                        }}
                      >
                        {ROLE_LABELS[acc.role]}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">{projectCount(acc.username)} 个</span>
                  <span className="text-xs text-gray-400">
                    {acc.createdAt === 0 ? '预设' : new Date(acc.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600"
                      title="重置密码"
                      onClick={() => { setResetPwdFor(acc.username); setNewPassword('') }}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    {!isSelf && !isLastAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                        title="删除账号"
                        onClick={() => {
                          if (confirm(`确认删除账号「${acc.username}」？\n注意：该账号创建的项目仍会保留，可由管理员接管。`)) {
                            removeAccount(acc.username)
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <p className="text-xs text-gray-400">
          提示：点击角色徽章可修改角色（不能修改自己）；不可删除自己或最后一个管理员账号。账号信息存储在浏览器本地。
        </p>
      </div>

      {/* 新建账号对话框 */}
      {showAccountDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowAccountDialog(false)}>
          <div className="bg-white rounded-lg p-6 w-[420px] space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" /> 新建账号
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">用户名</Label>
                <Input
                  value={accountForm.username}
                  onChange={e => setAccountForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="用于登录的唯一标识"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">密码</Label>
                <Input
                  type="password"
                  value={accountForm.password}
                  onChange={e => setAccountForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="登录密码"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">角色</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={accountForm.role}
                  onChange={e => setAccountForm(f => ({ ...f, role: e.target.value as UserRole }))}
                >
                  <option value="admin">管理员 - 拥有全部权限</option>
                  <option value="operator">运营 - 可执行任务，不可配置系统</option>
                  <option value="viewer">查看人员 - 仅可查看</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[accountForm.role]}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAccountDialog(false)}>取消</Button>
              <Button onClick={() => {
                if (!accountForm.username.trim()) return alert('请输入用户名')
                if (!accountForm.password.trim()) return alert('请输入密码')
                const ok = addAccount(accountForm.username.trim(), accountForm.password, accountForm.role)
                if (!ok) return alert('用户名已存在')
                setShowAccountDialog(false)
              }}>创建</Button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码对话框 */}
      {resetPwdFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setResetPwdFor(null)}>
          <div className="bg-white rounded-lg p-6 w-[380px] space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" /> 重置密码
            </h3>
            <p className="text-sm text-gray-500">为账号「<span className="font-medium text-gray-700">{resetPwdFor}</span>」设置新密码</p>
            <div className="space-y-1">
              <Label className="text-sm">新密码</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="输入新密码"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetPwdFor(null)}>取消</Button>
              <Button onClick={() => {
                if (!newPassword.trim()) return alert('请输入新密码')
                updateAccount(resetPwdFor, { password: newPassword })
                setResetPwdFor(null)
                alert('密码已重置')
              }}>确认</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
