# PLAN: Outside-in TDD 개발 계획

- 상태: v1.0 — 계획 수행 완료, 실제 결과 반영됨 (2026-10-14)
- 기반: [01-PRD.md](01-PRD.md), [02-SPEC.md](02-SPEC.md)

## 1. 원칙

1. **E2E 테스트 먼저**: 각 기능은 반드시 Playwright E2E 테스트를 먼저 작성해 실패(Red)를 확인하고 시작한다.
2. **바깥에서 안으로**: E2E 테스트(Red) → 프론트 컴포넌트 테스트 → 백엔드 API 테스트 → 도메인/단위 테스트 순서로 내려가며 각 층을 Red→Green→Refactor.
3. **작은 수직 슬라이스**: 기능 하나(F1…F6)씩 끝까지 만들고 E2E 테스트가 Green이 되어야 다음으로 간다.
4. **단계마다 문서화**: 슬라이스 종료 시 `docs/devlog/NN-<slice>.md`를 남긴다.

## 2. 슬라이스 1개의 사이클

```text
1. E2E 테스트 시나리오 작성 (frontend/e2e/*.spec.ts)  → 실행해 Red 확인 (실패 이유 기록)
2. 프론트: 컴포넌트/페이지 테스트(Vitest) Red → 최소 구현 Green
3. 백엔드: API 테스트(MockMvc) Red → 컨트롤러/서비스/리포지토리 최소 구현 Green
4. 도메인/검증 단위 테스트 보강
5. E2E 테스트 재실행 → Green
6. 리팩터링 (모든 테스트 Green 유지)
7. devlog 작성
```

## 3. 단계

### Phase 0. 기반 셋업 (코드 최소, 테스트 인프라 중심)

- 0-1. `compose.yaml` (postgres, postgres-e2e)
- 0-2. `backend/` Spring Boot 스캐폴딩(Gradle, Web, JPA, Security, Flyway, Postgres, Testcontainers)
- 0-3. `frontend/` Vite + React + TS + Tailwind + Vitest + Playwright 스캐폴딩
- 0-4. Playwright 설정: `webServer`로 백엔드/프론트 기동, E2E 테스트 DB 연결
- 0-5. **스모크 E2E 테스트**(홈 화면이 열리고 제목이 보임)를 Red→Green으로 만들어 파이프라인 검증
- 산출물: `devlog/01-setup.md`

### Phase 1. F1 인증

- E2E-01 먼저 → 가입/로그인 화면, `/api/auth/*`, `/api/me`, JWT, 비밀번호 해시
- 산출물: `devlog/02-auth.md`

### Phase 2. F2 + F4 상품 등록·상세

- E2E-02, E2E-04 먼저 → `POST/GET /api/products(/{id})`, 등록 폼, 상세 페이지
- 산출물: `devlog/03-create-detail.md`

### Phase 3. F3 목록·검색

- E2E-03 먼저 → `GET /api/products?q=`, 목록/검색 UI, 빈 상태
- 산출물: `devlog/04-list-search.md`

### Phase 4. F5 수정·삭제

- E2E-05 먼저 → 소유권 검사(403), 수정 폼, 삭제
- 산출물: `devlog/05-edit-delete.md`

### Phase 5. F6 상태 변경

- E2E-06 먼저 → `PATCH /status`, 상태 배지/변경 UI
- 산출물: `devlog/06-status.md`

### Phase 6. 마무리

- 전체 E2E 테스트 통합 실행, README(실행 방법), 회고 `devlog/07-retro.md`

### Phase 7. 마감 다듬기 (계획 외 추가)

- 버튼 커서, Tailwind 스타일링, 페이지 title·lang·favicon, 샘플 스크린샷, `.gitignore`, 문서 동기화
- 같은 원칙(E2E 테스트 먼저 → Red 확인 → 구현)을 적용. 순수 스타일 변경은 기존 테스트가 회귀 안전망
- 산출물: `devlog/08-polish.md`

### Phase 8. 서버 배포 인프라

- SDKMAN!으로 Java 25 LTS 고정, Gradle toolchain과 백엔드 멀티스테이지 Dockerfile 일치
- `.nvmrc`로 Node 24 LTS 고정, 프론트 이미지에서 정적 빌드. API 주소는 빌드 인자 `VITE_API_BASE_URL`로 주입하고 백엔드는 허용 출처만 CORS로 연다(`/api` 프록시는 같은 출처 호출용으로 유지)
- Ansible로 Ubuntu/Debian 서버에 Docker, 두 애플리케이션 이미지, Compose 설정 배포
- 비밀값은 로컬 셸 환경변수로만 전달하고 서버에서 `.env`(0600)로 렌더링한다. 서버 주소·도메인·비밀값·이미지 산출물이 Git에 들어가지 않도록 ignore 처리하고, 이미 Docker가 설치된 서버는 설치를 건너뛴다
- 산출물: `devlog/09-infra.md`

### Phase 9. 보안 검토·강화

- 코드 리뷰·Trivy·`npm audit`·런타임 확인으로 취약점을 찾고, 항목마다 `SecurityHardeningTest`를 먼저 작성(Red)한 뒤 구현
- Argon2id, 로그인 잠금, 보안 헤더(CSP 포함), 오류 비노출, 컨테이너 강화, 의존성 패치, 설정 단일화(`application.yml`)
- 반복 가능한 점검 스크립트 `scripts/security-scan.sh`
- 산출물: `04-SECURITY.md`, `devlog/10-security.md`

### Phase 10. 품질 강화

- JaCoCo·Vitest 커버리지 측정 → 백엔드·프론트 100%를 빌드 임계값으로 강제, Checkstyle 위반 0 강제
- 기존 테스트를 안전망으로 이름·메서드/컴포넌트/훅 추출 리팩터링, 새 단위마다 테스트 추가
- `scripts/check-quality.sh`로 한 번에 점검, 품질·E2E 테스트·빌드·보안 스캔 전체는 `/check` 스킬로 점검
- 산출물: `devlog/11-quality.md`

## 4. 완료 정의 (슬라이스 단위)

- 해당 E2E 테스트, 프론트 테스트, 백엔드 테스트가 모두 Green
- 이전 슬라이스 테스트 회귀 없음
- devlog 작성됨 (Red 확인 기록, 설계 결정, 이슈, 다음 단계)

## 5. devlog 템플릿

```text
# NN. <슬라이스 이름>
- 날짜 / 대상 기능
- 작성한 E2E 테스트와 최초 Red 실패 원인
- 구현하며 내린 설계 결정과 이유
- 겪은 문제와 해결
- 테스트 현황(E2E 테스트/통합/단위 개수)
- 다음 단계
```

## 6. 실행 명령

```bash
docker compose up -d postgres            # 개발 DB (25803)
cd backend && ./gradlew test             # JUnit (Testcontainers, Docker 필요)
cd frontend && npm test                  # Vitest
docker compose up -d postgres-e2e        # E2E 테스트 전용 DB (25802)
cd frontend && npm run e2e               # Playwright (서버 자동 기동 또는 재사용)
scripts/stop-servers.sh [--with-db]      # 이 프로젝트의 서버만 종료
```

주의: 개발 서버가 떠 있으면 Playwright가 재사용해 E2E 테스트 데이터가 개발 DB에 쌓인다. E2E 테스트 전에 서버를 끈다.

## 7. 실제 진행 결과 (2026-10-14)

| Phase | 내용 | devlog | 누적 테스트 (E2E 테스트 / Vitest / JUnit) |
| --- | --- | --- | --- |
| 0 | 기반 셋업 + 스모크 | 01-setup | 1 / 1 / 1 |
| 1 | F1 인증 | 02-auth | 5 / 5 / 7 |
| 2 | F2 등록 + F4 상세 | 03-create-detail | 9 / 9 / 12 |
| 3 | F3 목록·검색 | 04-list-search | 13 / 12 / 15 |
| 4 | F5 수정·삭제 | 05-edit-delete | 17 / 17 / 22 |
| 5 | F6 상태 변경 | 06-status | 20 / 20 / 25 |
| 6 | 마무리·회고 | 07-retro | 20 / 20 / 25 |
| 7 | 마감 다듬기 | 08-polish | 26 / 23 / 25 |
| 8 | 서버 배포 인프라 | 09-infra | E2E 테스트 26 / Vitest 26 / JUnit 28 (API 주소·CORS 테스트 6개 추가) |
| 9 | 보안 검토·강화 | 10-security | E2E 테스트 26 / Vitest 26 / JUnit 37 (보안 테스트 9개 추가) |
| 10 | 품질 강화 | 11-quality | E2E 테스트 26 / Vitest 40 / JUnit 72, 커버리지 100% |

계획과 달라진 점

- devlog 번호가 계획보다 1씩 밀림(`00-docs`가 먼저 생겨 setup이 01).
- E2E-04의 "목록에서 카드 클릭→상세"는 목록이 있는 Phase 3으로 이동.
- Phase 7은 계획에 없던 추가 단계.
- 환경 변경: Java 21→17, Spring Boot 3→4.1, 포트 지정(25800~25803). 근거는 [SPEC §8](02-SPEC.md).
- 서버 배포 환경: Java 25 LTS(SDKMAN!), Gradle Wrapper 9.8.1, Node 24 LTS, Ansible + Docker Compose. 결정과 검증 현황은 [devlog 09](devlog/09-infra.md).

운영 규칙(실행 중 정립): 서버 종료는 `scripts/stop-servers.sh`만 사용하고 `pkill` 등 패턴 종료는 금지, 지침은 `AGENTS.md`(=`CLAUDE.md`)에만 기록.

## 8. 얻은 교훈 (다음 프로젝트에 적용)

- E2E 테스트는 자동 재시도하는 `expect`(`toHaveURL`, `toHaveCount`)로 "상태 도달"을 기다린다. 클릭/입력 전에 대상 상태를 보장하지 않으면 경쟁 조건이 생긴다(3건 발생, 모두 테스트 쪽).
- Red의 이유가 의도와 같은지 매번 확인한다. "없음을 검증하는" 테스트는 구현 전에도 통과하므로 회귀 방지용으로 구분해 기록한다.
- 사전 데이터는 UI가 아닌 API 헬퍼로 만든다.
- 공유 DB에서는 테스트마다 고유 키워드/이메일로 격리한다.
