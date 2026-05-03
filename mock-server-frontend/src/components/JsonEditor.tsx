import React from 'react'
import DynamicInsert from "./DynamicInsert";

declare global {
  interface Window {
    monaco?: any
    require?: any
  }
}

//  EXTRACT JSON FIELDS
function extractJsonFields(obj: any, prefix = ""): string[] {
  let fields: string[] = []

  for (const key in obj) {
    const value = obj[key]
    const newPath = prefix ? `${prefix}.${key}` : key

    fields.push(newPath)

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      fields = fields.concat(extractJsonFields(value, newPath))
    }
  }

  return fields
}

function validateJson(raw: string): string | null {
  if (!raw.trim()) return null
  try {
    JSON.parse(raw)
    return null
  } catch (e: any) {
    return e?.message || 'Invalid JSON'
  }
}

function prettyPrintJson(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    const parsed = JSON.parse(trimmed)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return null
  }
}

const LOADER_URL =
  'https://unpkg.com/monaco-editor@0.52.2/min/vs/loader.js'

export default function JsonEditor({
  label,
  value,
  onChange,
  requestBody   //  NEW PROP
}: {
  label: string
  value: string
  onChange: (next: string) => void
  requestBody?: string
}) {

  const [mounted, setMounted] = React.useState(false)
  const [mode, setMode] = React.useState<'monaco' | 'fallback'>('monaco')
  const [jsonError, setJsonError] = React.useState<string | null>(null)
  const [dynamicFields, setDynamicFields] = React.useState<string[]>([])

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const editorRef = React.useRef<any>(null)
  const modelRef = React.useRef<any>(null)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    setJsonError(validateJson(value))
  }, [value])

  //  PARSE REQUEST BODY (CORRECT SOURCE)
  React.useEffect(() => {
    try {
      if (!requestBody) {
        setDynamicFields([])
        return
      }

      const parsed = JSON.parse(requestBody)
      const fields = extractJsonFields(parsed)
      setDynamicFields(fields)

    } catch {
      setDynamicFields([])
    }
  }, [requestBody])

  async function loadMonaco(): Promise<any> {
    if (window.monaco) return window.monaco

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = LOADER_URL
      script.onload = () => resolve()
      script.onerror = () => reject()
      document.head.appendChild(script)
    })

    return new Promise((resolve) => {
      window.require.config({
        paths: { vs: 'https://unpkg.com/monaco-editor@0.52.2/min/vs' }
      })
      window.require(['vs/editor/editor.main'], () => resolve(window.monaco))
    })
  }

  //  AUTOCOMPLETE
  function registerDynamicCompletion(monaco: any) {

    monaco.languages.registerCompletionItemProvider('json', {
      triggerCharacters: ['.', '{'],

      provideCompletionItems: (model: any, position: any) => {

        const text = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        })

        const trimmed = text.trim()

        //  BODY (DYNAMIC)
        if (trimmed.endsWith('{{body.')) {
          return {
            suggestions: dynamicFields.length > 0
              ? dynamicFields.map((field) => ({
                  label: field,
                  insertText: field + "}}",
                  kind: monaco.languages.CompletionItemKind.Field
                }))
              : [
                  {
                    label: "No fields found",
                    insertText: "",
                    kind: monaco.languages.CompletionItemKind.Text
                  }
                ]
          }
        }

        // QUERY
        if (trimmed.endsWith('{{query.')) {
          return {
            suggestions: [
              { label: 'page', insertText: 'page}}', kind: monaco.languages.CompletionItemKind.Field },
              { label: 'limit', insertText: 'limit}}', kind: monaco.languages.CompletionItemKind.Field }
            ]
          }
        }

        // PATH
        if (trimmed.endsWith('{{path.')) {
          return {
            suggestions: [
              { label: 'id', insertText: 'id}}', kind: monaco.languages.CompletionItemKind.Field }
            ]
          }
        }

        // ROOT
        if (trimmed.endsWith('{{')) {
          return {
            suggestions: [
              { label: 'uuid', insertText: 'uuid}}', kind: monaco.languages.CompletionItemKind.Function },
              { label: 'timestamp', insertText: 'timestamp}}', kind: monaco.languages.CompletionItemKind.Function },
              { label: 'randomInt', insertText: 'randomInt(1,100)}}', kind: monaco.languages.CompletionItemKind.Function },
              { label: 'randomString', insertText: 'randomString(5,10)}}', kind: monaco.languages.CompletionItemKind.Function },
              { label: 'body', insertText: 'body.', kind: monaco.languages.CompletionItemKind.Variable },
              { label: 'query', insertText: 'query.', kind: monaco.languages.CompletionItemKind.Variable },
              { label: 'path', insertText: 'path.', kind: monaco.languages.CompletionItemKind.Variable }
            ]
          }
        }

        return { suggestions: [] }
      }
    })
  }

  React.useEffect(() => {
    if (!mounted || !containerRef.current) return

    let cancelled = false

    async function init() {
      try {
        const monaco = await loadMonaco()
        if (cancelled) return

        registerDynamicCompletion(monaco)

        const model = monaco.editor.createModel(value || '', 'json')
        modelRef.current = model

        const editor = monaco.editor.create(containerRef.current!, {
          model,
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          padding: { top: 12, bottom: 12 },
          lineNumbers: 'on',
          renderLineHighlight: 'gutter',
          scrollBeyondLastLine: false,
          roundedSelection: true,
        })

        editorRef.current = editor

        editor.onDidChangeModelContent(() => {
          onChange(model.getValue())
        })

      } catch {
        setMode('fallback')
      }
    }

    init()

    return () => {
      cancelled = true
      editorRef.current?.dispose?.()
      modelRef.current?.dispose?.()
    }
  }, [mounted])

  React.useEffect(() => {
    if (modelRef.current && modelRef.current.getValue() !== value) {
      modelRef.current.setValue(value)
    }
  }, [value])

  const insertAtCursor = (insertValue: string) => {
    if (editorRef.current) {
      const editor = editorRef.current
      const selection = editor.getSelection()

      editor.executeEdits("", [
        {
          range: selection,
          text: insertValue,
          forceMoveMarkers: true
        }
      ])

      editor.focus()
      return
    }

    const textarea = document.getElementById(label) as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    const newValue =
      value.substring(0, start) +
      insertValue +
      value.substring(end)

    onChange(newValue)
  }

  const borderClass = jsonError ? 'border-red-500/30' : 'b-default'

  return (
    <div className={`rounded-xl border ${borderClass} overflow-hidden`} style={{background:'var(--bg-card)'}}>

      {/*  BUTTONS */}
      <div className="px-4 pt-3">
        <DynamicInsert onInsert={insertAtCursor} />
      </div>

      <div className="flex items-center justify-between border-b px-4 py-2.5" style={{borderColor:'var(--border-color)'}}>
        <div className="text-sm font-semibold t-heading">{label}</div>

        <button
          type="button"
          className="btn-glass rounded-lg text-[11px] px-3 py-1.5 font-medium"
          onClick={() => {
            const pretty = prettyPrintJson(value)
            if (pretty) onChange(pretty)
          }}
        >
          Format
        </button>
      </div>

      {mode === 'fallback' ? (
        <textarea
          id={label}
          className="h-56 w-full p-4 font-mono text-sm bg-transparent t-primary outline-none resize-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div ref={containerRef} className="h-56 w-full" />
      )}

      {jsonError && (
        <div className="px-4 pb-3 text-xs text-red-400">
          {jsonError}
        </div>
      )}
    </div>
  )
}