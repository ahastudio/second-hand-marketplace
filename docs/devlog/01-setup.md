# 01. Phase 0 기반 셋업

- 날짜: 2026-10-14
- 초기 구성은 루트 Compose 파일(현재 `compose.yaml`)에서 postgres 5432, postgres-e2e 5433/tmpfs를 사용했다. `backend/`는 Spring Initializr, `frontend/`는 Vite react-ts + Tailwind 4 + Vitest + Playwright로 시작했다.
- 스모크 E2E 테스트: `frontend/e2e/smoke.spec.ts` (홈에서 "중고거래 마켓" 제목)
  - Red: 백엔드/프론트는 정상 기동, 제목 요소가 없어 `toBeVisible` 실패 (의도한 실패 이유)
  - Green: Vitest `App.test.tsx` Red → `App.tsx` 최소 구현 → E2E 테스트 통과
- 백엔드: Testcontainers 기반 `contextLoads` 통과
- 결정 변경: Java 21 → 17(JDK 미설치), Spring Boot 3 → 4.1.1(Initializr 기본값). SPEC 반영함
- 설계 포인트: Playwright `webServer`가 `./gradlew bootRun`(E2E 테스트 DB 5433 연결)과 `vite dev`를 기동. Vite가 `/api`를 8080으로 프록시
- 정정(이후 변경): 포트는 프로젝트 전용 대역으로 FE 25800 / BE 25801 / E2E 테스트 DB 25802, 개발 DB 25803으로 바뀜(5432·5433·8080·5173은 더 이상 사용하지 않음). [02-auth.md](02-auth.md), [SPEC §2](../02-SPEC.md) 참고
- 테스트 현황: E2E 테스트 1, Vitest 1, JUnit 1
- 주의: Playwright 사전 조건으로 `docker compose up -d postgres-e2e` 필요
- 다음: Phase 1 — E2E-01(가입/로그인) 작성 후 Red 확인
