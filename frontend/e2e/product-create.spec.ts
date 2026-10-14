import { test, expect } from '@playwright/test'
import { createUser, loginAs } from './helpers'

test.describe('E2E-02 상품 등록', () => {
  test('로그인한 사용자가 상품을 등록하면 상세 페이지에서 내용을 확인한다', async ({ page, request }) => {
    const session = await createUser(request, '판매왕')
    await loginAs(page, session)

    await page.goto('/products/new')
    await page.getByLabel('제목').fill('아이폰 15 팝니다')
    await page.getByLabel('설명').fill('거의 새 제품입니다')
    await page.getByLabel('가격').fill('850000')
    await page.getByRole('button', { name: '등록' }).click()

    await expect(page).toHaveURL(/\/products\/\d+$/)
    await expect(page.getByRole('heading', { name: '아이폰 15 팝니다' })).toBeVisible()
    await expect(page.getByText('거의 새 제품입니다')).toBeVisible()
    await expect(page.getByTestId('product-price')).toHaveText('850,000원')
    await expect(page.getByTestId('product-status')).toHaveText('판매중')
    await expect(page.getByTestId('product-seller')).toHaveText('판매왕')
  })

  test('비로그인 사용자가 등록 페이지에 접근하면 로그인 페이지로 이동한다', async ({ page }) => {
    await page.goto('/products/new')
    await expect(page).toHaveURL(/\/login/)
  })
})
