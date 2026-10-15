# SECURITY: 보안 설계·점검·반복 방법

- 상태: v1.0 (2026-10-15)
- 관련 문서: [02-SPEC.md](02-SPEC.md)(명세·결정 로그), [../infra/README.md](../infra/README.md)(배포), [devlog 10](devlog/10-security.md)(이번 강화 작업 기록)
- 목적: 어떤 보안 장치가 있는지, **어떻게 문제를 찾았는지**(도구·절차), 어떻게 **같은 점검을 다시 돌리는지**를 남긴다.

## 1. 한눈에 보기

| 영역 | 장치 | 도입 시점 |
| --- | --- | --- |
| 비밀번호 | Argon2id 해시(기존 BCrypt는 로그인 시 자동 업그레이드), 응답에 해시·비밀번호 미노출 | BCrypt: Phase 1 / Argon2id: 2026-10-15 |
| 인증 | 상태 없는(stateless) JWT(HS256, 만료 120분, 발급자 검증), 비밀값 32바이트 이상 강제 | Phase 1, 강화 2026-10-15 |
| 인가 | `/api/auth/**`·`GET /api/products/**`만 공개, 나머지 인증 필요, 본인 상품만 수정·삭제·상태 변경(타인 403) | Phase 1~5 |
| 무차별 대입 | 이메일 단위 로그인 실패 5회 → 10분 잠금(429 `TOO_MANY_ATTEMPTS`) | 2026-10-15 |
| 계정 존재 추측 | 로그인 오류 메시지 통일 + 없는 이메일도 해시 검증을 수행(응답 시간 차이 제거) | 메시지: Phase 1 / 타이밍: 2026-10-15 |
| 입력 검증 | Bean Validation(길이·형식·범위), 이메일 정규화(소문자·trim), 검색어 LIKE 와일드카드 이스케이프·100자 제한, JPA 파라미터 바인딩(SQL 인젝션 방지) | Phase 1~3, 강화 2026-10-15 |
| 브라우저 보안 | CORS 허용 출처 목록, API 보안 헤더, 프론트 Nginx CSP 등 보안 헤더 | 2026-10-15 |
| 오류 노출 | 오류 응답에 메시지·스택·예외명 미포함, 기본 사용자 비밀번호 로그 제거 | 2026-10-15 |
| 설정·비밀값 | `application.yml` 하나, 환경별 값은 환경변수, JWT 비밀값은 기본값 없음, 서버 `.env`는 0600 | 2026-10-15 |
| 컨테이너 | 백엔드 비루트 실행, 읽기 전용 파일시스템, 모든 capability 제거, `no-new-privileges`, DB 포트 미게시 | 2026-10-15 |
| 의존성·이미지 | `npm audit`, Trivy 이미지·시크릿 스캔, 패치 버전 고정 | 2026-10-15 |
| 배포 | Ansible이 약한 비밀값이면 중단, 비밀값 로그 숨김(`no_log`), 실제 주소·도메인·비밀값은 Git 제외 | 2026-10-15 |

## 2. 기존에 해 둔 것 (강화 이전)

Phase 1~5(인증·상품 기능)와 배포 인프라 작업에서 이미 들어 있던 장치다. 상세한 구현 위치는 [SPEC](02-SPEC.md)와 각 devlog에 있다.

- **비밀번호**: 해시로만 저장하고 응답 DTO(`UserResponse`)에 포함하지 않는다. 가입 시 길이 8~72자.
- **JWT 인증**: `JwtAuthFilter`가 `Authorization: Bearer`를 검증해 사용자 ID만 인증 주체로 넣는다. 서명 알고리즘은 서버가 고정한 HS256이라 토큰 헤더로 알고리즘을 바꿀 수 없다.
- **CSRF**: 세션·쿠키 인증을 쓰지 않고 헤더 토큰만 쓰므로 CSRF 보호를 끈다(쿠키 기반으로 바꾸면 반드시 다시 켜야 한다).
- **인가**: 소유자 검증(`findOwnedProduct`)을 서비스 계층에서 수행하고 타인의 상품은 403이다. 없는 상품(404)과 구분되지만 상품 ID는 공개 정보라 노출 문제는 없다.
- **입력 검증**: DTO에 `@Size`·`@Min`·`@Email` 등 제약, 잘못된 본문은 400 `VALIDATION_ERROR`.
- **중복 가입 경쟁**: 사전 조회와 DB unique 위반을 모두 409로 처리해 동시 가입에도 일관된다.
- **XSS**: React가 문자열을 이스케이프하고 코드에 `dangerouslySetInnerHTML`·`innerHTML`·`eval`을 쓰지 않는다.
- **인프라**: 런타임 컨테이너는 비루트 `app` 사용자, DB는 호스트 포트를 열지 않음, Ansible은 비밀값이 64자 미만이면 중단하고 `.env`를 0600으로 만들며 로그에 비밀값을 남기지 않음(`no_log`), 서버 주소·비밀값은 `.gitignore`로 제외.
- **이미지 취약점**: 배포 인프라 작업에서 Dockerfile 진단 도구가 보고한 취약점을 확인하고 기본 이미지를 최신 안정 태그로 갱신했다.

## 3. 이번 강화에서 찾고 고친 것 (2026-10-15)

### 3.1 어떻게 찾았나 (방법)

| # | 방법 | 도구·절차 | 찾은 것 |
| --- | --- | --- | --- |
| A | 코드 리뷰 | 인증·보안 설정·서비스·DTO·저장소·Dockerfile·Compose·Ansible·Nginx 설정을 직접 읽으며 OWASP Top 10, OWASP ASVS(인증·세션·접근 통제·입력 검증·오류 처리·구성) 항목에 대조 | S1~S9, S11, S12 |
| B | 의존성·이미지 스캔 | **Trivy**(`aquasec/trivy` 컨테이너, Docker 소켓으로 로컬 이미지 스캔) — `--severity HIGH,CRITICAL --ignore-unfixed` | 프론트 Nginx(Alpine) 44건, 백엔드 jar 13건(Tomcat 11.0.24 치명적 3, Jackson 높음 10) |
| C | npm 의존성 점검 | `npm audit --audit-level=high` | 0건 |
| D | 시크릿 스캔 | `trivy fs --scanners secret`(저장소 전체, `node_modules`·빌드 산출물 제외) | 0건 |
| E | 런타임 확인 | 강화한 이미지를 로컬 Compose로 실제 기동해 `curl`로 헤더·CORS·잠금·해시 형식을 확인하고, 컨테이너 로그를 읽음 | 자동 생성 기본 사용자 비밀번호가 로그에 출력됨, `open-in-view` 경고 |
| F | 자동 테스트 | JUnit(`SecurityHardeningTest`·`CorsTest` 등), Vitest, Playwright E2E 테스트 전체 재실행 | 개발 프록시의 CORS 회귀(아래 S10), 스캔이 새로 추가한 BouncyCastle 1.82의 취약점 |

사용하지 않은 것(범위 밖, 한계로 인정): 모의 침투 테스트(penetration test), 정적 분석 도구(Semgrep·CodeQL·SpotBugs), 동적 스캐너(OWASP ZAP), 외부 보안 감사. 이 문서의 결과는 "코드 리뷰 + 스캐너 + 테스트"의 범위다.

### 3.2 발견 사항과 조치

| ID | 발견 (방법) | 위험 | 조치 | 검증 |
| --- | --- | --- | --- | --- |
| S1 | BCrypt 사용 (A) | 더 강한 메모리 하드 KDF 권장 | **Argon2id**(메모리 19MiB, 반복 2, 병렬 1 — OWASP 권장 하한)로 교체. `DelegatingPasswordEncoder`로 `{argon2@SpringSecurity_v5_8}` 접두사를 붙여 저장. 접두사 없는 기존 BCrypt 해시는 계속 검증하고 로그인 성공 시 Argon2id로 다시 저장. `password_hash` 컬럼을 255자로 확장(`V3` 마이그레이션). BouncyCastle(`bcprov`) 의존성 추가 | `password_is_stored_as_argon2`, `legacy_bcrypt_hash_still_logs_in_and_is_upgraded_to_argon2`, 로컬 DB에서 해시 접두사 확인 |
| S2 | 로그인 시도 횟수 제한 없음 (A) | 무차별 대입·비밀번호 스터핑 | `LoginAttemptLimiter`: 이메일(정규화) 단위 5회 연속 실패 시 10분 잠금, 잠금 중에는 올바른 비밀번호도 429, 성공하면 초기화. 없는 이메일도 똑같이 센다 | `repeated_login_failures_lock_the_account_temporarily`, `successful_login_resets_failure_count`, 로컬 컨테이너에서 6번째 시도 429 |
| S3 | 로그인 시 없는 이메일은 해시 계산을 건너뜀 (A) | 응답 시간 차이로 가입 여부 추측 | 없는 이메일에도 더미 해시로 `matches`를 수행 | `AuthServiceTest`가 없는 이메일 로그인에서도 해시 검증이 호출되는지 확인 |
| S4 | 이메일 대소문자 구분 (A, 기존 알려진 한계) | `A@x.com`/`a@x.com` 중복 계정·사칭 | 가입·로그인에서 trim + 소문자 정규화 | `email_is_case_insensitive` |
| S5 | JWT 비밀값 기본값이 소스에 있음, 길이 검증 없음, 발급자 미검증 (A) | 기본값 그대로 운영되면 누구나 토큰 위조 | 기본값 제거(`APP_JWT_SECRET` 필수), 32바이트 미만이면 기동 실패, `iss`(발급자)·`iat` 추가 및 검증. 로컬 개발·테스트용 값은 `build.gradle`이 `bootRun`/`test`에만 주입(이미지에는 없음) | `jwt_with_wrong_issuer_or_weak_secret_is_rejected`, 이미지를 `APP_JWT_SECRET` 없이 기동하면 `Could not resolve placeholder`로, 5바이트 값이면 `최소 32바이트` 오류로 기동 실패(임시 DB 컨테이너로 확인) |
| S6 | 토큰을 `localStorage`에 저장 (A) | XSS가 있으면 토큰 탈취 | 구조는 유지(MVP 범위). 프론트에 엄격한 CSP(`script-src 'self'`, 인라인 스크립트 금지)를 적용해 XSS 가능성을 줄임. 한계로 문서화 | 로컬 응답 헤더 확인 |
| S7 | 보안 헤더 없음 (A, E) | 클릭재킹·MIME 스니핑·정보 노출 | API: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, `Cache-Control: no-cache, no-store, ...`. 프론트 Nginx: CSP(`default-src 'self'`, `connect-src`는 API 출처만 추가), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `server_tokens off`, `client_max_body_size 1m` | `api_responses_carry_security_headers`, 로컬 `curl -I` |
| S8 | 오류 응답·로그 노출 (A, E) | 내부 정보 노출 | `server.error.include-*` 전부 끔. Spring이 로그에 출력하던 **임의 생성 기본 사용자 비밀번호**를 막으려고 `rejectAllUserDetailsService`(모든 사용자명을 거부하는 빈 `UserDetailsService`)로 대체. `open-in-view` 끔 | `unauthenticated_error_does_not_leak_details`, 컨테이너 로그에서 해당 문구 0건 |
| S9 | 검색어의 LIKE 와일드카드(`%`, `_`) 미이스케이프 (A, 기존 알려진 한계) | 의도치 않은 광범위 검색(성능 저하) | `!`를 이스케이프 문자로 사용해 리터럴 처리, 길이 100자 제한 | `search_wildcards_are_treated_literally` |
| S10 | CORS 미설정 → 프론트·API 도메인 분리 시 필요 (A) | 허용 범위 불명확 | 허용 출처 목록(`APP_CORS_ALLOWED_ORIGINS`)만 허용, 기본 빈 값. **E2E 테스트가 회귀를 발견**: Vite 프록시의 `changeOrigin`이 Host를 바꿔 개발 환경 요청이 교차 출처로 판정되어 403 → `changeOrigin: false`로 수정 | `CorsTest` 3개, E2E 테스트 26개 통과 |
| S11 | 컨테이너 권한 과다 (A) | 침해 시 영향 범위 | 백엔드: `read_only`, `cap_drop: ALL`, `no-new-privileges`, `/tmp`만 tmpfs. 프론트: `read_only`, `cap_drop: ALL` 후 Nginx 기동에 필요한 4개만 추가, 쓰기 경로는 tmpfs. DB: `no-new-privileges` | 로컬 Compose 기동, 백엔드 `touch`가 읽기 전용 오류, 사용자 `uid=999(app)` |
| S12 | 포트가 모든 인터페이스에 게시 (A) | TLS 없이 직접 접근 가능 | `PUBLISH_HOST`(Ansible 변수 `marketplace_publish_host`)로 게시 주소를 제한 가능. 같은 호스트의 리버스 프록시만 쓰면 `127.0.0.1` 권장(기본값은 호환을 위해 `0.0.0.0`) | Compose 설정 검증 |
| S13 | 취약한 의존성 (B) | 알려진 CVE | 아래 3.3 참고 | 재스캔 0건 |
| S14 | 환경별 설정 파일이 흩어짐 (A) | 운영에서 개발 기본값 사용 위험 | `application.yml` 하나만 사용하고 환경 값은 환경변수로 주입. 프로필 파일 제거. 로컬 개발 기본값은 DB 접속뿐 | 기동·테스트 통과 |

### 3.3 의존성·이미지 취약점 처리 내역

| 대상 | 최초 결과 | 조치 | 재스캔 |
| --- | --- | --- | --- |
| 프론트 Nginx 이미지(Alpine 3.23) | HIGH 44건(util-linux, libxml2, pcre2, nghttp2, tiff 등 — 모두 수정 버전 존재) | 최종 단계에 `apk upgrade --no-cache` | 0건 |
| 백엔드 jar | CRITICAL 3(Tomcat 11.0.24) + HIGH 10(Jackson 2.21.5 / 3.1.5) | Tomcat 11.0.25, Jackson 2 BOM 2.21.7, Jackson 3 BOM 3.1.7로 상향(`build.gradle`의 `ext[...]`). Spring Boot가 해당 패치를 반영하면 제거 | 0건 |
| 백엔드 jar (Argon2용 BouncyCastle) | 추가한 `bcprov` 1.82에서 CRITICAL 2 + HIGH 2 | 수정 버전 1.85로 상향 | 0건 |
| 프론트 npm | - | - | `npm audit` 0건 |

`--ignore-unfixed`를 쓰므로 **수정 버전이 아직 없는 취약점은 목록에 나오지 않는다.** 스캔을 반복할 때 Trivy 데이터베이스가 갱신되면 새 결과가 나올 수 있다.

## 4. 점검을 반복하는 방법

### 4.1 한 번에 실행

```bash
scripts/security-scan.sh              # 이미지를 새로 빌드해서 스캔
scripts/security-scan.sh --skip-build # 이미 빌드한 :scan 태그를 재사용
```

Docker만 있으면 된다(Trivy는 컨테이너로 실행하므로 설치가 필요 없다). 스크립트는 `npm audit` → 백엔드·프론트 이미지 Trivy 스캔 → 저장소 시크릿 스캔 → 백엔드 보안 테스트 순서로 실행하고, 하나라도 실패하면 종료 코드 1을 반환한다.

### 4.2 직접 확인할 때 쓴 명령

```bash
# 이미지 취약점 (표 형태)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest \
  image --severity HIGH,CRITICAL --ignore-unfixed marketplace-backend:scan

# 보안 테스트만
cd backend && ./gradlew test --tests '*SecurityHardeningTest' --tests '*CorsTest'

# 강화한 운영 설정을 로컬에서 실제로 기동해 확인(프로젝트 이름을 분리하고, 검증 후 해당 프로젝트만 정리)
cd infra
export DB_NAME=m DB_USERNAME=m DB_PASSWORD=$(openssl rand -hex 32) APP_JWT_SECRET=$(openssl rand -hex 32) \
  APP_CORS_ALLOWED_ORIGINS=https://app.example.com API_ORIGIN=https://api.example.com PUBLISH_HOST=127.0.0.1
docker compose -p shm-verify -f compose.yaml up -d
curl -sI localhost:25800/                       # 프론트 보안 헤더
curl -sI localhost:25801/api/products           # API 보안 헤더
docker exec shm-verify-backend-1 id             # 비루트 확인
docker compose -p shm-verify -f compose.yaml down -v
```

### 4.3 코드 리뷰 체크리스트 (A의 기준)

기능을 추가하거나 바꿀 때 아래를 훑는다.

1. **인증**: 새 엔드포인트가 `SecurityConfig`의 공개 목록에 의도치 않게 들어가지 않았는가? 토큰·비밀번호가 로그·응답에 나오는가?
2. **인가**: 리소스 소유자 검증을 서비스에서 하는가? 새 쓰기 API에 소유자 테스트(타인 403)가 있는가?
3. **입력**: 모든 DTO 필드에 길이·범위 제약이 있는가? 쿼리 문자열을 이어 붙이지 않고 파라미터 바인딩을 쓰는가?
4. **오류**: 예외 메시지·스택이 응답에 새어 나가지 않는가?
5. **설정**: 새 환경 값은 `application.yml`에서 환경변수로 받는가? 비밀값에 기본값이 없는가?
6. **의존성**: 새 라이브러리를 넣은 뒤 `scripts/security-scan.sh`를 돌렸는가? (이번에도 새로 추가한 라이브러리에서 취약점이 나왔다.)
7. **프론트**: `dangerouslySetInnerHTML`, 인라인 스크립트·스타일, 외부 도메인 요청이 늘었는가? 늘었다면 CSP(`frontend/nginx.conf.template`)를 갱신했는가?
8. **인프라**: 새 포트·볼륨·권한 상승이 생겼는가? 실제 주소·도메인·비밀값이 Git에 들어가지 않았는가? (`git grep --cached`와 Trivy 시크릿 스캔으로 확인)

## 5. 남은 위험·한계 (의도적으로 범위 밖)

| 항목 | 설명 | 완화·권장 |
| --- | --- | --- |
| 토큰 저장 | `localStorage`에 JWT 저장(XSS 시 탈취 가능), 서버 측 폐기·갱신·자동 로그아웃 없음 | CSP 적용. 필요하면 HttpOnly 쿠키 + CSRF 방어로 전환 |
| 로그인 제한의 성격 | 단일 인스턴스 메모리 기반(재시작 시 초기화), 이메일 단위라 타인이 일부러 실패시켜 계정을 일시 잠글 수 있음, IP 단위 제한 없음 | 리버스 프록시에서 IP 단위 요청 제한 병행. 다중 인스턴스면 저장소(Redis 등) 필요 |
| 가입 시 이메일 존재 노출 | 중복 가입은 409로 알려 준다 | 필요하면 이메일 인증 흐름으로 전환 |
| 계정 기능 | 이메일 인증, 비밀번호 재설정, 비밀번호 변경, 다단계 인증 없음 | 후속 기능 |
| 타이밍 보호 검증 | 더미 해시 검증 호출은 테스트하지만 실제 응답 시간을 측정하지는 않음 | 필요 시 별도 측정 |
| 다른 엔드포인트 요청 제한 | 로그인 외(가입·등록 등)에는 요청 빈도 제한이 없음 | 프록시 레벨 제한 |
| 요청 본문 크기 | 앱에는 본문 크기 제한이 없고 필드 길이만 검증 | 프록시의 `client_max_body_size` 설정 |
| HTTPS/HSTS | TLS와 HSTS는 앞단 리버스 프록시의 책임(이 저장소는 설정하지 않음). 앱 포트를 직접 열면 평문 | `PUBLISH_HOST=127.0.0.1`, 프록시에서 HSTS 추가 |
| 컨테이너 | Nginx 마스터 프로세스는 루트(포트 80 바인딩), 이미지는 distroless가 아님 | `nginx-unprivileged`/distroless 검토 |
| 배포 접속 | 배포 계정이 루트일 수 있고(SSH 키 인증 권장), 첫 접속 시 호스트 키 확인을 건너뛰면 중간자 공격에 취약 | 일반 사용자 + sudo, SSH 호스트 키 사전 등록 |
| 비밀값 보관 | 서버 `.env`가 유일한 원본(백업·교체 자동화 없음), JWT 비밀값 교체 시 모든 토큰 무효 | 비밀 관리 도구, 정기 교체 절차 |
| 감사·모니터링 | 보안 이벤트 감사 로그, 알림, WAF 없음 | 후속 운영 과제 |
| 검증 범위 | 모의 침투 테스트·SAST·DAST 미실시 | 공개 서비스로 키우기 전에 수행 |
