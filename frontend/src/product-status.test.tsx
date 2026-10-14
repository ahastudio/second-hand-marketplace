import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'

const product = {
  id: 7,
  title: '아이폰 15',
  description: '설명',
  price: 850000,
  status: 'ON_SALE',
  seller: { id: 1, nickname: '판매왕' },
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
}

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/products/7']}>
      <App />
    </MemoryRouter>,
  )
}

function loginAs(id: number) {
  localStorage.setItem('auth', JSON.stringify({ token: 'tok', user: { id, email: 'a@b.com', nickname: '누군가' } }))
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test('판매자는 상태를 바꾸면 PATCH하고 배지가 갱신된다', async () => {
  loginAs(1)
  const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method === 'PATCH' ? json(200, { ...product, status: 'RESERVED' }) : json(200, product),
  )
  vi.stubGlobal('fetch', fetchMock)
  renderDetail()

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
  loginAs(1)
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init?: RequestInit) =>
      init?.method === 'PATCH' ? json(403, { code: 'FORBIDDEN', message: '본인의 상품만 수정하거나 삭제할 수 있습니다' }) : json(200, product),
    ),
  )
  renderDetail()
  await userEvent.selectOptions(await screen.findByLabelText('판매 상태'), 'SOLD')
  expect(await screen.findByRole('alert')).toHaveTextContent('본인의 상품만')
  expect(screen.getByTestId('product-status')).toHaveTextContent('판매중')
})

test('판매자가 아니면 상태 변경 컨트롤이 없다', async () => {
  loginAs(2)
  vi.stubGlobal('fetch', vi.fn(() => json(200, product)))
  renderDetail()
  await screen.findByRole('heading', { name: '아이폰 15' })
  expect(screen.queryByLabelText('판매 상태')).not.toBeInTheDocument()
})
