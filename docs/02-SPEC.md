# SPEC: 기술/API/데이터 명세

- 상태: v1.0 — 구현 완료·코드와 동기화됨 (2026-10-14)
- 기반: [01-PRD.md](01-PRD.md) · 진행 계획: [03-PLAN.md](03-PLAN.md)
- 이 문서는 "구현된 것"을 기술한다. 계획과 달라진 부분은 §8 결정 사항 로그에 이유와 함께 남긴다.

## 1. 기술 스택
| 영역 | 선택 |
|---|---|
| Backend | Java 17, Spring Boot 4.1 (Web MVC), Spring Data JPA, Spring Security(JWT), Flyway, Bean Validation, Gradle |
| JWT | `com.auth0:java-jwt` (HS256) + 자체 `JwtAuthFilter` |
| DB | PostgreSQL 16 (Docker Compose) |
| Backend 테스트 | JUnit 5, Spring Boot Test, MockMvc, Testcontainers(PostgreSQL) |
| Frontend | TypeScript, React 19, Vite, Tailwind CSS v4(`@tailwindcss/vite`), React Router 7 |
| Frontend 테스트 | Vitest + Testing Library(단위/컴포넌트), Playwright(E2E, Chromium) |

## 2. 저장소 구조
```
second-hand-marketplace/
├─ docker-compose.yml        # postgres(개발 25803), postgres-e2e(E2E 전용 25802, tmpfs)
├─ README.md                 # 실행/테스트 방법
├─ AGENTS.md                 # 프로젝트 지침 (CLAUDE.md는 이 파일의 심볼릭 링크)
├─ .gitignore
├─ docs/                     # PRD, SPEC, PLAN, devlog/
├─ scripts/                  # stop-servers.sh(우리 서버만 종료), capture-screenshots.mjs
├─ screenshots/              # 샘플 화면 캡처(13장) + README
├─ backend/                  # Spring Boot (포트 25801)
│  └─ src/main/java/com/marketplace/{auth,user,product,common}
└─ frontend/                 # Vite (포트 25800)
   ├─ src/                   # 페이지, auth, api, ui.ts(Tailwind 클래스 모음), StatusBadge …
   └─ e2e/                   # Playwright 스펙 + helpers.ts
```

### 포트 (이 프로젝트 전용)
| 대상 | 포트 | 비고 |
|---|---|---|
| Frontend (Vite) | 25800 | `/api`를 25801로 프록시 |
| Backend | 25801 | |
| E2E DB (`postgres-e2e`) | 25802 | tmpfs — 컨테이너 재시작 시 초기화 |
| 개발 DB (`postgres`) | 25803 | 볼륨 유지 |

기본 포트(5432 등)는 충돌을 피하려고 사용하지 않는다.

## 3. 데이터 모델 (Flyway `V1`, `V2`)
**users**: `id` bigserial PK, `email` varchar(255) unique not null, `password_hash` varchar(100) not null(BCrypt), `nickname` varchar(20) not null, `created_at` timestamptz default now()

**products**: `id` bigserial PK, `seller_id` FK→users, `title` varchar(100), `description` varchar(2000) default '', `price` int check(≥0), `status` varchar(20) default `ON_SALE` (`ON_SALE`|`RESERVED`|`SOLD`), `created_at`, `updated_at` (timestamptz)

인덱스: `products(created_at DESC)`, `products(seller_id)`. 스키마는 Flyway 마이그레이션으로만 변경하고 JPA는 `ddl-auto=validate`.

## 4. REST API
공통: JSON, 오류 형식 `{ "code": "STRING", "message": "STRING" }`. 인증 필요 API는 `Authorization: Bearer <token>`(HS256, 만료 120분).

| # | 메서드/경로 | 인증 | 설명 | 성공 | 오류 |
|---|---|---|---|---|---|
| 1 | POST `/api/auth/signup` | - | `{email,password,nickname}` | 201 `{id,email,nickname}` | 400 `VALIDATION_ERROR`, 409 `EMAIL_ALREADY_EXISTS` |
| 2 | POST `/api/auth/login` | - | `{email,password}` | 200 `{token,user}` | 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS` |
| 3 | GET `/api/me` | 필요 | 내 정보 | 200 `{id,email,nickname}` | 401 |
| 4 | POST `/api/products` | 필요 | `{title,description,price}` | 201 Product | 400, 401 |
| 5 | GET `/api/products?q=&page=0&size=20` | - | 최신순, q는 제목 부분일치(대소문자 무시) | 200 `{items,page,size,total}` | - |
| 6 | GET `/api/products/{id}` | - | 상세 | 200 Product | 404 `PRODUCT_NOT_FOUND` |
| 7 | PUT `/api/products/{id}` | 필요(본인) | 제목/설명/가격 수정 | 200 Product | 400, 401, 403 `FORBIDDEN`, 404 |
| 8 | DELETE `/api/products/{id}` | 필요(본인) | 삭제(물리 삭제) | 204 | 401, 403, 404 |
| 9 | PATCH `/api/products/{id}/status` | 필요(본인) | `{status}` — 자유 전이 | 200 Product | 400, 401, 403, 404 |

**Product**: `{id,title,description,price,status,seller:{id,nickname},createdAt,updatedAt}`

세부 동작
- 인증 실패(토큰 없음/무효)는 `HttpStatusEntryPoint`가 **본문 없는 401**을 돌려준다(오류 형식 미적용). 로그인 자격 증명 오류의 401만 `{code,message}`를 가진다.
- 404(없는 상품)가 403(타인 상품)보다 먼저 판정된다.
- 목록: 정렬 `created_at DESC, id DESC`, `size`는 1~100으로 보정, 음수 `page`는 0, `q`는 trim 후 `lower(title) like lower('%q%')`(와일드카드 `%`·`_` 미이스케이프).
- 잘못된 enum 값/읽을 수 없는 본문은 400 `VALIDATION_ERROR`. `description`이 null이면 빈 문자열로 저장.

검증: email 형식, password 8~72자(BCrypt 한계), nickname 1~20자, title 1~100자, description ≤ 2000자, price ≥ 0 정수, status 필수.

## 5. 프론트엔드
### 화면
| 경로 | 화면 | 접근 | 주요 셀렉터 |
|---|---|---|---|
| `/` | 상품 목록 + 검색 | 누구나 | `role=search`, 검색 입력(`aria-label=검색`), `data-testid=product-card`(링크), 빈 상태 "검색 결과가 없습니다" |
| `/login` | 로그인 | 누구나 | 라벨 이메일/비밀번호, "로그인" 버튼, `role=alert` |
| `/signup` | 회원가입 | 누구나 | 라벨 이메일/비밀번호/닉네임, "가입" 버튼 |
| `/products/new` | 상품 등록 | 로그인 필요(아니면 `/login`) | 라벨 제목/설명/가격, "등록" 버튼 |
| `/products/:id` | 상세 | 누구나 | `product-price`, `product-status`, `product-seller`, 본인만: 라벨 "판매 상태" select, "수정" 링크, "삭제" 버튼 |
| `/products/:id/edit` | 수정 | 로그인 필요 | 등록 폼 재사용(`ProductForm`), "저장" 버튼 |
| 공통 헤더 | 서비스 이름(h1), 로그인 시 `header-nickname` + "로그아웃" + "상품 등록" | | |

E2E 셀렉터는 `getByRole`/`getByLabel`을 우선하고 필요한 경우에만 `data-testid`를 쓴다.

### 인증 상태
토큰과 사용자 정보를 localStorage `auth` 키에 JSON으로 저장하고 `AuthProvider`가 관리한다. API 클라이언트(`api.ts`)가 `Authorization` 헤더를 붙인다. 로그아웃은 클라이언트에서 저장값을 지우는 것이며 서버는 토큰을 폐기하지 않는다(만료까지 유효).

### 페이지 제목 (`useDocumentTitle`)
형식 `"{화면 이름} · 중고거래 마켓"`, 홈은 `중고거래 마켓`.
| 화면 | title |
|---|---|
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
|---|---|---|---|
| E2E-01 | F1 | `auth.spec.ts` | 가입→로그인→닉네임 / 중복 이메일 오류 / 잘못된 비밀번호 오류 / 로그아웃 (4) |
| E2E-02 | F2 | `product-create.spec.ts` | 등록→상세 확인 / 비로그인 시 로그인으로 (2) |
| E2E-03 | F3 | `product-list.spec.ts` | 최신순 / 키워드 검색 / 빈 상태 / 카드 클릭→상세 (4) |
| E2E-04 | F4 | `product-detail.spec.ts` | 비로그인 상세 조회 / 없는 상품 문구 (2) |
| E2E-05 | F5 | `product-manage.spec.ts` | 본인 수정 / 본인 삭제 / 타인·비로그인에게 버튼 없음 (4) |
| E2E-06 | F6 | `product-status.spec.ts` | 예약중→판매완료 + 새로고침 유지 + 목록 반영 / 되돌리기 / 비판매자 컨트롤 없음 (3) |
| UI | 공통 | `title.spec.ts`, `ui-cursor.spec.ts` | 화면별 title·lang·favicon (5) / 버튼 pointer 커서 (1) |
| 스모크 | - | `smoke.spec.ts` | 홈에 서비스 제목 (1) |

현황: **E2E 26 · Vitest 23(7파일) · JUnit 25** 모두 통과 (2026-10-14).

E2E 데이터 격리: 테스트마다 고유 이메일/키워드(타임스탬프+난수)를 쓰고 E2E 전용 DB(`postgres-e2e`)를 대상으로 한다. DB는 테스트 간 공유되므로 목록 검증은 고유 키워드로 검색해 결과를 좁힌다. **개발 서버(25800/25801)가 떠 있으면 Playwright가 그 서버를 재사용**해 데이터가 개발 DB에 쌓이므로, E2E 전에 `scripts/stop-servers.sh`로 끈다.

## 7. 테스트 전략 (피라미드)
1. **E2E (Playwright)**: 기능당 happy path + 핵심 실패 경로. 가장 먼저 작성(Red).
2. **API 통합 (JUnit + MockMvc + Testcontainers)**: 상태 코드, 권한, 검증, 페이지네이션. 실제 PostgreSQL + Flyway.
3. **단위/컴포넌트 (Vitest)**: fetch를 스텁해 화면 동작·요청 본문·토큰을 검증, 제목 훅.

## 8. 결정 사항 로그
| 날짜 | 결정 | 이유 |
|---|---|---|
| 2026-10-14 | JWT Bearer 인증 | SPA와 분리된 서버, 구현이 단순 |
| 2026-10-14 | Gradle, **Java 17** | 로컬에 JDK 17/25만 설치 (최초 가정 Java 21에서 변경) |
| 2026-10-14 | **Spring Boot 4.1.1** | Spring Initializr 기본값 (최초 가정 3.x에서 변경). Jackson 3, `AutoConfigureMockMvc` 패키지 이동 |
| 2026-10-14 | E2E는 `frontend/e2e` | Playwright는 Node 도구체인 |
| 2026-10-14 | 가격은 원 단위 정수 | MVP 단순화 |
| 2026-10-14 | 포트 FE 25800 / BE 25801 / E2E DB 25802 | 사용자 지정 |
| 2026-10-14 | 개발 DB 25803 | 5432 포트가 이미 점유되어 충돌 회피 |
| 2026-10-14 | JWT는 auth0 java-jwt + 자체 필터 | 의존성 최소, 구현 단순 |
| 2026-10-14 | 상태 전이 자유, 삭제는 물리 삭제 | MVP 단순화 (PRD Q3) |
| 2026-10-14 | 소유권 검사는 서비스 `findOwned`로 일원화 | 수정/삭제/상태변경 공통 규칙 |
| 2026-10-14 | 서버 종료는 `scripts/stop-servers.sh`(포트+cwd 검증)만 사용 | 의도하지 않은 프로세스 종료 방지. 초기의 `pkill -f` 사용을 교정 |
| 2026-10-14 | 지침은 프로젝트 지침 파일(`AGENTS.md`/`CLAUDE.md`)에만 기록, Claude 메모리 미사용 | 사용자 지시 |
| 2026-10-14 | Tailwind 클래스는 `ui.ts`로 집중, 커서는 base layer로 복원 | 일관성, Tailwind v4 preflight 대응 |
| 2026-10-14 | 샘플 스크린샷은 임시 데모 DB(`marketplace_demo`)에서 촬영 후 삭제 | 개발 DB의 테스트 데이터와 분리 |

## 9. 알려진 한계 (MVP 범위 밖)
- 목록 UI는 첫 20개만 표시(API는 페이지네이션 지원).
- 검색어의 LIKE 와일드카드 미이스케이프, 이메일 대소문자 정규화 없음.
- 토큰은 localStorage 저장(XSS 노출 가능), 만료 시 자동 로그아웃·갱신 없음, 로그아웃이 서버 토큰을 폐기하지 않음.
- 인증 실패 401은 본문이 비어 있음(오류 형식 불일치).
- Testcontainers는 `postgres:latest`, Compose는 `postgres:16`(버전 불일치 가능).
- 린트 경고 1건(`auth.tsx` fast-refresh: 컴포넌트와 훅을 함께 export).
