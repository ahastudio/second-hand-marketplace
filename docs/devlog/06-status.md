# 06. Phase 5 — F6 판매 상태 변경 (E2E-06)

- 날짜: 2026-10-14
- E2E 테스트 먼저: `product-status.spec.ts` 3개 — 예약중→판매완료 + 새로고침 유지 + 목록 반영, 판매중으로 되돌리기, 비판매자에게 컨트롤 미노출
  - Red: 상태 변경 컨트롤이 없어 2개 실패(미노출 검증 1개는 구현 전에도 통과 — 회귀 방지용)
- 백엔드 `ProductApiTest` +3: 자유 전이(ON_SALE/RESERVED/SOLD) 저장 확인, 타인 403 + 불변, 잘못된 값 400/본문 누락 400/무토큰 401/없는 상품 404
- 프론트 `product-status.test.tsx` 3개: PATCH 본문·토큰·배지 갱신, 실패 시 alert와 기존 상태 유지, 비판매자 컨트롤 없음
- 설계 결정
  - 상태 전이는 PRD 가정(Q3)대로 제약 없이 자유. `Product.changeStatus`가 `updatedAt` 갱신
  - 잘못된 enum 값은 `HttpMessageNotReadableException` 핸들러로 400 `VALIDATION_ERROR`
  - 상세 화면의 로딩 실패(`error`)와 동작 실패(`actionError`)를 분리해, 동작 실패 시 화면을 유지하고 alert만 표시
- 테스트 현황: E2E 테스트 20, Vitest 20, JUnit 25
- 다음: Phase 6 — 마무리(README, 회고)
