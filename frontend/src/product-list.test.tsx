import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { jsonResponse, renderAppAt } from './test-utils'

const item = (id: number, title: string, price = 10000, status = 'ON_SALE') => ({
  id,
  title,
  description: 'd',
  price,
  status,
  seller: { id: 1, nickname: '판매왕' },
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
})
const page = (items: unknown[]) => ({ items, page: 0, size: 20, total: items.length })

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test('홈에서 상품 카드를 제목·가격·상태와 함께 보여준다', async () => {
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, page([item(1, '자전거', 120000), item(2, '책상', 30000, 'SOLD')]))))
  renderAppAt('/')
  const cards = await screen.findAllByTestId('product-card')
  expect(cards).toHaveLength(2)
  expect(cards[0]).toHaveTextContent('자전거')
  expect(cards[0]).toHaveTextContent('120,000원')
  expect(cards[0]).toHaveTextContent('판매중')
  expect(cards[1]).toHaveTextContent('판매완료')
  expect(cards[0]).toHaveAttribute('href', '/products/1')
})

test('검색하면 q 파라미터로 다시 조회한다', async () => {
  const fetchMock = vi.fn((url: string) => jsonResponse(200, page(url.includes('q=%EC%B1%85%EC%83%81') ? [item(2, '책상')] : [item(1, '자전거'), item(2, '책상')])))
  vi.stubGlobal('fetch', fetchMock)
  renderAppAt('/')
  expect(await screen.findAllByTestId('product-card')).toHaveLength(2)

  await userEvent.type(screen.getByRole('searchbox', { name: '검색' }), '책상')
  await userEvent.click(screen.getByRole('button', { name: '검색' }))
  await vi.waitFor(() => expect(screen.getAllByTestId('product-card')).toHaveLength(1))
  expect(fetchMock.mock.calls.at(-1)![0]).toContain('q=%EC%B1%85%EC%83%81')
})

test('결과가 없으면 빈 상태 문구를 보여준다', async () => {
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, page([]))))
  renderAppAt('/')
  expect(await screen.findByText('검색 결과가 없습니다')).toBeInTheDocument()
})
