import type { KVRow } from '../types'

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL)
    ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/$/, '')
    : 'http://localhost:8080'

function toArray(input?: KVRow[] | Record<string, string>): KVRow[] {
  if (!input) return []
  if (Array.isArray(input)) return input
  return Object.entries(input).map(([key, value]) => ({ key, value }))
}

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

  const queryRows = toArray(form.queryParams).filter(q => q.key)
  const qs = queryRows.map(q => `${q.key}=${encodeURIComponent(q.value)}`).join('&')
  const url = qs ? `${base}${path}?${qs}` : `${base}${path}`

  const lines: string[] = []
  lines.push(`curl --location --request ${form.method ?? 'GET'} '${url}'`)
  lines.push(`--header 'Content-Type: ${form.contentType ?? 'application/json'}'`)

  toArray(form.headers).filter(h => h.key).forEach(h => {
    lines.push(`--header '${h.key}: ${h.dynamic ? '$' : ''}${h.value}'`)
  })

  if (form.method !== 'GET' && form.body?.trim()) {
    const escaped = form.body.replace(/'/g, `'\\''`)
    lines.push(`--data-raw '${escaped}'`)
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
  } else if (str.includes('-d ') || str.includes('--data') || str.includes('--data-raw')) {
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
