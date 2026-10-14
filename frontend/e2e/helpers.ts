import { expect, type APIRequestContext, type Page } from '@playwright/test'

const BACKEND = 'http://localhost:25801'
export const PASSWORD = 'password123'
export const uniqueEmail = () => `user-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`

export interface Session {
  token: string
  user: { id: number; email: string; nickname: string }
}

/** API로 가입·로그인해 세션을 만든다 (UI 시나리오의 사전 준비용) */
export async function createUser(request: APIRequestContext, nickname = '판매왕'): Promise<Session & { email: string }> {
  const email = uniqueEmail()
  const signup = await request.post(`${BACKEND}/api/auth/signup`, { data: { email, password: PASSWORD, nickname } })
  expect(signup.status()).toBe(201)
  const login = await request.post(`${BACKEND}/api/auth/login`, { data: { email, password: PASSWORD } })
  expect(login.status()).toBe(200)
  return { ...(await login.json()), email }
}

/** 페이지 로드 전에 로그인 상태를 주입한다 */
export async function loginAs(page: Page, session: Session) {
  await page.addInitScript((s) => localStorage.setItem('auth', JSON.stringify(s)), session)
}

export async function createProductViaApi(
  request: APIRequestContext,
  session: Session,
  data: { title: string; description?: string; price?: number },
) {
  const res = await request.post(`${BACKEND}/api/products`, {
    headers: { Authorization: `Bearer ${session.token}` },
    data: { description: '설명', price: 10000, ...data },
  })
  expect(res.status()).toBe(201)
  return res.json()
}
