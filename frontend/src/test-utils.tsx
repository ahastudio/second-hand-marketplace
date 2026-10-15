import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

export const sampleProduct = {
  id: 7,
  title: '아이폰 15',
  description: '거의 새 제품',
  price: 850000,
  status: 'ON_SALE',
  seller: { id: 1, nickname: '판매왕' },
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
}

export const emptyPage = { items: [], page: 0, size: 20, total: 0 }

export function jsonResponse(status: number, body: unknown) {
  const responseBody = status === 204 ? null : JSON.stringify(body)
  return Promise.resolve(
    new Response(responseBody, { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

export function renderAppAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

export function signInAs(userId: number, nickname = '누군가') {
  const session = { token: 'tok', user: { id: userId, email: 'a@b.com', nickname } }
  localStorage.setItem('auth', JSON.stringify(session))
}
