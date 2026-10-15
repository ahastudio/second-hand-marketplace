# SPEC: 기술/API/데이터 명세

- 상태: v1.1 — 구현 완료·코드와 동기화됨 (2026-10-15, 서버 배포·보안 강화 반영)
- 기반: [01-PRD.md](01-PRD.md) · 진행 계획: [03-PLAN.md](03-PLAN.md) · 보안: [04-SECURITY.md](04-SECURITY.md)
- 이 문서는 "구현된 것"을 기술한다. 계획과 달라진 부분은 §8 결정 사항 로그에 이유와 함께 남긴다.

## 1. 기술 스택

| 영역 | 선택 |
| --- | --- |
| Backend | Java 25 LTS (SDKMAN! `25.0.4-tem`), Gradle Wrapper 9.8.1, Spring Boot 4.1 (Web MVC), Spring Data JPA, Spring Security(JWT, Argon2id), Flyway, Bean Validation |
| JWT | `com.auth0:java-jwt` (HS256) + 자체 `JwtAuthFilter` |
| DB | PostgreSQL 16 (Docker Compose) |
| Backend 테스트 | JUnit 5, Spring Boot Test, MockMvc, Testcontainers(PostgreSQL) |
| Frontend | Node.js 24.21.0 LTS (`frontend/.nvmrc`), TypeScript, React 19, Vite, Tailwind CSS v4(`@tailwindcss/vite`), React Router 7 |
| Frontend 테스트 | Vitest + Testing Library(단위/컴포넌트), Playwright(E2E 테스트, Chromium) |
| 서버 배포 | Ansible + Docker Compose, PostgreSQL 16, 프론트 25800 / 백엔드 25801 |

## 2. 저장소 구조

```text
second-hand-marketplace/
├─ compose.yaml              # postgres(개발 25803), postgres-e2e(E2E 테스트 전용 25802, tmpfs)
├─ infra/                    # compose.yaml(운영), deploy.yml(Ansible), .env.j2, vars.yml, inventory.ini.example
├─ README.md                 # 실행/테스트 방법
├─ AGENTS.md                 # 프로젝트 지침 (CLAUDE.md는 이 파일의 심볼릭 링크)
├─ .gitignore
├─ docs/                     # PRD, SPEC, PLAN, SECURITY, devlog/
├─ scripts/                  # stop-servers.sh(우리 서버만 종료), security-scan.sh(보안 점검), capture-screenshots.mjs
├─ screenshots/              # 샘플 화면 캡처(13장) + README
├─ backend/                  # Spring Boot (포트 25801)
│  ├─ .sdkmanrc              # Java 25.0.4-tem
│  ├─ Dockerfile             # Java 25 Temurin 멀티스테이지 이미지
│  └─ src/main/java/com/marketplace/{auth,user,product,common}
└─ frontend/                 # Vite (포트 25800)
   ├─ .nvmrc                 # Node 24.21.0 LTS
   ├─ Dockerfile             # Node 빌드 + Nginx 정적 서비스 (VITE_API_BASE_URL 빌드 인자)
   ├─ nginx.conf             # 정적 서비스 + /api 프록시(같은 출처용)
   ├─ src/                   # api.ts, authContext.ts·AuthProvider.tsx, ui.ts(Tailwind 클래스 모음)
   │  ├─ components/         # Header, ProductCard, SearchBar, SellerControls, StatusBadge, FormField, ErrorAlert …
   │  ├─ hooks/              # useApiResource(조회), useDocumentTitle
   │  └─ pages/              # 화면(홈·로그인·가입·등록·수정·상세)
   └─ e2e/                   # Playwright 스펙 + helpers.ts
```

### 포트 (이 프로젝트 전용)

| 대상 | 포트 | 비고 |
| --- | --- | --- |
| Frontend (Vite) | 25800 | `/api`를 25801로 프록시 |
| Backend | 25801 | |
| E2E 테스트 DB (`postgres-e2e`) | 25802 | tmpfs — 컨테이너 재시작 시 초기화 |
| 개발 DB (`postgres`) | 25803 | 볼륨 유지 |

기본 포트(5432 등)는 충돌을 피하려고 사용하지 않는다.

운영 Compose(`infra/compose.yaml`, 서버의 `/opt/second-hand-marketplace/compose.yaml`)는 프론트 `25800:80`, 백엔드 `25801:25801`만 호스트에 공개한다. 세 서비스(postgres, backend, frontend)는 Compose가 프로젝트 이름으로 자동 생성하는 전용 네트워크 `second-hand-marketplace_default`에 연결되고, DB는 이 네트워크 안에서만 접근한다. 도메인/TLS는 별도 리버스 프록시가 맡는 것을 전제로 하며 이 저장소는 설정하지 않는다.

운영 API 주소: 프론트는 빌드 시 `VITE_API_BASE_URL`(`infra/vars.yml`의 `api_base_url`)을 주입받아 설정한 API 도메인으로 직접 호출한다(비우면 같은 출처의 `/api`, 개발·E2E 테스트 기본). 백엔드는 `APP_CORS_ALLOWED_ORIGINS`(`cors_allowed_origins`)에 있는 출처만 CORS로 허용하며, 비우면 CORS를 열지 않는다. 프론트 이미지의 Nginx `/api/` 프록시는 같은 출처 호출용으로 남겨 두었다.

## 3. 데이터 모델 (Flyway `V1`, `V2`)

**users**: `id` bigserial PK, `email` varchar(255) unique not null, `password_hash` varchar(255) not null(Argon2id, 접두사 포함. V3에서 100→255 확장), `nickname` varchar(20) not null, `created_at` timestamptz default now()

**products**: `id` bigserial PK, `seller_id` FK→users, `title` varchar(100), `description` varchar(2000) default '', `price` int check(≥0), `status` varchar(20) default `ON_SALE` (`ON_SALE`|`RESERVED`|`SOLD`), `created_at`, `updated_at` (timestamptz)

인덱스: `products(created_at DESC)`, `products(seller_id)`. 스키마는 Flyway 마이그레이션으로만 변경하고 JPA는 `ddl-auto=validate`.

## 4. REST API

공통: JSON, 오류 형식 `{ "code": "STRING", "message": "STRING" }`. 인증 필요 API는 `Authorization: Bearer <token>`(HS256, 만료 120분).

CORS: `app.cors.allowed-origins`(환경변수 `APP_CORS_ALLOWED_ORIGINS`, 쉼표 구분)에 있는 출처만 `/api/**`에 허용한다(메서드 GET·POST·PUT·PATCH·DELETE·OPTIONS, 헤더 `Authorization`·`Content-Type`). 기본값은 빈 값이라 개발·E2E 테스트(Vite 프록시)에서는 CORS가 열리지 않는다. 허용되지 않은 출처의 요청은 403.

| # | 메서드/경로 | 인증 | 설명 | 성공 | 오류 |
| --- | --- | --- | --- | --- | --- |
| 1 | POST `/api/auth/signup` | - | `{email,password,nickname}` | 201 `{id,email,nickname}` | 400 `VALIDATION_ERROR`, 409 `EMAIL_ALREADY_EXISTS` |
| 2 | POST `/api/auth/login` | - | `{email,password}` | 200 `{token,user}` | 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS`, 429 `TOO_MANY_ATTEMPTS` |
| 3 | GET `/api/me` | 필요 | 내 정보 | 200 `{id,email,nickname}` | 401 |
| 4 | POST `/api/products` | 필요 | `{title,description,price}` | 201 Product | 400, 401 |
| 5 | GET `/api/products?q=&page=0&size=20` | - | 최신순, q는 제목 부분일치(대소문자 무시) | 200 `{items,page,size,total}` | - |
| 6 | GET `/api/products/{id}` | - | 상세 | 200 Product | 404 `PRODUCT_NOT_FOUND` |
| 7 | PUT `/api/products/{id}` | 필요(본인) | 제목/설명/가격 수정 | 200 Product | 400, 401, 403 `FORBIDDEN`, 404 |
| 8 | DELETE `/api/products/{id}` | 필요(본인) | 삭제(물리 삭제) | 204 | 401, 403, 404 |
| 9 | PATCH `/api/products/{id}/status` | 필요(본인) | `{status}` — 자유 전이 | 200 Product | 400, 401, 403, 404 |

**Product**: `{id,title,description,price,status,seller:{id,nickname},createdAt,updatedAt}`

세부 동작

- 로그인은 이메일(정규화) 단위로 연속 5회 실패하면 10분간 429 `TOO_MANY_ATTEMPTS`(잠금 중에는 올바른 비밀번호도 거부, 성공하면 초기화). 없는 이메일도 같은 방식으로 센다. 상세는 [04-SECURITY.md](04-SECURITY.md).
- 인증 실패(토큰 없음/무효)는 `HttpStatusEntryPoint`가 **본문 없는 401**을 돌려준다(오류 형식 미적용). 로그인 자격 증명 오류의 401만 `{code,message}`를 가진다.
- 404(없는 상품)가 403(타인 상품)보다 먼저 판정된다.
- 목록: 정렬 `created_at DESC, id DESC`, `size`는 1~100으로 보정, 음수 `page`는 0, `q`는 trim·100자 제한 후 `lower(title) like lower('%q%') escape '!'`(와일드카드 `%`·`_`는 리터럴로 취급).
- 잘못된 enum 값/읽을 수 없는 본문은 400 `VALIDATION_ERROR`. `description`이 null이면 빈 문자열로 저장.

검증: email 형식(저장 전 trim·소문자 정규화), password 8~72자, nickname 1~20자, title 1~100자, description ≤ 2000자, price ≥ 0 정수, status 필수.

## 5. 프론트엔드

### 화면

| 경로 | 화면 | 접근 | 주요 셀렉터 |
| --- | --- | --- | --- |
| `/` | 상품 목록 + 검색 | 누구나 | `role=search`, 검색 입력(`aria-label=검색`), `data-testid=product-card`(링크), 빈 상태 "검색 결과가 없습니다" |
| `/login` | 로그인 | 누구나 | 라벨 이메일/비밀번호, "로그인" 버튼, `role=alert` |
| `/signup` | 회원가입 | 누구나 | 라벨 이메일/비밀번호/닉네임, "가입" 버튼 |
| `/products/new` | 상품 등록 | 로그인 필요(아니면 `/login`) | 라벨 제목/설명/가격, "등록" 버튼 |
| `/products/:id` | 상세 | 누구나 | `product-price`, `product-status`, `product-seller`, 본인만: 라벨 "판매 상태" select, "수정" 링크, "삭제" 버튼 |
| `/products/:id/edit` | 수정 | 로그인 필요 | 등록 폼 재사용(`ProductForm`), "저장" 버튼 |
| 공통 헤더 | 서비스 이름(h1), 로그인 시 `header-nickname` + "로그아웃" + "상품 등록" | | |

E2E 테스트 셀렉터는 `getByRole`/`getByLabel`을 우선하고 필요한 경우에만 `data-testid`를 쓴다.

### 인증 상태

토큰과 사용자 정보를 localStorage `auth` 키에 JSON으로 저장하고 `AuthProvider`가 관리한다(컨텍스트와 `useAuth`는 `authContext.ts`). API 클라이언트(`api.ts`)가 `Authorization` 헤더를 붙인다. 로그아웃은 클라이언트에서 저장값을 지우는 것이며 서버는 토큰을 폐기하지 않는다(만료까지 유효).

### 페이지 제목 (`useDocumentTitle`)

형식 `"{화면 이름} · 중고거래 마켓"`, 홈은 `중고거래 마켓`.

| 화면 | title |
| --- | --- |
| 홈 | 중고거래 마켓 |
| 로그인 / 회원가입 | 로그인 · … / 회원가입 · … |
| 상품 등록 / 수정 | 상품 등록 · … / 상품 수정 · … |
| 상품 상세 | {상품 제목} · … (없는 상품: 상품을 찾을 수 없습니다 · …) |

`index.html`: `lang="ko"`, 기본 title, meta description, theme-color, `favicon.svg`.

### 스타일 (Tailwind)

- 클래스 조합은 `src/ui.ts`(`btnPrimary/Secondary/Danger/Ghost`, `input`, `label`, `card`, `alert`)에 모으고 상태 표시는 `StatusBadge`(판매중=초록, 예약중=주황, 판매완료=회색, `whitespace-nowrap`)로 통일한다.
- Tailwind v4 preflight가 제거하는 버튼 커서를 `src/index.css`의 `@layer base`에서 복원한다(활성 `button`/`select` = pointer, 비활성 = not-allowed).

## 6. 테스트 시나리오 ↔ 스펙 파일

Playwright 스펙은 `frontend/e2e/`에 있고, 사전 데이터는 `helpers.ts`(API로 가입·로그인, localStorage 세션 주입, API로 상품 생성)로 만든다.

| ID | 기능 | 파일 | 시나리오 (개수) |
| --- | --- | --- | --- |
| E2E-01 | F1 | `auth.spec.ts` | 가입→로그인→닉네임 / 중복 이메일 오류 / 잘못된 비밀번호 오류 / 로그아웃 (4) |
| E2E-02 | F2 | `product-create.spec.ts` | 등록→상세 확인 / 비로그인 시 로그인으로 (2) |
| E2E-03 | F3 | `product-list.spec.ts` | 최신순 / 키워드 검색 / 빈 상태 / 카드 클릭→상세 (4) |
| E2E-04 | F4 | `product-detail.spec.ts` | 비로그인 상세 조회 / 없는 상품 문구 (2) |
| E2E-05 | F5 | `product-manage.spec.ts` | 본인 수정 / 본인 삭제 / 타인·비로그인에게 버튼 없음 (4) |
| E2E-06 | F6 | `product-status.spec.ts` | 예약중→판매완료 + 새로고침 유지 + 목록 반영 / 되돌리기 / 비판매자 컨트롤 없음 (3) |
| UI | 공통 | `title.spec.ts`, `ui-cursor.spec.ts` | 화면별 title·lang·favicon (5) / 버튼 pointer 커서 (1) |
| 스모크 | - | `smoke.spec.ts` | 홈에 서비스 제목 (1) |

현황: **E2E 테스트 26 · Vitest 40(11파일) · JUnit 72** 모두 통과 (2026-10-15), 백엔드·프론트 커버리지 100%. 2026-10-15에 추가된 `CorsTest`(3)는 CORS, `SecurityHardeningTest`(9)는 보안 강화 항목을 검증하고, 커버리지 100%를 위해 백엔드 단위 테스트(`JwtServiceTest`·`LoginAttemptLimiterTest`·`AuthServiceTest`·`SecurityConfigTest`·`SearchKeywordTest`·`BackendApplicationMainTest`)와 API 통합 테스트(알 수 없는 사용자 토큰, 비Bearer 헤더, 페이지 보정 등)를, 프론트에 `api.test.ts`·`useApiResource.test.tsx`·`authContext.test.tsx`·`error-handling.test.tsx`를 추가했다. 테스트 도우미는 `src/test-utils.tsx`로 모았다.

E2E 테스트 데이터 격리: 테스트마다 고유 이메일/키워드(타임스탬프+난수)를 쓰고 E2E 테스트 전용 DB(`postgres-e2e`)를 대상으로 한다. DB는 테스트 간 공유되므로 목록 검증은 고유 키워드로 검색해 결과를 좁힌다. **개발 서버(25800/25801)가 떠 있으면 Playwright가 그 서버를 재사용**해 데이터가 개발 DB에 쌓이므로, E2E 테스트 전에 `scripts/stop-servers.sh`로 끈다.

## 7. 테스트 전략 (피라미드)

1. **E2E 테스트 (Playwright)**: 기능당 happy path + 핵심 실패 경로. 가장 먼저 작성(Red).
2. **API 통합 (JUnit + MockMvc + Testcontainers)**: 상태 코드, 권한, 검증, 페이지네이션. 실제 PostgreSQL + Flyway.
3. **단위/컴포넌트 (Vitest)**: fetch를 스텁해 화면 동작·요청 본문·토큰을 검증, 제목·조회 훅, API 클라이언트.
4. **백엔드 단위 (JUnit, Mockito)**: 스프링 컨텍스트 없이 `JwtService`, `LoginAttemptLimiter`(가짜 시계), `AuthService`, `SecurityConfig`, `SearchKeyword`를 검증한다.

### 커버리지와 코드 스타일

- **커버리지 100%를 빌드가 강제한다.** 백엔드는 JaCoCo(명령어·분기·라인·메서드 각 100%, `./gradlew check`에 포함), 프론트엔드는 Vitest v8(문장·분기·함수·라인 각 100%, `npm run test:coverage`). 제외 대상은 프론트의 `main.tsx`(React 마운트 진입점), 테스트 코드·설정·도우미뿐이며 백엔드는 제외가 없다(`BackendApplication.main`도 테스트로 실행한다).
- **Checkstyle**(`backend/config/checkstyle/checkstyle.xml`, Checkstyle 14.3.0, 위반 0 강제): 탭 들여쓰기, 줄 길이 120, 와일드카드 import 금지, 미사용 import 금지, 중괄호·공백·수정자 순서, 이름 규칙 등. 테스트 메서드의 설명형 snake_case 이름과 Spring Boot 진입점 클래스만 `suppressions.xml`로 예외 처리했다. 프론트는 Oxlint와 `tsc -b`.
- **한 번에 실행**: `scripts/check-quality.sh`(E2E 테스트 제외), 전체(Markdown lint·테스트·빌드·E2E 테스트·보안 스캔)는 `/check` 스킬.
- **코딩 규칙**: 주석 대신 이름으로 의도를 드러낸다. 긴 메서드는 의도가 보이는 이름의 작은 메서드로 추출한다(예: `rejectIfEmailIsTaken`, `upgradePasswordHashIfOutdated`, `useApiResource`, `SellerControls`).

## 8. 결정 사항 로그

| 날짜 | 결정 | 이유 |
| --- | --- | --- |
| 2026-10-14 | JWT Bearer 인증 | SPA와 분리된 서버, 구현이 단순 |
| 2026-10-14 | Gradle, **Java 17** | 로컬에 JDK 17/25만 설치 (최초 가정 Java 21에서 변경) |
| 2026-10-14 | **Spring Boot 4.1.1** | Spring Initializr 기본값 (최초 가정 3.x에서 변경). Jackson 3, `AutoConfigureMockMvc` 패키지 이동 |
| 2026-10-14 | E2E 테스트는 `frontend/e2e` | Playwright는 Node 도구체인 |
| 2026-10-14 | 가격은 원 단위 정수 | MVP 단순화 |
| 2026-10-14 | 포트 FE 25800 / BE 25801 / E2E 테스트 DB 25802 | 흔한 기본 포트와 충돌하지 않도록 프로젝트 전용 대역 사용 |
| 2026-10-14 | 개발 DB 25803 | 5432 포트가 이미 점유되어 충돌 회피 |
| 2026-10-14 | JWT는 auth0 java-jwt + 자체 필터 | 의존성 최소, 구현 단순 |
| 2026-10-14 | 상태 전이 자유, 삭제는 물리 삭제 | MVP 단순화 (PRD Q3) |
| 2026-10-14 | 소유권 검사는 서비스 `findOwnedProduct`로 일원화 | 수정/삭제/상태변경 공통 규칙 |
| 2026-10-14 | 서버 종료는 `scripts/stop-servers.sh`(포트+cwd 검증)만 사용 | 의도하지 않은 프로세스 종료 방지. 초기의 `pkill -f` 사용을 교정 |
| 2026-10-14 | 지침은 프로젝트 지침 파일(`AGENTS.md`/`CLAUDE.md`)에만 기록 | 규칙이 저장소 안 한 곳에 있어야 누구나 같은 규칙으로 작업 |
| 2026-10-14 | Tailwind 클래스는 `ui.ts`로 집중, 커서는 base layer로 복원 | 일관성, Tailwind v4 preflight 대응 |
| 2026-10-14 | 샘플 스크린샷은 임시 데모 DB(`marketplace_demo`)에서 촬영 후 삭제 | 개발 DB의 테스트 데이터와 분리 |
| 2026-10-15 | Java 25.0.4-tem LTS를 SDKMAN!과 Gradle toolchain에 고정, Gradle Wrapper 9.8.1 유지 | Java 25를 지원하는 기존 wrapper 사용, 로컬·컨테이너 버전 일치 |
| 2026-10-15 | Node 24 LTS를 `.nvmrc`와 프론트 빌드 이미지에 지정 | 개발·배포 환경 일치 |
| 2026-10-15 | 운영 프론트는 `VITE_API_BASE_URL`로 API 도메인을 직접 호출하고 백엔드는 허용 출처만 CORS 허용 | 프론트·API가 서로 다른 도메인으로 서비스됨. 기본값은 빈 값이라 개발·E2E 테스트는 기존 Vite 프록시 유지 |
| 2026-10-15 | 비밀번호 해시를 BCrypt에서 Argon2id(19MiB·2회·병렬 1)로 교체, 기존 BCrypt 해시는 로그인 시 자동 업그레이드 | OWASP 권장. 기존 계정이 있어도 중단 없이 이전 |
| 2026-10-15 | 로그인 실패 5회 → 이메일 단위 10분 잠금(메모리 기반) | 무차별 대입 완화. 단일 인스턴스 전제, IP 제한은 프록시 몫 |
| 2026-10-15 | 설정은 `application.yml` 하나, 환경 값은 환경변수, JWT 비밀값 기본값 없음(32바이트 미만이면 기동 실패) | 운영에서 개발 기본값 사용 방지. 로컬 값은 `build.gradle`이 bootRun/test에만 주입 |
| 2026-10-15 | 컨테이너 읽기 전용·capability 제거·`no-new-privileges`, 프론트 Nginx CSP 등 보안 헤더 | 침해 시 영향 범위 축소, XSS 완화. 점검 절차는 [04-SECURITY.md](04-SECURITY.md) |
| 2026-10-15 | 개발 Vite 프록시는 `changeOrigin: false` | 백엔드 CORS 도입 후 Host가 바뀌어 교차 출처로 판정되는 회귀를 E2E 테스트가 발견 |
| 2026-10-15 | 커버리지 100%를 JaCoCo·Vitest 임계값으로 빌드에서 강제 | 회귀를 즉시 발견하고 리팩터링의 안전망으로 사용 |
| 2026-10-15 | Checkstyle 도입(위반 0 강제), 탭 들여쓰기·120자·와일드카드 import 금지 | 기존 코드 스타일(탭, Spring 스타일)을 규칙으로 고정 |
| 2026-10-15 | 주석 대신 이름, 메서드·컴포넌트·훅 추출 리팩터링 | 동작 변경 없이 테스트·E2E 테스트로 확인 |
| 2026-10-15 | 프론트 `auth.tsx`를 `authContext.ts` + `AuthProvider.tsx`로 분리 | 컴포넌트와 훅을 한 파일에서 export해 생기던 lint 경고 제거 |
| 2026-10-15 | 운영 비밀값(DB 비밀번호·JWT 비밀값)은 로컬에 저장하지 않고 서버 `.env`(0600)에만 두며, 재배포 때 같은 값을 export | 저장소·로컬 디스크 유출 방지. 단 서버 `.env`가 유일한 원본이라 별도 백업 필요 |
| 2026-10-15 | 운영 Compose 파일명을 `compose.yaml`로 통일, 이미 Docker·Compose가 있는 서버는 설치 건너뜀 | Compose 권장 파일명. 이미 설치된 Docker를 교체하지 않기 위함 |
| 2026-10-15 | 수동 서버 배포는 Ansible이 Docker Compose 환경을 구성 | 기존 로컬 개발/E2E 테스트 포트와 운영 공개 포트를 분리, 실제 주소·비밀값은 Git에서 제외 |
| 2026-10-15 | 이미지 스캔(Trivy) 결과에 맞춰 프론트 Alpine 패키지를 `apk upgrade`하고 Tomcat 11.0.25·Jackson 2.21.7/3.1.7로 상향 | HIGH/CRITICAL 중 수정 버전이 있는 취약점 0건 유지, Spring Boot가 반영하면 override 제거 |

## 9. 알려진 한계 (MVP 범위 밖)

- 목록 UI는 첫 20개만 표시(API는 페이지네이션 지원).
- 토큰은 localStorage 저장(XSS 노출 가능), 만료 시 자동 로그아웃·갱신 없음, 로그아웃이 서버 토큰을 폐기하지 않음.
- 인증 실패 401은 본문이 비어 있음(오류 형식 불일치).
- Testcontainers는 `postgres:latest`, Compose는 `postgres:16`(버전 불일치 가능).
- 서버 배포는 도메인/TLS, 자동 CI/CD, 자동 롤백이 범위 밖이다. 앱 포트를 직접 열면 평문 HTTP이므로 공개 환경에서는 HTTPS 리버스 프록시를 두고 `PUBLISH_HOST=127.0.0.1` 등으로 게시 범위를 좁힌다.
- 보안상 남은 위험(토큰 `localStorage` 저장, 메모리 기반 로그인 제한, 계정 복구·인증 기능 없음, 모의 침투 미실시 등)은 [04-SECURITY.md §5](04-SECURITY.md)에 정리했다.
- 운영 비밀값(DB 비밀번호·JWT 비밀값)의 원본은 서버 `.env` 하나뿐이다. 자동 백업·비밀 관리 도구 연동이 없으므로 직접 안전하게 보관해야 하며, 잃으면 복구할 수 없다.
