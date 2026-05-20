/**
 * 简单 JSONPath 求值器
 * 仅支持确定路径：a.b.c、a[0].b、items[2].name
 * 不支持通配符 / 过滤器
 */

export function getByPath(obj: unknown, path: string): unknown {
  if (!path || path === '$') return obj
  let cur: unknown = obj
  // 把 [n] 转成 .n，再统一按 . 分段
  const segments = path
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^\$\.?/, '')
    .split('.')
    .filter(Boolean)
  for (const seg of segments) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur)) {
      const idx = Number(seg)
      if (Number.isNaN(idx)) return undefined
      cur = cur[idx]
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[seg]
    } else {
      return undefined
    }
  }
  return cur
}

/**
 * 把任意值序列化为字符串以供 prompt 使用
 */
export function valueToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}
