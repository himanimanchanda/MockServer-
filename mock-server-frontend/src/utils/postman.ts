import type { MockDto, CreateMockRequest } from '../types'

export function exportToPostman(mocks: MockDto[], projectName: string = 'Mock Server Export') {
  const collection = {
    info: {
      name: projectName,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: mocks.map((mock) => {
      const urlParts = mock.endpoint.split('?')[0].replace(/^\//, '').split('/')
      
      const queryParams = mock.queryParams
        ? Object.entries(mock.queryParams).map(([key, value]) => ({ key, value }))
        : []

      const headers = mock.headers
        ? Object.entries(mock.headers).map(([key, value]) => ({ key, value }))
        : []

      return {
        name: mock.testCase || mock.endpoint,
        request: {
          method: mock.method,
          header: headers,
          url: {
            raw: `{{base_url}}/${mock.endpoint.replace(/^\//, '')}`,
            host: ['{{base_url}}'],
            path: urlParts,
            query: queryParams,
          },
          body: mock.requestBody
            ? {
                mode: 'raw',
                raw: mock.requestBody,
              }
            : undefined,
        },
        response: [
          {
            name: 'Success Response',
            originalRequest: {
              method: mock.method,
              header: headers,
              url: {
                raw: `{{base_url}}/${mock.endpoint.replace(/^\//, '')}`,
                host: ['{{base_url}}'],
                path: urlParts,
                query: queryParams,
              },
            },
            status: 'OK',
            code: mock.statusCode,
            body: typeof mock.responseBody === 'string' ? mock.responseBody : JSON.stringify(mock.responseBody, null, 2),
          },
        ],
      }
    }),
    variable: [
      {
        key: 'base_url',
        value: 'http://localhost:8080',
        type: 'string',
      },
    ],
  }

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(collection, null, 2))
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute('href', dataStr)
  downloadAnchorNode.setAttribute('download', `${projectName.replace(/\s+/g, '_')}_collection.json`)
  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

/**
 * Parse a Postman Collection v2.1 JSON into CreateMockRequest[].
 * Handles nested folders recursively.
 */
export function parsePostmanCollection(json: any): CreateMockRequest[] {
  const results: CreateMockRequest[] = []

  function extractItems(items: any[]) {
    for (const item of items) {
      // If it's a folder, recurse
      if (item.item && Array.isArray(item.item)) {
        extractItems(item.item)
        continue
      }

      const req = item.request
      if (!req) continue

      const method = (typeof req.method === 'string' ? req.method : 'GET').toUpperCase() as any
      
      // Build endpoint from url
      let endpoint = '/'
      if (typeof req.url === 'string') {
        try {
          const u = new URL(req.url)
          endpoint = u.pathname
        } catch {
          endpoint = req.url.startsWith('/') ? req.url : `/${req.url}`
        }
      } else if (req.url?.path) {
        endpoint = '/' + (Array.isArray(req.url.path) ? req.url.path.join('/') : req.url.path)
      }

      // Headers
      const headers: Record<string, string> = {}
      if (Array.isArray(req.header)) {
        for (const h of req.header) {
          if (h.key && h.value) headers[h.key] = h.value
        }
      }

      // Query params
      const queryParams: Record<string, string> = {}
      if (req.url?.query && Array.isArray(req.url.query)) {
        for (const q of req.url.query) {
          if (q.key) queryParams[q.key] = q.value ?? ''
        }
      }

      // Body
      const requestBody = req.body?.raw ?? ''

      // Response — pick first saved response if any
      let responseBody = '{"message": "imported from postman"}'
      let statusCode = 200
      if (item.response && Array.isArray(item.response) && item.response.length > 0) {
        const resp = item.response[0]
        responseBody = resp.body ?? responseBody
        statusCode = resp.code ?? 200
      }

      results.push({
        endpoint,
        method,
        testCase: item.name ?? '',
        description: `Imported from Postman`,
        requestBody,
        responseBody,
        statusCode,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        environment: 'DEV',
      })
    }
  }

  if (json?.item && Array.isArray(json.item)) {
    extractItems(json.item)
  }

  return results
}
