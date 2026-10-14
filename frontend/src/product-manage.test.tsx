import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'

const product = {
  id: 7,
  title: '아이폰 15',
  description: '거의 새 제품',
  price: 850000,
  status: 'ON_SALE',
  seller: { id: 1, nickname: '판매왕' },
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
}
const emptyPage = { items: [], page: 0, size: 20, total: 0 }

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function loginAs(id: number) {
  localStorage.setItem('auth', JSON.stringify({ token: 'tok', user: { id, email: 'a@b.com', nickname: '누군가' } }))
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test('본인 상품 상세에는 수정 링크와 삭제 버튼이 보인다', async () => {
  loginAs(1)
  vi.stubGlobal('fetch', vi.fn(() => json(200, product)))
  renderAt('/products/7')
  expect(await screen.findByRole('link', { name: '수정' })).toHaveAttribute('href', '/products/7/edit')
  expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
})

test('타인 또는 비로그인에게는 수정·삭제가 보이지 않는다', async () => {
  loginAs(2)
  vi.stubGlobal('fetch', vi.fn(() => json(200, product)))
  renderAt('/products/7')
  await screen.findByRole('heading', { name: '아이폰 15' })
  expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
})

test('삭제를 확인하면 DELETE 후 홈으로 이동한다', async () => {
  loginAs(1)
  vi.stubGlobal('confirm', () => true)
  const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method === 'DELETE' ? json(204, null) : _url === '/api/products/7' ? json(200, product) : json(200, emptyPage),
  )
  vi.stubGlobal('fetch', fetchMock)
  renderAt('/products/7')
  await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

  expect(await screen.findByRole('search')).toBeInTheDocument()
  const del = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')!
  expect(del[0]).toBe('/api/products/7')
  expect((del[1]!.headers as Record<string, string>).Authorization).toBe('Bearer tok')
})

test('삭제 확인을 취소하면 아무것도 하지 않는다', async () => {
  loginAs(1)
  vi.stubGlobal('confirm', () => false)
  const fetchMock = vi.fn(() => json(200, product))
  vi.stubGlobal('fetch', fetchMock)
  renderAt('/products/7')
  await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('수정 화면은 기존 값을 채우고 저장하면 PUT 후 상세로 이동한다', async () => {
  loginAs(1)
  const updated = { ...product, title: '수정된 제목', price: 2500 }
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => (init?.method === 'PUT' ? json(200, updated) : json(200, product)))
  vi.stubGlobal('fetch', fetchMock)
  renderAt('/products/7/edit')

  const title = await screen.findByLabelText('제목')
  expect(title).toHaveValue('아이폰 15')
  expect(screen.getByLabelText('가격')).toHaveValue(850000)
  await userEvent.clear(title)
  await userEvent.type(title, '수정된 제목')
  await userEvent.clear(screen.getByLabelText('가격'))
  await userEvent.type(screen.getByLabelText('가격'), '2500')
  await userEvent.click(screen.getByRole('button', { name: '저장' }))

  const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
  expect(put[0]).toBe('/api/products/7')
  expect(JSON.parse(put[1]!.body as string)).toEqual({ title: '수정된 제목', description: '거의 새 제품', price: 2500 })
  expect(await screen.findByTestId('product-price')).toBeInTheDocument()
})
