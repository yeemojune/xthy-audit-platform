'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'admin' | 'operator' | 'viewer'

export interface UserSession {
  username: string
  role: UserRole
}

export interface UserAccount {
  username: string
  password: string
  role: UserRole
  createdAt: number
}

interface AuthStore {
  session: UserSession | null
  accounts: UserAccount[]
  hasHydrated: boolean
  login: (username: string, role: UserRole) => void
  logout: () => void
  setHasHydrated: (b: boolean) => void
  addAccount: (username: string, password: string, role: UserRole) => boolean
  updateAccount: (username: string, partial: Partial<Pick<UserAccount, 'password' | 'role'>>) => void
  removeAccount: (username: string) => void
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

const DEFAULT_ACCOUNTS: UserAccount[] = [
  { username: 'admin', password: 'admin_xthy', role: 'admin', createdAt: 0 },
  { username: 'operator', password: 'operator_xthy', role: 'operator', createdAt: 0 },
  { username: 'viewer', password: 'viewer_xthy', role: 'viewer', createdAt: 0 },
]

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      session: null,
      accounts: DEFAULT_ACCOUNTS,
      hasHydrated: false,

      login: (username, role) => set({ session: { username, role } }),
      logout: () => set({ session: null }),
      setHasHydrated: (b) => set({ hasHydrated: b }),

      addAccount: (username, password, role) => {
        const exists = get().accounts.some((a) => a.username === username)
        if (exists) return false
        set((s) => ({
          accounts: [...s.accounts, { username, password, role, createdAt: Date.now() }],
        }))
        return true
      },

      updateAccount: (username, partial) => {
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.username === username ? { ...a, ...partial } : a
          ),
        }))
      },

      removeAccount: (username) => {
        set((s) => ({ accounts: s.accounts.filter((a) => a.username !== username) }))
      },
    }),
    {
      name: 'xthy-auth',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const state = persisted as Record<string, unknown>
          if (!state.accounts) {
            state.accounts = DEFAULT_ACCOUNTS
          }
        }
        return persisted
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.setHasHydrated(true)
        // 确保默认账号存在
        const existNames = new Set(state.accounts.map((a) => a.username))
        for (const d of DEFAULT_ACCOUNTS) {
          if (!existNames.has(d.username)) {
            state.accounts.push(d)
          }
        }
      },
    }
  )
)

// 从 store 中动态验证账号
export function authenticate(username: string, password: string): UserRole | null {
  const accounts = useAuthStore.getState().accounts
  const account = accounts.find((a) => a.username === username.trim())
  if (!account) return null
  if (account.password !== password) return null
  return account.role
}

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
