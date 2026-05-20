'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import type { SchemaField } from '@/lib/schema-validator'

interface Props {
  schema: SchemaField[]
  onChange: (s: SchemaField[]) => void
  readOnly?: boolean
}

const TYPE_OPTIONS: SchemaField['type'][] = ['string', 'number', 'boolean', 'enum']

export function SchemaFieldsEditor({ schema, onChange, readOnly }: Props) {
  function update(idx: number, patch: Partial<SchemaField>) {
    const next = schema.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    onChange(next)
  }
  function add() {
    onChange([...schema, { name: '', type: 'string', required: false }])
  }
  function remove(idx: number) {
    onChange(schema.filter((_, i) => i !== idx))
  }
  function move(idx: number, dir: -1 | 1) {
    const t = idx + dir
    if (t < 0 || t >= schema.length) return
    const next = [...schema]
    ;[next[idx], next[t]] = [next[t], next[idx]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {schema.length === 0 && (
        <div className="text-sm text-gray-400 border border-dashed rounded-md p-4 text-center">
          暂未定义输出字段。LLM 将不被强制返回 JSON。
        </div>
      )}

      {schema.map((f, idx) => (
        <div key={idx} className="border rounded-md p-3 bg-gray-50 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="字段名 (如 score)"
              value={f.name}
              disabled={readOnly}
              onChange={(e) => update(idx, { name: e.target.value })}
              className="font-mono text-sm"
            />
            <select
              value={f.type}
              disabled={readOnly}
              onChange={(e) => update(idx, { type: e.target.value as SchemaField['type'] })}
              className="border rounded-md px-2 py-1.5 text-sm bg-white h-9"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
              <input
                type="checkbox"
                checked={!!f.required}
                disabled={readOnly}
                onChange={(e) => update(idx, { required: e.target.checked })}
              />
              必填
            </label>
          </div>

          <Input
            placeholder="字段说明（喂给 LLM 的描述）"
            value={f.description ?? ''}
            disabled={readOnly}
            onChange={(e) => update(idx, { description: e.target.value })}
            className="text-sm"
          />

          {f.type === 'enum' && (
            <Input
              placeholder="枚举值，逗号分隔（如 高,中,低）"
              value={(f.enumValues ?? []).join(',')}
              disabled={readOnly}
              onChange={(e) =>
                update(idx, {
                  enumValues: e.target.value
                    .split(/[,，]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="text-sm"
            />
          )}

          {!readOnly && (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0}>
                <ChevronUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => move(idx, 1)}
                disabled={idx === schema.length - 1}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => remove(idx)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="w-3.5 h-3.5 mr-1" /> 添加字段
        </Button>
      )}
    </div>
  )
}
