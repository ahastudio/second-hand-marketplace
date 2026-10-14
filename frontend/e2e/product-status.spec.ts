import { test, expect } from '@playwright/test'
import { createProductViaApi, createUser, loginAs } from './helpers'

test.describe('E2E-06 판매 상태 변경', () => {
  test('판매자가 예약중→판매완료로 바꾸면 상세와 목록에 반영된다', async ({ page, request }) => {
    const seller = await createUser(request)
    const title = `상태변경${Date.now()}`
    const product = await createProductViaApi(request, seller, { title })
    await loginAs(page, seller)

    await page.goto(`/products/${product.id}`)
    await expect(page.getByTestId('product-status')).toHaveText('판매중')

    await page.getByLabel('판매 상태').selectOption('RESERVED')
    await expect(page.getByTestId('product-status')).toHaveText('예약중')

    await page.getByLabel('판매 상태').selectOption('SOLD')
    await expect(page.getByTestId('product-status')).toHaveText('판매완료')

    // 새로고침해도 유지(서버에 저장됨)
    await page.reload()
    await expect(page.getByTestId('product-status')).toHaveText('판매완료')

    // 목록에도 반영
    await page.goto('/')
    await page.getByRole('searchbox', { name: '검색' }).fill(title)
    await page.getByRole('button', { name: '검색' }).click()
    await expect(page.getByTestId('product-card')).toHaveCount(1)
    await expect(page.getByTestId('product-card')).toContainText('판매완료')
  })

  test('판매완료 상품을 다시 판매중으로 되돌릴 수 있다', async ({ page, request }) => {
    const seller = await createUser(request)
    const product = await createProductViaApi(request, seller, { title: '되돌리기' })
    await loginAs(page, seller)
    await page.goto(`/products/${product.id}`)
    await page.getByLabel('판매 상태').selectOption('SOLD')
    await expect(page.getByTestId('product-status')).toHaveText('판매완료')
    await page.getByLabel('판매 상태').selectOption('ON_SALE')
    await expect(page.getByTestId('product-status')).toHaveText('판매중')
  })

  test('판매자가 아니면 상태 변경 컨트롤이 보이지 않는다', async ({ page, request }) => {
    const seller = await createUser(request, '판매자')
    const other = await createUser(request, '구경꾼')
    const product = await createProductViaApi(request, seller, { title: '남의 상품' })

    await page.goto(`/products/${product.id}`)
    await expect(page.getByLabel('판매 상태')).toHaveCount(0)

    await loginAs(page, other)
    await page.goto(`/products/${product.id}`)
    await expect(page.getByTestId('product-status')).toHaveText('판매중')
    await expect(page.getByLabel('판매 상태')).toHaveCount(0)
  })
})
