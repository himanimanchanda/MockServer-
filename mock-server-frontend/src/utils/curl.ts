import type { KVRow } from '../types'

/**
 * Dynamic API base URL for curl/postman generation.
 *
 * - In production (nginx serves frontend at same origin as backend):
 *   → uses window.location.origin (e.g. https://mockserver.airtel.in)
 * - In local dev (Vite dev server on :5173, backend on :8080):
 *   → uses VITE_API_BASE_URL env var if set, otherwise window.location.origin
 *     (Vite proxy handles /api/* → localhost:8080 automatically)
 *
 * NO hardcoded localhost anywhere.
 */
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL)
    ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080')

function toArray(input?: KVRow[] | Record<string, string>): KVRow[] {
  if (!input) return []
  if (Array.isArray(input)) return input
  return Object.entries(input).map(([key, value]) => ({ key, value }))
}

/**
 * Generates a curl command string supporting multiple content types:
 *   - application/json → --data-raw '{...}'
 *   - multipart/form-data → -F 'key=value' per field
 *   - application/x-www-form-urlencoded → --data-urlencode 'key=value' per field
 */
export function generateCurl(form: {
  path: string
  method: string
  headers?: KVRow[] | Record<string, string>
  queryParams?: KVRow[] | Record<string, string>
  body?: string
  contentType?: string
  baseUrl?: string
}): string {
  const base = (form.baseUrl ?? API_BASE_URL).replace(/\/$/, '')
  const path = form.path?.startsWith('/') ? form.path : `/${form.path ?? ''}`
  const ct = form.contentType ?? 'application/json'

  const queryRows = toArray(form.queryParams).filter(q => q.key)
  const qs = queryRows.map(q => `${q.key}=${encodeURIComponent(q.value)}`).join('&')
  const url = qs ? `${base}${path}?${qs}` : `${base}${path}`

  const lines: string[] = []
  lines.push(`curl --location --request ${form.method ?? 'GET'} '${url}'`)

  // Don't add Content-Type header for form-data (curl sets it with boundary automatically)
  if (!ct.includes('multipart/form-data')) {
    lines.push(`--header 'Content-Type: ${ct}'`)
  }

  toArray(form.headers).filter(h => h.key).forEach(h => {
    lines.push(`--header '${h.key}: ${h.dynamic ? '$' : ''}${h.value}'`)
  })

  if (form.method !== 'GET' && form.body?.trim()) {
    if (ct.includes('multipart/form-data')) {
      // form-data: parse JSON body into -F flags
      try {
        const parsed = JSON.parse(form.body)
        Object.entries(parsed).forEach(([key, value]) => {
          lines.push(`-F '${key}=${String(value)}'`)
        })
      } catch {
        lines.push(`-F '${form.body.replace(/'/g, `'\\''`)}'`)
      }
    } else if (ct.includes('x-www-form-urlencoded')) {
      // URL-encoded: parse JSON body into --data-urlencode flags
      try {
        const parsed = JSON.parse(form.body)
        Object.entries(parsed).forEach(([key, value]) => {
          lines.push(`--data-urlencode '${key}=${String(value)}'`)
        })
      } catch {
        lines.push(`--data-urlencode '${form.body.replace(/'/g, `'\\''`)}'`)
      }
    } else {
      // JSON or other: raw body
      const escaped = form.body.replace(/'/g, `'\\''`)
      lines.push(`--data-raw '${escaped}'`)
    }
  }

  return lines.join(' \\\n')
}

export function parseCurlToForm(curlStr: string): any {
  if (!curlStr) return null;
  const str = curlStr.trim().replace(/\\\n/g, ' ').replace(/\\\s*\n/g, ' ');
  if (!str.toLowerCase().startsWith('curl')) return null;

  const result: any = {
    method: 'GET',
    headers: [],
    queryParams: [],
    path: '',
    body: '',
    contentType: 'application/json'
  };

  const methodMatch = str.match(/(?:-X|--request)\s+['"]?([A-Z]+)['"]?/i);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase();
  } else if (str.includes('-d ') || str.includes('--data') || str.includes('--data-raw') || str.includes('-F ')) {
    result.method = 'POST';
  }

  const urlMatch = str.match(/['"](https?:\/\/[^\s'"]+)['"]/i) || str.match(/(https?:\/\/[^\s'"]+)/i);
  if (urlMatch) {
    try {
      const url = new URL(urlMatch[1]);
      let path = url.pathname;
      if (!path.startsWith('/')) path = '/' + path;
      result.path = path;
      const params = new URLSearchParams(url.search);
      params.forEach((val, key) => {
        result.queryParams.push({ key, value: val, dynamic: false });
      });
    } catch {}
  }

  const headerRegex = /(?:-H|--header)\s+['"]([^:]+):\s*([^'"]+)['"]/gi;
  let match;
  while ((match = headerRegex.exec(str)) !== null) {
    if (match[1].toLowerCase() === 'content-type') {
      result.contentType = match[2].trim();
    } else {
      result.headers.push({ key: match[1].trim(), value: match[2].trim(), dynamic: false });
    }
  }

  // Detect form-data (-F flags)
  const formDataRegex = /-F\s+['"]([^=]+)=([^'"]*)['"]/gi;
  let formMatch;
  const formFields: Record<string, string> = {};
  while ((formMatch = formDataRegex.exec(str)) !== null) {
    formFields[formMatch[1]] = formMatch[2];
  }
  if (Object.keys(formFields).length > 0) {
    result.contentType = 'multipart/form-data';
    result.body = JSON.stringify(formFields, null, 2);
    return result;
  }

  // Detect URL-encoded (--data-urlencode flags)
  const urlEncRegex = /--data-urlencode\s+['"]([^=]+)=([^'"]*)['"]/gi;
  let urlEncMatch;
  const urlEncFields: Record<string, string> = {};
  while ((urlEncMatch = urlEncRegex.exec(str)) !== null) {
    urlEncFields[urlEncMatch[1]] = urlEncMatch[2];
  }
  if (Object.keys(urlEncFields).length > 0) {
    result.contentType = 'application/x-www-form-urlencoded';
    result.body = JSON.stringify(urlEncFields, null, 2);
    return result;
  }

  // Standard JSON body
  const dataParts = str.split(/(?:-d|--data|--data-raw)\s+/i);
  if (dataParts.length > 1) {
    let bodyPart = dataParts[1].trim();
    if ((bodyPart.startsWith("'") && bodyPart.endsWith("'")) || (bodyPart.startsWith('"') && bodyPart.endsWith('"'))) {
      bodyPart = bodyPart.substring(1, bodyPart.length - 1);
    }
    bodyPart = bodyPart.replace(/\\'/g, "'").replace(/\\"/g, '"');
    try {
      result.body = JSON.stringify(JSON.parse(bodyPart), null, 2);
    } catch {
      result.body = bodyPart;
    }
  }

  return result;
}
