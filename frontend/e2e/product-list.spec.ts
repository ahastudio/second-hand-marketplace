import { test, expect } from '@playwright/test'
import { createProductViaApi, createUser } from './helpers'

// DB가 테스트 간 공유되므로 테스트마다 고유 키워드를 제목에 넣어 결과를 격리한다
const key = () => `키워드${Date.now()}${Math.floor(Math.random() * 1e6)}`

test.describe('E2E-03 상품 목록·검색', () => {
  test('최신 등록 상품이 먼저 보인다', async ({ page, request }) => {
    const seller = await createUser(request)
    const k = key()
    await createProductViaApi(request, seller, { title: `${k} 먼저 등록` })
    await createProductViaApi(request, seller, { title: `${k} 나중 등록` })

    await page.goto('/')
    await page.getByRole('searchbox', { name: '검색' }).fill(k)
    await page.getByRole('button', { name: '검색' }).click()

    const cards = page.getByTestId('product-card')
    await expect(cards).toHaveCount(2)
    await expect(cards.first()).toContainText('나중 등록')
    await expect(cards.last()).toContainText('먼저 등록')
  })

  test('키워드로 제목을 검색하면 일치하는 상품만 보인다', async ({ page, request }) => {
    const seller = await createUser(request)
    const k = key()
    await createProductViaApi(request, seller, { title: `${k} 노트북`, price: 500000 })
    await createProductViaApi(request, seller, { title: `다른물건${k.slice(-6)}` })

    await page.goto('/')
    await page.getByRole('searchbox', { name: '검색' }).fill(k)
    await page.getByRole('button', { name: '검색' }).click()

    await expect(page.getByTestId('product-card')).toHaveCount(1)
    await expect(page.getByTestId('product-card')).toContainText('노트북')
    await expect(page.getByTestId('product-card')).toContainText('500,000원')
    await expect(page.getByTestId('product-card')).toContainText('판매중')
  })

  test('검색 결과가 없으면 빈 상태 문구를 본다', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: '검색' }).fill(`없는상품${key()}`)
    await page.getByRole('button', { name: '검색' }).click()
    await expect(page.getByText('검색 결과가 없습니다')).toBeVisible()
    await expect(page.getByTestId('product-card')).toHaveCount(0)
  })

  test('목록에서 카드를 클릭하면 상세 페이지로 이동한다', async ({ page, request }) => {
    const seller = await createUser(request, '동네상점')
    const k = key()
    await createProductViaApi(request, seller, { title: `${k} 책상`, description: '튼튼한 책상' })

    await page.goto('/')
    await page.getByRole('searchbox', { name: '검색' }).fill(k)
    await page.getByRole('button', { name: '검색' }).click()
    await expect(page.getByTestId('product-card')).toHaveCount(1)
    await page.getByTestId('product-card').click()

    await expect(page).toHaveURL(/\/products\/\d+$/)
    await expect(page.getByRole('heading', { name: `${k} 책상` })).toBeVisible()
    await expect(page.getByTestId('product-seller')).toHaveText('동네상점')
  })
})
