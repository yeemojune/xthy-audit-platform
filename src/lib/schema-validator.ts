/**
 * Schema 校验与 Prompt 提示生成
 */

export interface SchemaField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'enum'
  enumValues?: string[]
  description?: string
  required?: boolean
}

export interface ValidationResult {
  ok: boolean
  data?: Record<string, unknown>
  errors: string[]
}

/**
 * 把 schema 字段转成给 LLM 看的格式描述
 */
export function schemaToPromptHint(schema: SchemaField[]): string {
  if (!schema || schema.length === 0) return ''
  const lines: string[] = []
  lines.push('请严格按以下 JSON 格式返回结果，不要添加任何额外的解释或 Markdown 代码块标记：')
  lines.push('')
  const exampleObj: Record<string, unknown> = {}
  const fieldDescs: string[] = []
  for (const f of schema) {
    let example: unknown = ''
    switch (f.type) {
      case 'string':
        example = f.description ? '<' + f.description + '>' : '<字符串>'
        break
      case 'number':
        example = 0
        break
      case 'boolean':
        example = true
        break
      case 'enum':
        example = f.enumValues?.[0] || ''
        break
    }
    exampleObj[f.name] = example
    let desc = '- ' + f.name + ' (' + f.type + (f.required ? ', required' : '') + ')'
    if (f.description) desc += '：' + f.description
    if (f.type === 'enum' && f.enumValues?.length) {
      desc += '，可选值：' + f.enumValues.map(v => '"' + v + '"').join(' | ')
    }
    fieldDescs.push(desc)
  }
  lines.push('```json')
  lines.push(JSON.stringify(exampleObj, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('字段说明：')
  lines.push(...fieldDescs)
  return lines.join('\n')
}

/**
 * 从 LLM 原始输出中尝试解析 JSON：
 * 1) 直接 parse
 * 2) 提取首个 { ... } 块
 * 3) 提取 ```json ... ``` 块
 */
export function tryParseJson(raw: string): unknown | null {
  const text = raw.trim()
  // 1) 直接 parse
  try {
    return JSON.parse(text)
  } catch {
    /* ignore */
  }
  // 2) 代码块包裹
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {
      /* ignore */
    }
  }
  // 3) 第一个 { 到最后一个 }
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1))
    } catch {
      /* ignore */
    }
  }
  return null
}

/**
 * 用 schema 校验解析得到的对象
 */
export function validateOutput(parsed: unknown, schema: SchemaField[]): ValidationResult {
  const errors: string[] = []
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['输出不是 JSON 对象'] }
  }
  const obj = parsed as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const f of schema) {
    const v = obj[f.name]
    if (v === undefined || v === null) {
      if (f.required) errors.push('缺少必填字段：' + f.name)
      out[f.name] = null
      continue
    }
    switch (f.type) {
      case 'string':
        out[f.name] = typeof v === 'string' ? v : String(v)
        break
      case 'number': {
        const n = typeof v === 'number' ? v : Number(v)
        if (Number.isNaN(n)) errors.push('字段 ' + f.name + ' 不是数字：' + JSON.stringify(v))
        out[f.name] = n
        break
      }
      case 'boolean':
        if (typeof v === 'boolean') out[f.name] = v
        else if (v === 'true' || v === 'false') out[f.name] = v === 'true'
        else {
          errors.push('字段 ' + f.name + ' 不是布尔：' + JSON.stringify(v))
          out[f.name] = Boolean(v)
        }
        break
      case 'enum': {
        const s = String(v)
        if (f.enumValues && !f.enumValues.includes(s)) {
          errors.push('字段 ' + f.name + ' 不在允许枚举内：' + s)
        }
        out[f.name] = s
        break
      }
    }
  }
  return { ok: errors.length === 0, data: out, errors }
}

export function parseAndValidate(raw: string, schema: SchemaField[]): ValidationResult & { raw: string } {
  const parsed = tryParseJson(raw)
  if (parsed === null) {
    return { ok: false, errors: ['无法解析为 JSON'], raw }
  }
  if (!schema || schema.length === 0) {
    // 无 schema 约束时，原样返回
    return { ok: true, data: parsed as Record<string, unknown>, errors: [], raw }
  }
  return { ...validateOutput(parsed, schema), raw }
}
