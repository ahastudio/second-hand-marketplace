import { test, expect } from '@playwright/test'
import { createProductViaApi, createUser, loginAs } from './helpers'

const cursorOf = (locator: import('@playwright/test').Locator) =>
  locator.evaluate((el) => getComputedStyle(el).cursor)

test.describe('UI 버튼 커서', () => {
  test('버튼·링크·선택 상자 위에서 포인터 커서가 보인다', async ({ page, request }) => {
    const seller = await createUser(request)
    const product = await createProductViaApi(request, seller, { title: `커서${Date.now()}` })
    await loginAs(page, seller)

    await page.goto('/')
    expect(await cursorOf(page.getByRole('button', { name: '검색' }))).toBe('pointer')
    expect(await cursorOf(page.getByRole('button', { name: '로그아웃' }))).toBe('pointer')

    await page.goto(`/products/${product.id}`)
    expect(await cursorOf(page.getByRole('button', { name: '삭제' }))).toBe('pointer')
    expect(await cursorOf(page.getByLabel('판매 상태'))).toBe('pointer')
  })
})
