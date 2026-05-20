import type { ApiConfig } from './config-store'
import type { Dataset } from './dataset-store'
import type { PromptTemplate } from './template-store'
import type { BindingItem, EvalResult } from './task-store'
import { callLLM } from './llm-client'
import { renderTemplate } from './template-engine'
import { schemaToPromptHint, parseAndValidate } from './schema-validator'
import { valueToString } from './json-path'

export interface RunCallbacks {
  onResult: (result: EvalResult) => void
  shouldStop: () => boolean
}

/**
 * 把一行数据 + 绑定 转换为模板变量字典
 */
function buildVarsForRow(
  row: Record<string, unknown>,
  bindings: BindingItem[]
): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const b of bindings) {
    if (b.mode === 'constant') {
      vars[b.variable] = b.constantValue ?? ''
    } else if (b.mode === 'field' && b.fieldPath) {
      vars[b.variable] = valueToString(row[b.fieldPath])
    } else {
      vars[b.variable] = ''
    }
  }
  return vars
}

/**
 * 构造发给 LLM 的 prompt：渲染模板 + 追加 schema 提示
 */
export function buildFinalPrompt(
  template: PromptTemplate,
  vars: Record<string, string>
): string {
  const body = renderTemplate(template.content, vars, { keepUnresolved: true })
  const hint = schemaToPromptHint(template.outputSchema)
  if (!hint) return body
  return body + '\n\n' + hint
}

/**
 * 执行单条
 */
async function runOne(
  apiConfig: ApiConfig,
  template: PromptTemplate,
  row: Record<string, unknown>,
  rowIndex: number,
  bindings: BindingItem[]
): Promise<EvalResult> {
  const start = Date.now()
  try {
    const vars = buildVarsForRow(row, bindings)
    const prompt = buildFinalPrompt(template, vars)
    const sys = template.systemPrompt || '你是一个数据评测助手，请严格按用户要求返回 JSON 格式。'
    const resp = await callLLM(apiConfig, sys, prompt)
    if (!resp.success) {
      return { rowIndex, error: resp.error || '调用失败', durationMs: Date.now() - start }
    }
    const result = parseAndValidate(resp.content, template.outputSchema)
    if (!result.ok && template.outputSchema.length > 0 && !result.data) {
      return {
        rowIndex,
        raw: resp.content,
        error: result.errors.join('; '),
        durationMs: Date.now() - start,
      }
    }
    return {
      rowIndex,
      output: result.data,
      raw: resp.content,
      validationErrors: result.errors.length > 0 ? result.errors : undefined,
      durationMs: Date.now() - start,
    }
  } catch (e: unknown) {
    return { rowIndex, error: String(e), durationMs: Date.now() - start }
  }
}

/**
 * 并发批量运行：使用滑动窗口 + 跳过已完成行（断点续跑）
 */
export async function runEvalTask(opts: {
  apiConfig: ApiConfig
  template: PromptTemplate
  dataset: Dataset
  bindings: BindingItem[]
  rowCount: number
  concurrency: number
  doneRowIndexes: Set<number>          // 已完成（跳过）
  callbacks: RunCallbacks
}): Promise<void> {
  const { apiConfig, template, dataset, bindings, rowCount, concurrency, doneRowIndexes, callbacks } = opts

  const total = Math.min(rowCount, dataset.rows.length)
  // 待跑的索引
  const pending: number[] = []
  for (let i = 0; i < total; i++) {
    if (!doneRowIndexes.has(i)) pending.push(i)
  }

  let cursor = 0
  const workers: Promise<void>[] = []
  const workerCount = Math.max(1, Math.min(concurrency, pending.length))

  for (let w = 0; w < workerCount; w++) {
    workers.push(
      (async () => {
        while (true) {
          if (callbacks.shouldStop()) return
          const idx = cursor++
          if (idx >= pending.length) return
          const rowIndex = pending[idx]
          const row = dataset.rows[rowIndex]
          const result = await runOne(apiConfig, template, row, rowIndex, bindings)
          callbacks.onResult(result)
        }
      })()
    )
  }

  await Promise.all(workers)
}
