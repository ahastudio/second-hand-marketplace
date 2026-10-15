# 03. Phase 2 — F2 상품 등록 + F4 상세 (E2E-02, E2E-04)

- 날짜: 2026-10-14
- E2E 테스트 먼저: `product-create.spec.ts`(등록→상세 확인, 비로그인 리다이렉트), `product-detail.spec.ts`(공개 상세, 404 문구)
  - Red: `/products/new`, `/products/:id` 화면 부재로 4/4 실패
  - 사전 데이터는 `e2e/helpers.ts`(API로 가입·로그인, localStorage 세션 주입, API로 상품 생성)로 만들어 UI 시나리오를 짧게 유지
- 백엔드 `ProductApiTest` 5개: 등록 201, 토큰 없음 401, 검증 400, 공개 상세 200, 없는 상품 404 `PRODUCT_NOT_FOUND` (Red 4 → Green)
- 프론트 `products.test.tsx` 4개: 상세 렌더, 404 문구, 비로그인 리다이렉트, 등록 시 토큰·본문 검증 후 상세 이동
- 설계 결정
  - `V2__create_products.sql`; `created_at/updated_at`은 엔티티에서 `Instant.now()`로 채워 저장 직후 응답에 값이 있게 함
  - description은 null이면 빈 문자열로 저장
  - `RequireAuth` 래퍼로 보호 라우트 처리
  - 폼은 지금은 등록 전용. 수정(Phase 4)에서 재사용하도록 리팩터링 예정
- 범위 조정: E2E-04의 "목록에서 카드 클릭→상세" 단계는 목록이 있는 Phase 3(E2E-03)로 이동
- 이슈: 테스트 코드의 미사용 인자로 `tsc -b` 오류 → `_url`로 수정
- 테스트 현황: E2E 테스트 9, Vitest 9, JUnit 12
- 다음: Phase 3 — E2E-03(목록·검색) 먼저 작성
