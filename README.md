# 중고거래 플랫폼

Claude Code 학습을 위한 예제 프로젝트.

**데모 사이트: <https://second-hand-marketplace.codedemo.co/>**

Java / Spring Boot(Web MVC) / PostgreSQL 백엔드 + TypeScript / React / Vite / Tailwind 프론트엔드.
Outside-in TDD(Playwright E2E 테스트 먼저)로 개발했다. 문서: [PRD](docs/01-PRD.md) · [SPEC](docs/02-SPEC.md) · [PLAN](docs/03-PLAN.md) · [SECURITY](docs/04-SECURITY.md) · [devlog](docs/devlog) · [샘플 스크린샷](screenshots)

![홈](screenshots/01-home.png)

## 이 프로젝트는 어떻게 시작됐나

이 저장소는 Claude Code로 "작은 MVP를 문서 → 테스트 → 구현 순서로 만들어 가는 과정"을 보여 주는 예제다. 아래 프롬프트 하나로 시작했고, 이후 모든 결과물(PRD·SPEC·PLAN·E2E 테스트·구현·devlog)이 이 요청에서 파생됐다.

> Java, Spring Boot(Web MVC), PostgreSQL(Docker Compose로 실행), JUnit으로 아주 작은 MVP 수준의 중고거래 플랫폼 백엔드(REST API 서버)를 만들려고 해. TypeScript, React, Tailwind, Vite, Vitest, Playwright로 프론트엔드도 함께 만들고 싶어. backend, frontend라는 두 개의 폴더를 만들어서 각각 위치하게 해줘. PRD 먼저 작성하고, 스펙 문서 만들고, Outside-in TDD로 개발할 수 있는 계획 문서 작성해줘. 반드시 각 기능에 대한 E2E 테스트를 Playwright 사용하는 코드를 먼저 작성하면서 시작해야 해. 진행하면서 각 단계마다 중요한 부분을 문서로 남기면서 진행하자. 잘 모르는 게 있으면 내가 중간 중간 물어볼게

프롬프트의 요구가 결과물에 어떻게 나타났는지는 다음과 같다.

| 프롬프트의 요구 | 결과물 |
| --- | --- |
| backend / frontend 두 폴더 | [backend/](backend/), [frontend/](frontend/) |
| PRD → 스펙 → 계획 문서 순서 | [PRD](docs/01-PRD.md) → [SPEC](docs/02-SPEC.md) → [PLAN](docs/03-PLAN.md) |
| 기능마다 Playwright E2E 테스트를 먼저 작성 (Outside-in TDD) | [frontend/e2e/](frontend/e2e/) — 기능별 Red 확인 후 구현 |
| 단계마다 중요한 부분을 문서로 기록 | [docs/devlog](docs/devlog) |
| (이후 추가) 보안 검토 | [docs/04-SECURITY.md](docs/04-SECURITY.md), [devlog 10](docs/devlog/10-security.md) |
| 모르는 것은 중간에 질문 | 결정 사항은 SPEC의 결정 로그에 기록 |

## 요구 사항

- Java 25 LTS (SDKMAN!, `backend/.sdkmanrc`), Gradle Wrapper 9.8.1
- Node.js 24.21.0 LTS (`frontend/.nvmrc`), Docker (PostgreSQL, Testcontainers)
- 서버 배포: 로컬 Docker, Ansible, Ubuntu/Debian 서버의 SSH 및 sudo 권한

## 포트

| 대상 | 포트 |
| --- | --- |
| Frontend | 25800 |
| Backend | 25801 |
| E2E 테스트 DB | 25802 |
| 개발 DB | 25803 |

## 실행

```bash
docker compose up -d postgres            # 개발 DB (25803)
cd backend && sdk env install && sdk env && ./gradlew bootRun  # http://localhost:25801
cd frontend && nvm use && npm install && npm run dev           # http://localhost:25800
```

## 테스트

```bash
cd backend && ./gradlew test             # JUnit (Testcontainers, Docker 필요)
cd frontend && npm test                  # Vitest
docker compose up -d postgres-e2e        # E2E 테스트 전용 DB (25802)
cd frontend && npx playwright install chromium   # 최초 1회
cd frontend && npm run e2e               # Playwright (서버 자동 기동)
```

주의: 개발 서버가 떠 있으면 E2E 테스트가 그 서버를 재사용해 개발 DB에 데이터를 쓴다. E2E 테스트 전에 서버를 끈다.

## 서버 배포

운영 Compose(`infra/compose.yaml`)는 프론트 `25800`, 백엔드 `25801`을 서버에서 그대로 제공한다. PostgreSQL은 Compose가 만드는 전용 네트워크(`second-hand-marketplace_default`) 안에만 연결한다. 프론트는 `infra/vars.yml`의 `api_base_url`을 빌드 시 주입받아 API 도메인을 직접 호출하고, 백엔드는 `cors_allowed_origins`의 출처만 허용한다. 배포 대상 서버에는 `25800`, `25801`만 방화벽에서 허용한다.

```bash
cd infra
cp inventory.ini.example inventory.ini
# inventory.ini에 서버 주소, SSH 사용자, 도메인 변수(marketplace_api_base_url, marketplace_web_origin)를 설정
export MARKETPLACE_DB_PASSWORD="$(openssl rand -hex 32)"
export MARKETPLACE_APP_JWT_SECRET="$(openssl rand -hex 32)"
ansible-playbook -i inventory.ini deploy.yml --ask-become-pass
```

실제 서버 주소와 도메인은 Git에서 제외되는 `inventory.ini`에만 둔다. 비밀값은 로컬 환경변수로만 전달하며, 추적되는 `infra/vars.yml`에는 환경변수 참조만 있다. TLS/도메인은 이 배포 구성에 포함되지 않으므로 인터넷에 공개할 때는 별도 HTTPS 리버스 프록시를 둔다. 자세한 절차와 보안 주의는 [infra/README.md](infra/README.md)를 참고한다.

## 서버 종료 (이 프로젝트 것만)

`scripts/stop-servers.sh [--dry-run] [--with-db]` — 포트 25800/25801에서 작업 디렉터리가 이 프로젝트인 프로세스만 종료한다. `pkill` 등 패턴 기반 종료는 사용하지 않는다. 자세한 규칙은 [CLAUDE.md](CLAUDE.md).

## 기능

회원가입/로그인(JWT) · 상품 등록 · 목록/검색 · 상세 · 수정/삭제(본인) · 판매 상태 변경(판매중/예약중/판매완료)

## 테스트 현황

E2E 테스트(Playwright) 26 · Vitest 40 · JUnit 72 — 모두 통과 (2026-10-15). 백엔드(JaCoCo)와 프론트엔드(Vitest v8) 커버리지는 **100%**이며 빌드가 이를 강제한다.

```bash
scripts/check-quality.sh   # 백엔드 Checkstyle + 테스트 + 커버리지 100%, 프론트 tsc + Oxlint + 테스트 + 커버리지 100% (E2E 테스트 제외)
```

E2E 테스트 시나리오와 스펙 파일의 매핑은 [SPEC §6](docs/02-SPEC.md).

전체 검증은 저장소의 `/check` 스킬로 실행할 수 있다. Markdown lint, 코드 품질 검사, 프론트엔드 빌드, E2E 테스트, 보안 스캔을 수행한다.

## 보안

비밀번호 Argon2id, JWT(발급자 검증·32바이트 이상 비밀값), 이메일 단위 로그인 잠금, 입력 검증, CORS 허용 출처, API·프론트 보안 헤더(CSP 포함), 읽기 전용·권한 제거 컨테이너, 의존성·이미지 스캔을 적용했다. 무엇을 어떻게 찾아 고쳤는지, 점검을 반복하는 방법, 남은 위험은 [docs/04-SECURITY.md](docs/04-SECURITY.md)에 있다.

```bash
scripts/security-scan.sh   # npm audit + Trivy 이미지·시크릿 스캔 + 보안 테스트 (Docker 필요)
```

## 알려진 한계

목록 UI는 첫 20개만 표시, 토큰 갱신·서버 측 폐기 없음(로그아웃은 클라이언트에서 토큰 삭제), 이메일 인증·비밀번호 재설정 없음 등. 전체 목록은 [SPEC §9](docs/02-SPEC.md).

## 프로젝트 지침

[AGENTS.md](AGENTS.md)(`CLAUDE.md`는 심볼릭 링크)에 포트, 서버 종료 규칙, 개발 방식, 문서 동기화 규칙이 있다.
