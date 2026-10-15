import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { jsonResponse, renderAppAt, sampleProduct as product, signInAs } from './test-utils'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test('상세 화면은 상품 정보를 보여준다', async () => {
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, product)))
  renderAppAt('/products/7')
  expect(await screen.findByRole('heading', { name: '아이폰 15' })).toBeInTheDocument()
  expect(screen.getByText('거의 새 제품')).toBeInTheDocument()
  expect(screen.getByTestId('product-price')).toHaveTextContent('850,000원')
  expect(screen.getByTestId('product-status')).toHaveTextContent('판매중')
  expect(screen.getByTestId('product-seller')).toHaveTextContent('판매왕')
})

test('없는 상품이면 찾을 수 없음 문구를 보여준다', async () => {
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(404, { code: 'PRODUCT_NOT_FOUND', message: '상품을 찾을 수 없습니다' })))
  renderAppAt('/products/999')
  expect(await screen.findByText('상품을 찾을 수 없습니다')).toBeInTheDocument()
})

test('비로그인 상태로 등록 화면에 가면 로그인 화면으로 이동한다', async () => {
  renderAppAt('/products/new')
  expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
})

test('등록하면 토큰과 함께 POST하고 상세 화면으로 이동한다', async () => {
  signInAs(1, '판매왕')
  const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method === 'POST' ? jsonResponse(201, product) : jsonResponse(200, product),
  )
  vi.stubGlobal('fetch', fetchMock)
  renderAppAt('/products/new')
  await userEvent.type(screen.getByLabelText('제목'), '아이폰 15')
  await userEvent.type(screen.getByLabelText('설명'), '거의 새 제품')
  await userEvent.type(screen.getByLabelText('가격'), '850000')
  await userEvent.click(screen.getByRole('button', { name: '등록' }))

  expect(await screen.findByRole('heading', { name: '아이폰 15' })).toBeInTheDocument()
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('/api/products')
  expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  expect(JSON.parse(init!.body as string)).toEqual({ title: '아이폰 15', description: '거의 새 제품', price: 850000 })
})
