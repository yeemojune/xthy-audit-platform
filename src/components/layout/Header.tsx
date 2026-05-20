'use client'

export function Header({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center px-6">
      <h1 className="text-lg font-semibold text-gray-800">
        {title || '晓天衡宇数据审核平台'}
      </h1>
    </header>
  )
}
