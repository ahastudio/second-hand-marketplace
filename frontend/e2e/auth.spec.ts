import { test, expect } from '@playwright/test'

const unique = () => `user-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
const PASSWORD = 'password123'

async function signup(page: import('@playwright/test').Page, email: string, nickname = '판매왕') {
  await page.goto('/signup')
  await page.getByLabel('이메일').fill(email)
  await page.getByLabel('비밀번호').fill(PASSWORD)
  await page.getByLabel('닉네임').fill(nickname)
  await page.getByRole('button', { name: '가입' }).click()
}

test.describe('E2E-01 인증', () => {
  test('가입 후 로그인하면 헤더에 닉네임이 보인다', async ({ page }) => {
    const email = unique()
    await signup(page, email)
    await expect(page).toHaveURL(/\/login/)

    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('비밀번호').fill(PASSWORD)
    await page.getByRole('button', { name: '로그인' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByTestId('header-nickname')).toHaveText('판매왕')
  })

  test('이미 가입된 이메일이면 오류 메시지를 본다', async ({ page }) => {
    const email = unique()
    await signup(page, email)
    await expect(page).toHaveURL(/\/login/)
    await signup(page, email)
    await expect(page.getByRole('alert')).toContainText('이미 가입된 이메일')
  })

  test('잘못된 비밀번호로 로그인하면 오류 메시지를 본다', async ({ page }) => {
    const email = unique()
    await signup(page, email)
    await expect(page).toHaveURL(/\/login/)

    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('비밀번호').fill('wrong-password')
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page.getByRole('alert')).toContainText('이메일 또는 비밀번호')
  })

  test('로그아웃하면 닉네임이 사라진다', async ({ page }) => {
    const email = unique()
    await signup(page, email)
    await expect(page).toHaveURL(/\/login/)
    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('비밀번호').fill(PASSWORD)
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page.getByTestId('header-nickname')).toBeVisible()

    await page.getByRole('button', { name: '로그아웃' }).click()
    await expect(page.getByTestId('header-nickname')).toHaveCount(0)
  })
})
