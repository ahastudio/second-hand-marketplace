import { test, expect } from '@playwright/test'
import { createProductViaApi, createUser, loginAs } from './helpers'

test.describe('E2E-05 상품 수정·삭제', () => {
  test('판매자가 상품을 수정하면 상세에 반영된다', async ({ page, request }) => {
    const seller = await createUser(request)
    const product = await createProductViaApi(request, seller, { title: '수정 전 제목', description: '수정 전', price: 1000 })
    await loginAs(page, seller)

    await page.goto(`/products/${product.id}`)
    await page.getByRole('link', { name: '수정' }).click()
    await expect(page).toHaveURL(`/products/${product.id}/edit`)
    await expect(page.getByLabel('제목')).toHaveValue('수정 전 제목')

    await page.getByLabel('제목').fill('수정 후 제목')
    await page.getByLabel('설명').fill('수정 후 설명')
    await page.getByLabel('가격').fill('2500')
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page).toHaveURL(`/products/${product.id}`)
    await expect(page.getByRole('heading', { name: '수정 후 제목' })).toBeVisible()
    await expect(page.getByText('수정 후 설명')).toBeVisible()
    await expect(page.getByTestId('product-price')).toHaveText('2,500원')
  })

  test('판매자가 삭제하면 목록에서 사라지고 상세는 찾을 수 없다', async ({ page, request }) => {
    const seller = await createUser(request)
    const title = `삭제대상${Date.now()}`
    const product = await createProductViaApi(request, seller, { title })
    await loginAs(page, seller)

    await page.goto(`/products/${product.id}`)
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: '삭제' }).click()
    await expect(page).toHaveURL('/')

    await page.getByRole('searchbox', { name: '검색' }).fill(title)
    await page.getByRole('button', { name: '검색' }).click()
    await expect(page.getByText('검색 결과가 없습니다')).toBeVisible()

    await page.goto(`/products/${product.id}`)
    await expect(page.getByText('상품을 찾을 수 없습니다')).toBeVisible()
  })

  test('다른 사용자의 상품에는 수정·삭제 버튼이 보이지 않는다', async ({ page, request }) => {
    const seller = await createUser(request, '판매자')
    const other = await createUser(request, '구경꾼')
    const product = await createProductViaApi(request, seller, { title: '남의 상품' })
    await loginAs(page, other)

    await page.goto(`/products/${product.id}`)
    await expect(page.getByRole('heading', { name: '남의 상품' })).toBeVisible()
    await expect(page.getByRole('link', { name: '수정' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(0)
  })

  test('비로그인 사용자에게도 수정·삭제 버튼이 보이지 않는다', async ({ page, request }) => {
    const seller = await createUser(request)
    const product = await createProductViaApi(request, seller, { title: '공개 상품' })
    await page.goto(`/products/${product.id}`)
    await expect(page.getByRole('heading', { name: '공개 상품' })).toBeVisible()
    await expect(page.getByRole('link', { name: '수정' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(0)
  })
})
