export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface ApiOptions {
  method?: string
  body?: unknown
  token?: string | null
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (!response.ok) throw await toApiError(response)
  return response.status === 204 ? (undefined as T) : response.json()
}

function buildHeaders({ body, token }: ApiOptions): Record<string, string> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => ({}))
  return new ApiError(response.status, body.code ?? 'UNKNOWN', body.message ?? '요청에 실패했습니다')
}
