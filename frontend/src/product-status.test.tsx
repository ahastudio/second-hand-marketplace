import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { jsonResponse, renderAppAt, sampleProduct as product, signInAs } from './test-utils'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test('판매자는 상태를 바꾸면 PATCH하고 배지가 갱신된다', async () => {
  signInAs(1)
  const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method === 'PATCH' ? jsonResponse(200, { ...product, status: 'RESERVED' }) : jsonResponse(200, product),
  )
  vi.stubGlobal('fetch', fetchMock)
  renderAppAt('/products/7')

  const select = await screen.findByLabelText('판매 상태')
  expect(select).toHaveValue('ON_SALE')
  await userEvent.selectOptions(select, 'RESERVED')

  expect(await screen.findByText('예약중', { selector: '[data-testid="product-status"]' })).toBeInTheDocument()
  const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')!
  expect(patch[0]).toBe('/api/products/7/status')
  expect(JSON.parse(patch[1]!.body as string)).toEqual({ status: 'RESERVED' })
  expect((patch[1]!.headers as Record<string, string>).Authorization).toBe('Bearer tok')
})

test('상태 변경에 실패하면 alert를 보여주고 기존 상태를 유지한다', async () => {
  signInAs(1)
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init?: RequestInit) =>
      init?.method === 'PATCH' ? jsonResponse(403, { code: 'FORBIDDEN', message: '본인의 상품만 수정하거나 삭제할 수 있습니다' }) : jsonResponse(200, product),
    ),
  )
  renderAppAt('/products/7')
  await userEvent.selectOptions(await screen.findByLabelText('판매 상태'), 'SOLD')
  expect(await screen.findByRole('alert')).toHaveTextContent('본인의 상품만')
  expect(screen.getByTestId('product-status')).toHaveTextContent('판매중')
})

test('판매자가 아니면 상태 변경 컨트롤이 없다', async () => {
  signInAs(2)
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, product)))
  renderAppAt('/products/7')
  await screen.findByRole('heading', { name: '아이폰 15' })
  expect(screen.queryByLabelText('판매 상태')).not.toBeInTheDocument()
})
