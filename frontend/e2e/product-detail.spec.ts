import { test, expect } from '@playwright/test'
import { createProductViaApi, createUser } from './helpers'

test.describe('E2E-04 상품 상세', () => {
  test('비로그인 사용자도 상세 정보를 볼 수 있다', async ({ page, request }) => {
    const seller = await createUser(request, '동네상점')
    const product = await createProductViaApi(request, seller, { title: '자전거', description: '타기 좋아요', price: 120000 })

    await page.goto(`/products/${product.id}`)
    await expect(page.getByRole('heading', { name: '자전거' })).toBeVisible()
    await expect(page.getByTestId('product-seller')).toHaveText('동네상점')
    await expect(page.getByTestId('product-price')).toHaveText('120,000원')
    await expect(page.getByTestId('product-status')).toHaveText('판매중')
  })

  test('없는 상품이면 찾을 수 없음을 보여준다', async ({ page }) => {
    await page.goto('/products/99999999')
    await expect(page.getByText('상품을 찾을 수 없습니다')).toBeVisible()
  })

  // 목록에서 카드 클릭 → 상세 이동 시나리오는 목록이 생기는 Phase 3(E2E-03)에서 추가한다.
})
