'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'admin' | 'operator' | 'viewer'

export interface UserSession {
  username: string
  role: UserRole
}

interface AuthStore {
  session: UserSession | null
  login: (username: string, role: UserRole) => void
  logout: () => void
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理员',
  operator: '运营',
  viewer: '查看人员',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: '拥有全部权限，可配置系统、上传数据、执行审核任务',
  operator: '可上传≤10行数据并执行审核任务，不可修改系统设置',
  viewer: '仅可查看数据和结果，不可执行任何操作',
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: null,
      login: (username, role) => set({ session: { username, role } }),
      logout: () => set({ session: null }),
    }),
    { name: 'xthy-auth' }
  )
)

// 权限检查工具函数
export function canUpload(role: UserRole): boolean {
  return role === 'admin' || role === 'operator'
}

export function canExecuteTask(role: UserRole): boolean {
  return role === 'admin' || role === 'operator'
}

export function canAccessSettings(role: UserRole): boolean {
  return role === 'admin'
}

export function getUploadRowLimit(role: UserRole): number | null {
  if (role === 'operator') return 10
  return null // admin 无限制
}
