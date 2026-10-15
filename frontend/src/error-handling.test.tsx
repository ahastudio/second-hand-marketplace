import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { emptyPage, jsonResponse, renderAppAt, sampleProduct, signInAs } from './test-utils'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

const forbidden = { code: 'FORBIDDEN', message: '본인의 상품만 수정하거나 삭제할 수 있습니다' }

test('저장된 로그인 정보가 깨져 있으면 로그아웃 상태로 시작한다', async () => {
  localStorage.setItem('auth', '{깨진 JSON')
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, emptyPage)))

  renderAppAt('/')

  expect(await screen.findByRole('link', { name: '로그인' })).toBeInTheDocument()
  expect(screen.queryByTestId('header-nickname')).not.toBeInTheDocument()
})

test('상품 삭제가 실패하면 서버 메시지를 보여 주고 상세에 남는다', async () => {
  signInAs(1)
  vi.stubGlobal('confirm', () => true)
  vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) =>
    init?.method === 'DELETE' ? jsonResponse(403, forbidden) : jsonResponse(200, sampleProduct),
  ))
  renderAppAt('/products/7')

  await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(forbidden.message)
  expect(screen.getByRole('heading', { name: '아이폰 15' })).toBeInTheDocument()
})

test('수정할 상품을 불러오지 못하면 오류 메시지를 보여 준다', async () => {
  signInAs(1)
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(404, { code: 'PRODUCT_NOT_FOUND', message: '상품을 찾을 수 없습니다' })))

  renderAppAt('/products/7/edit')

  expect(await screen.findByText('상품을 찾을 수 없습니다')).toBeInTheDocument()
})

test('상품 등록이 실패하면 폼에 서버 메시지를 보여 준다', async () => {
  signInAs(1)
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(400, { code: 'VALIDATION_ERROR', message: 'price: 0 이상이어야 합니다' })))
  renderAppAt('/products/new')

  await userEvent.type(screen.getByLabelText('제목'), '새 상품')
  await userEvent.type(screen.getByLabelText('가격'), '1000')
  await userEvent.click(screen.getByRole('button', { name: '등록' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('price: 0 이상이어야 합니다')
})
