# 08. Phase 7 — 마감 다듬기

- 날짜: 2026-10-14
- 원칙은 동일: 가능한 것은 E2E 테스트/단위 테스트를 먼저 쓰고 Red를 확인한 뒤 구현. 순수 스타일 변경은 기존 테스트(E2E 테스트·Vitest)를 회귀 안전망으로 사용

## 버튼 포인터 커서

- E2E 테스트 먼저: `ui-cursor.spec.ts`가 검색·로그아웃·삭제 버튼과 판매 상태 select의 `cursor`를 검증. Red: `default`
- 원인: Tailwind v4 preflight가 버튼의 기본 pointer 커서를 제거
- 수정: `src/index.css` `@layer base`에서 활성 `button`/`select`는 pointer, 비활성은 not-allowed

## Tailwind 스타일링

- `src/ui.ts`에 버튼 4종/입력/라벨/카드/경고 클래스를 모으고, `StatusBadge`로 상태 색(초록/주황/회색)을 통일
- 헤더 고정+블러, 카드 그리드(모바일 1열/sm 이상 2열), hover 효과, 빈 상태 카드, 상세 관리 영역
- 스크린샷 검토에서 발견한 문제 2건 수정: "판매 상태" 라벨 줄바꿈(`whitespace-nowrap`), 모바일에서 상태 배지가 "판매/중"으로 꺾임(`shrink-0 whitespace-nowrap`)
- 기존 E2E 테스트/Vitest 수정 없이 통과(라벨·역할·testid 계약 유지)

## 페이지 제목·언어·파비콘

- E2E 테스트 먼저: `title.spec.ts` 5개(홈/로그인/가입/등록/상세/수정/없는 상품 title, `lang=ko`, favicon). Red 5/5: title이 템플릿 기본값 `frontend`, lang `en`, `favicon.svg` 404(Phase 0 템플릿 정리 때 삭제됨)
- `useDocumentTitle` 훅(Vitest 3개, import 실패로 Red 확인) + 화면별 적용 + `index.html`(lang, title, description, theme-color) + `public/favicon.svg`

## 샘플 스크린샷

- `screenshots/` 13장(데스크톱·모바일). 개발 DB의 테스트 데이터(`키워드1791…` 등)가 섞이지 않도록 개발 DB 컨테이너 안에 임시 `marketplace_demo` DB를 만들어 촬영 후 삭제
- 재현 스크립트 `scripts/capture-screenshots.mjs`, 절차는 `screenshots/README.md`

## `.gitignore`

- 루트에 범용 Node 템플릿이 이미 있어 프로젝트 전용 섹션을 덧붙임: OS/IDE, `.claude` 로컬 상태, Mutagen 설정·락, Gradle 산출물, Playwright/Vitest 산출물, 로컬 환경 변수 등
- 프로젝트가 git 저장소가 아니므로 임시 저장소에서 검증: 무시 13개·추적 14개 케이스 모두 기대대로 동작(`screenshots/`, `.env.example`, gradle wrapper jar는 추적)

## 문서 동기화·검토

- SPEC 전면 갱신(포트, 구조, API 오류 코드·세부 동작, 화면·셀렉터, title, 스타일, 테스트 매핑, 결정 로그, 알려진 한계), PRD(상태·열린 질문 결정·구현 현황), PLAN(devlog 파일명 정정, Phase 7, 실제 결과 표, 교훈), README, devlog 정정
- 검토에서 발견한 문서-코드 불일치: SPEC의 포트 8080/5173, PLAN의 devlog 번호, PRD/SPEC/PLAN의 "Draft" 상태, 열린 질문 미결, E2E 테스트 개수 20→26, 401 본문이 비어 있다는 사실 미기재
- 협업 도구 변화 확인: `CLAUDE.md`가 `AGENTS.md` 심볼릭 링크로 바뀌어 있어 문서에 반영

## 테스트 현황

E2E 테스트 26 · Vitest 23 · JUnit 25 — 모두 통과
