import { test, expect } from '@playwright/test'

test('홈 화면이 열리고 서비스 제목이 보인다', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '중고거래 마켓' })).toBeVisible()
})
