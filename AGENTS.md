# 프로젝트 지침 (second-hand-marketplace)

문서: `docs/01-PRD.md`, `docs/02-SPEC.md`, `docs/03-PLAN.md`, 단계별 기록은 `docs/devlog/`.
개발 방식: Outside-in TDD — 기능마다 Playwright E2E를 **먼저** 작성해 Red를 확인한 뒤 구현한다. 슬라이스가 끝나면 devlog를 남긴다.

## 포트 (이 프로젝트 전용)
| 대상 | 포트 |
|---|---|
| Frontend (Vite) | 25800 |
| Backend (Spring Boot) | 25801 |
| E2E DB (postgres-e2e) | 25802 |
| 개발 DB (postgres) | 25803 |

위 전용 포트만 사용한다. 5432 등 흔히 쓰이는 기본 포트는 충돌을 피하려고 사용하지 않는다.

## 서버 시작/종료 — 반드시 지킬 것 (정확히 우리 서버만 다루기)
- **금지**: `pkill`, `killall`, `kill -9 $(...)` 등 이름/패턴 기반 종료 (`pkill -f vite|gradle|java|node` 포함), `docker stop $(docker ps -q)`, `docker rm -f` 전체, `docker compose down -v` 외 프로젝트 지정 없는 도커 정리, `docker system prune`.
- 종료는 아래만 사용한다.
  - 프로세스: `scripts/stop-servers.sh` (포트 25800/25801 LISTEN 프로세스 중 **cwd가 이 프로젝트 하위인 것만** 종료). 먼저 `--dry-run`으로 대상 확인 가능.
  - DB: `scripts/stop-servers.sh --with-db` 또는 이 디렉터리에서 `docker compose stop postgres postgres-e2e` (서비스 이름을 명시한다).
  - Claude Code 백그라운드로 띄운 서버는 `TaskStop <task id>`로 끈다.
- 종료/재시작 전에 `lsof -iTCP:<port> -sTCP:LISTEN`으로 해당 포트 프로세스가 우리 것인지 확인한다. 모르는 프로세스가 우리 포트를 점유하면 죽이지 말고 사용자에게 보고한다.
- 시작: `docker compose up -d postgres` → `cd backend && ./gradlew bootRun` → `cd frontend && npm run dev`.
- E2E: `docker compose up -d postgres-e2e` 후 `cd frontend && npm run e2e` (Playwright가 서버를 자동 기동, 이미 떠 있으면 재사용). 개발 서버가 떠 있으면 E2E가 개발 DB에 데이터를 쓸 수 있으니 E2E 전에 개발 서버를 끈다.

## 문서 동기화 (항상 최신으로 유지)
- 동작·API·화면·포트·스크립트·테스트 구성을 바꾸면 **같은 작업 안에서** 관련 문서를 함께 고친다: `docs/02-SPEC.md`(명세·결정 로그·알려진 한계·테스트 수), 필요 시 `docs/01-PRD.md`(범위·현황), `docs/03-PLAN.md`(진행 결과), `README.md`, `screenshots/README.md`.
- 작업 단위가 끝나면 `docs/devlog/`에 기록(`NN-이름.md`)하고 `docs/devlog/README.md` 표에 추가한다.
- 끝내기 전 점검: 오래된 포트/경로/개수가 남지 않았는지 `grep`으로 확인하고, 문서 내 상대 링크가 유효한지 확인한다.
- `.gitignore`는 루트(템플릿 + 프로젝트 전용 섹션)와 `backend/`, `frontend/` 각각에 있다. 새 산출물 유형이 생기면 갱신한다.

## 지침 기록 방식
- 이 프로젝트의 규칙·선호·결정은 **이 `CLAUDE.md`(프로젝트 지침 파일)에만** 기록한다. Claude의 메모리(memory) 기능은 사용하지 않는다. 메모리 파일을 만들거나 수정하지 않는다.
- 문서·코드·주석·스크립트 출력·커밋 메시지에 이 프로젝트와 무관한 프로젝트나 컨테이너의 이름을 쓰지 않는다.
- 새로 정해진 지침이 생기면 이 파일에 추가하고, 기술적 결정은 `docs/02-SPEC.md` 결정 로그와 `docs/devlog/`에 남긴다.
