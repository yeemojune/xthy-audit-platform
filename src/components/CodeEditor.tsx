'use client'

import dynamic from 'next/dynamic'
import { json } from '@codemirror/lang-json'
import type { Extension } from '@codemirror/state'
import { useMemo } from 'react'

// CodeMirror 在 SSR 下会访问 window，必须 ssr:false
const CodeMirror = dynamic(() => import('@uiw/react-codemirror').then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="border rounded-md bg-gray-50 p-3 text-xs text-gray-400 font-mono min-h-[120px]">
      加载编辑器...
    </div>
  ),
})

interface CodeEditorProps {
  value: string
  onChange?: (v: string) => void
  language?: 'json' | 'plain'
  height?: string
  readOnly?: boolean
  placeholder?: string
}

export function CodeEditor({
  value,
  onChange,
  language = 'plain',
  height = '320px',
  readOnly = false,
  placeholder,
}: CodeEditorProps) {
  const extensions = useMemo<Extension[]>(() => {
    const exts: Extension[] = []
    if (language === 'json') exts.push(json())
    return exts
  }, [language])

  return (
    <div className="border rounded-md overflow-hidden text-sm">
      <CodeMirror
        value={value}
        height={height}
        extensions={extensions}
        readOnly={readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: !readOnly,
          foldGutter: language === 'json',
          autocompletion: false,
        }}
        onChange={(v) => onChange?.(v)}
      />
    </div>
  )
}
