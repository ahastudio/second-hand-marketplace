import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useApiResource } from './useApiResource'

afterEach(() => vi.unstubAllGlobals())

function stubFetchWithManualResponse() {
  let respondWith!: (response: Response) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => (respondWith = resolve))))
  return (response: Response) => respondWith(response)
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

test('응답이 오면 리소스를 돌려준다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"name":"a"}', { status: 200 })))

  const { result } = renderHook(() => useApiResource<{ name: string }>('/api/x'))

  await waitFor(() => expect(result.current.resource).toEqual({ name: 'a' }))
  expect(result.current.errorMessage).toBeNull()
})

test('실패하면 오류 메시지를 돌려준다', async () => {
  const failure = new Response('{"code":"X","message":"실패했어요"}', { status: 500 })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failure))

  const { result } = renderHook(() => useApiResource('/api/x'))

  await waitFor(() => expect(result.current.errorMessage).toBe('실패했어요'))
  expect(result.current.resource).toBeNull()
})

test('언마운트된 뒤에 도착한 성공 응답은 무시한다', async () => {
  const respond = stubFetchWithManualResponse()
  const { result, unmount } = renderHook(() => useApiResource('/api/x'))

  unmount()
  respond(new Response('{"name":"late"}', { status: 200 }))
  await flushPromises()

  expect(result.current.resource).toBeNull()
})

test('언마운트된 뒤에 도착한 실패 응답은 무시한다', async () => {
  const respond = stubFetchWithManualResponse()
  const { result, unmount } = renderHook(() => useApiResource('/api/x'))

  unmount()
  respond(new Response('{"message":"late failure"}', { status: 500 }))
  await flushPromises()

  expect(result.current.errorMessage).toBeNull()
})
