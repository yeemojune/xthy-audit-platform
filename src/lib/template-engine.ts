/**
 * Mustache 风格的简单模板引擎
 * 支持 {{varName}} 占位符
 */

const VARIABLE_REGEX = /\{\{\s*([\w.[\]]+)\s*\}\}/g

/**
 * 提取模板中所有变量名（去重，保持出现顺序）
 */
export function extractVariables(template: string): string[] {
  const vars: string[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  const re = new RegExp(VARIABLE_REGEX.source, 'g')
  while ((m = re.exec(template)) !== null) {
    const name = m[1]
    if (!seen.has(name)) {
      seen.add(name)
      vars.push(name)
    }
  }
  return vars
}

/**
 * 用变量字典渲染模板。未提供的变量保持 {{var}} 不变（便于排查）。
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
  options: { keepUnresolved?: boolean } = {}
): string {
  const keepUnresolved = options.keepUnresolved ?? false
  return template.replace(VARIABLE_REGEX, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return vars[name]
    }
    return keepUnresolved ? match : ''
  })
}
