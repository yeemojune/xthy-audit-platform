/**
 * JSON 扁平化工具：把任意 JSON 递归展开为叶子节点路径列表
 * 路径形如：data.items[0].text
 */

export type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'

export interface FlattenedField {
  path: string
  value: unknown
  type: JsonValueType
}

function detectType(v: unknown): JsonValueType {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v as JsonValueType
}

/**
 * 把对象/数组扁平化为叶子节点路径列表。
 * - 对数组：用 [index] 形式拼接路径
 * - 对对象：用 .key 形式拼接路径
 * - 叶子定义：基本类型（string/number/boolean/null）
 */
export function flattenJson(obj: unknown, prefix = ''): FlattenedField[] {
  const out: FlattenedField[] = []
  if (obj === null || obj === undefined) {
    out.push({ path: prefix || '$', value: obj, type: 'null' })
    return out
  }
  const t = detectType(obj)
  if (t !== 'object' && t !== 'array') {
    out.push({ path: prefix || '$', value: obj, type: t })
    return out
  }
  if (t === 'array') {
    const arr = obj as unknown[]
    if (arr.length === 0) {
      out.push({ path: prefix + '[]', value: [], type: 'array' })
      return out
    }
    arr.forEach((item, i) => {
      const next = prefix + '[' + i + ']'
      out.push(...flattenJson(item, next))
    })
    return out
  }
  // object
  const o = obj as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length === 0) {
    out.push({ path: prefix || '$', value: {}, type: 'object' })
    return out
  }
  for (const k of keys) {
    const next = prefix ? prefix + '.' + k : k
    out.push(...flattenJson(o[k], next))
  }
  return out
}

/**
 * 从一组对象推断字段集合（取并集），按出现频次排序
 */
export function inferFieldsFromRows(rows: unknown[]): { path: string; type: JsonValueType; sample: unknown }[] {
  const counter = new Map<string, { count: number; type: JsonValueType; sample: unknown }>()
  for (const row of rows) {
    const flat = flattenJson(row)
    for (const f of flat) {
      const exist = counter.get(f.path)
      if (exist) {
        exist.count += 1
      } else {
        counter.set(f.path, { count: 1, type: f.type, sample: f.value })
      }
    }
  }
  return Array.from(counter.entries())
    .map(([path, v]) => ({ path, type: v.type, sample: v.sample }))
    .sort((a, b) => a.path.localeCompare(b.path))
}
