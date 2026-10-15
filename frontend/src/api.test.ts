import { afterEach, describe, expect, it, vi } from 'vitest'

describe('api base URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  async function callApi(baseUrl: string | undefined) {
    if (baseUrl !== undefined) vi.stubEnv('VITE_API_BASE_URL', baseUrl)
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await import('./api')
    await api('/api/products')
    return fetchMock.mock.calls[0][0]
  }

  it('요청 경로 앞에 VITE_API_BASE_URL을 붙인다', async () => {
    expect(await callApi('https://api.example.com')).toBe('https://api.example.com/api/products')
  })

  it('끝의 슬래시는 중복되지 않는다', async () => {
    expect(await callApi('https://api.example.com/')).toBe('https://api.example.com/api/products')
  })

  it('비어 있으면 같은 출처의 상대 경로를 쓴다', async () => {
    expect(await callApi('')).toBe('/api/products')
  })
})

describe('api 요청과 오류 처리', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function lastRequestOf(call: (api: typeof import('./api').api) => Promise<unknown>, response: Response) {
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await import('./api')
    await call(api).catch(() => undefined)
    return fetchMock.mock.calls[0][1] as RequestInit
  }

  it('본문과 토큰이 있으면 JSON 헤더와 인증 헤더를 붙인다', async () => {
    const request = await lastRequestOf(
      (api) => api('/api/products', { method: 'POST', token: 'tok', body: { title: 't' } }),
      new Response('{}', { status: 200 }),
    )

    expect(request.method).toBe('POST')
    expect(request.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tok' })
    expect(request.body).toBe('{"title":"t"}')
  })

  it('본문도 토큰도 없으면 GET이고 헤더가 비어 있다', async () => {
    const request = await lastRequestOf((api) => api('/api/products'), new Response('{}', { status: 200 }))

    expect(request.method).toBe('GET')
    expect(request.headers).toEqual({})
    expect(request.body).toBeUndefined()
  })

  it('204 응답은 본문 없이 undefined를 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const { api } = await import('./api')

    await expect(api('/api/products/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('실패 응답의 code와 message를 ApiError로 던진다', async () => {
    const failure = new Response(JSON.stringify({ code: 'FORBIDDEN', message: '권한 없음' }), { status: 403 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failure))
    const { api, ApiError } = await import('./api')

    const error = await api('/api/x').catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN', message: '권한 없음' })
  })

  it('JSON이 아닌 실패 응답은 UNKNOWN 코드와 기본 메시지를 쓴다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })))
    const { api } = await import('./api')

    const error = await api('/api/x').catch((caught) => caught)

    expect(error).toMatchObject({ status: 502, code: 'UNKNOWN', message: '요청에 실패했습니다' })
  })
})
