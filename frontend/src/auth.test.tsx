import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test('가입 성공 시 로그인 페이지로 이동한다', async () => {
  vi.stubGlobal('fetch', vi.fn(() => json(201, { id: 1, email: 'a@b.com', nickname: '닉' })))
  renderAt('/signup')
  await userEvent.type(screen.getByLabelText('이메일'), 'a@b.com')
  await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
  await userEvent.type(screen.getByLabelText('닉네임'), '닉')
  await userEvent.click(screen.getByRole('button', { name: '가입' }))
  expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
})

test('중복 이메일이면 서버 메시지를 alert로 보여준다', async () => {
  vi.stubGlobal('fetch', vi.fn(() => json(409, { code: 'EMAIL_ALREADY_EXISTS', message: '이미 가입된 이메일입니다' })))
  renderAt('/signup')
  await userEvent.type(screen.getByLabelText('이메일'), 'a@b.com')
  await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
  await userEvent.type(screen.getByLabelText('닉네임'), '닉')
  await userEvent.click(screen.getByRole('button', { name: '가입' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('이미 가입된 이메일')
})

test('로그인 성공 시 헤더에 닉네임이 보이고 로그아웃하면 사라진다', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      url.startsWith('/api/auth/login')
        ? json(200, { token: 't', user: { id: 1, email: 'a@b.com', nickname: '판매왕' } })
        : json(200, { items: [], page: 0, size: 20, total: 0 }),
    ),
  )
  renderAt('/login')
  await userEvent.type(screen.getByLabelText('이메일'), 'a@b.com')
  await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
  await userEvent.click(screen.getByRole('button', { name: '로그인' }))
  expect(await screen.findByTestId('header-nickname')).toHaveTextContent('판매왕')

  await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))
  expect(screen.queryByTestId('header-nickname')).not.toBeInTheDocument()
})

test('로그인 실패 시 alert를 보여준다', async () => {
  vi.stubGlobal('fetch', vi.fn(() => json(401, { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' })))
  renderAt('/login')
  await userEvent.type(screen.getByLabelText('이메일'), 'a@b.com')
  await userEvent.type(screen.getByLabelText('비밀번호'), 'bad')
  await userEvent.click(screen.getByRole('button', { name: '로그인' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호')
})
