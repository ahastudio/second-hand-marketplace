// 샘플 스크린샷 생성기. 사용법과 주의사항은 screenshots/README.md 참고.
// 데모 DB에 연결된 서버(25800/25801)가 떠 있어야 하며, 실행할 때마다 샘플 데이터를 새로 등록한다.
import { fileURLToPath } from 'node:url'
import { chromium } from '../frontend/node_modules/playwright-core/index.mjs'

const OUT = process.argv[2] ?? fileURLToPath(new URL('../screenshots', import.meta.url))
const FE = 'http://localhost:25800'
const BE = 'http://localhost:25801'
const post = async (path, body, token, method = 'POST') => {
  const res = await fetch(BE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}`)
  return res.json()
}
const user = async (nickname) => {
  const email = `${nickname}-${Date.now()}@example.com`
  await post('/api/auth/signup', { email, password: 'password123', nickname })
  return post('/api/auth/login', { email, password: 'password123' })
}

const minho = await user('민호')
const sora = await user('소라')
const jisu = await user('지수')

const items = [
  [jisu, '다이소 접이식 수납박스 4개 세트', '이사하면서 쓰지 않게 되었어요. 깨끗합니다.', 8000, 'SOLD'],
  [sora, '무인양품 1인용 소파', '2년 사용했고 커버 세탁 완료했습니다. 직접 가져가셔야 해요.', 90000, 'RESERVED'],
  [minho, '삼성 27인치 모니터', '사무용으로 1년 사용했습니다. 불량 화소 없음, 박스 보관 중입니다.', 120000, 'ON_SALE'],
  [jisu, '미니 전기포트 0.8L', '거의 새 제품입니다. 여행용으로 사 두고 한 번도 안 썼어요.', 15000, 'ON_SALE'],
  [sora, '입문용 어쿠스틱 기타 (케이스 포함)', '줄 교체한 지 한 달 됐고 소리 좋습니다. 케이스, 스트랩, 피크 포함.', 70000, 'ON_SALE'],
  [minho, '아이패드 에어 5세대 64GB 와이파이', '애플펜슬 2세대와 함께 드립니다. 액정 필름 부착 상태, 배터리 효율 좋아요.', 520000, 'ON_SALE'],
  [jisu, '로드 자전거 (사이즈 M)', '출퇴근용으로 탔어요. 체인 교체했고 타이어 상태 좋습니다.', 180000, 'ON_SALE'],
  [minho, '닌텐도 스위치 OLED 화이트', '컨트롤러 포함 풀박스입니다. 마리오카트 게임 칩 함께 드려요.', 280000, 'ON_SALE'],
]
const created = []
for (const [u, title, description, price, status] of items) {
  const p = await post('/api/products', { title, description, price }, u.token)
  if (status !== 'ON_SALE') await post(`/api/products/${p.id}/status`, { status }, u.token, 'PATCH')
  created.push(p)
  await new Promise((r) => setTimeout(r, 30)) // createdAt 순서 보장
}
const ipad = created.find((p) => p.title.startsWith('아이패드'))
const sofa = created.find((p) => p.title.startsWith('무인양품'))

const browser = await chromium.launch()
const shot = async (name, { session, width = 1040, height = 780, path, setup, full = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: 'ko-KR' })
  const page = await ctx.newPage()
  if (session) await page.addInitScript((x) => localStorage.setItem('auth', JSON.stringify(x)), session)
  await page.goto(FE + path)
  await setup?.(page)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  await ctx.close()
}
const cards = (page) => page.waitForSelector('[data-testid=product-card]')

await shot('01-home', { path: '/', setup: cards, full: true })
await shot('02-home-logged-in', { path: '/', session: minho, setup: cards })
await shot('03-search', {
  path: '/',
  setup: async (page) => {
    await cards(page)
    await page.getByRole('searchbox', { name: '검색' }).fill('자전거')
    await page.getByRole('button', { name: '검색' }).click()
    await page.getByText('‘자전거’ 검색 결과').waitFor()
  },
})
await shot('04-search-empty', {
  path: '/',
  height: 520,
  setup: async (page) => {
    await cards(page)
    await page.getByRole('searchbox', { name: '검색' }).fill('캠핑 텐트')
    await page.getByRole('button', { name: '검색' }).click()
    await page.getByText('검색 결과가 없습니다').waitFor()
  },
})
await shot('05-detail-visitor', { path: `/products/${ipad.id}`, height: 640, setup: (p) => p.waitForSelector('[data-testid=product-price]') })
await shot('06-detail-owner', { path: `/products/${ipad.id}`, session: minho, height: 640, setup: (p) => p.getByLabel('판매 상태').waitFor() })
await shot('07-detail-reserved', { path: `/products/${sofa.id}`, height: 560, setup: (p) => p.waitForSelector('[data-testid=product-price]') })
await shot('08-login', { path: '/login', height: 600 })
await shot('09-signup', { path: '/signup', height: 680 })
await shot('10-new-product', { path: '/products/new', session: minho, height: 760 })
await shot('11-edit-product', { path: `/products/${ipad.id}/edit`, session: minho, height: 760, setup: (p) => p.waitForFunction(() => document.querySelector('input[name=title]')?.value) })
await shot('12-mobile-home', { path: '/', width: 390, height: 780, setup: cards })
await shot('13-mobile-detail', { path: `/products/${ipad.id}`, session: minho, width: 390, height: 780, setup: (p) => p.getByLabel('판매 상태').waitFor() })
await browser.close()
console.log('done')
