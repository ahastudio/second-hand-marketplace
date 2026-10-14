import { test, expect } from '@playwright/test'
import { createProductViaApi, createUser, loginAs } from './helpers'

const SITE = '중고거래 마켓'

test.describe('페이지 제목(title)', () => {
  test('홈은 서비스 이름, 문서 언어는 ko', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(SITE)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
  })

  test('로그인·회원가입 화면 제목', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(`로그인 · ${SITE}`)
    await page.goto('/signup')
    await expect(page).toHaveTitle(`회원가입 · ${SITE}`)
  })

  test('상품 등록·상세·수정 화면 제목', async ({ page, request }) => {
    const seller = await createUser(request)
    const product = await createProductViaApi(request, seller, { title: '제목확인용 상품' })
    await loginAs(page, seller)

    await page.goto('/products/new')
    await expect(page).toHaveTitle(`상품 등록 · ${SITE}`)
    await page.goto(`/products/${product.id}`)
    await expect(page).toHaveTitle(`제목확인용 상품 · ${SITE}`)
    await page.goto(`/products/${product.id}/edit`)
    await expect(page).toHaveTitle(`상품 수정 · ${SITE}`)
  })

  test('없는 상품은 찾을 수 없음 제목', async ({ page }) => {
    await page.goto('/products/99999999')
    await expect(page).toHaveTitle(`상품을 찾을 수 없습니다 · ${SITE}`)
  })

  test('파비콘이 정상 응답한다', async ({ request }) => {
    const res = await request.get('/favicon.svg')
    expect(res.headers()['content-type']).toContain('svg')
  })
})
