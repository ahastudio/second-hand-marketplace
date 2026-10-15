#!/usr/bin/env bash
# 코드 품질 점검을 한 번에 실행한다. 사용: scripts/check-quality.sh
#  백엔드: Checkstyle + JUnit + JaCoCo(라인·분기·메서드·명령어 100% 검증)   -> ./gradlew check
#  프론트: 타입 검사 + Oxlint + Vitest(문장·분기·함수·라인 100% 검증)
# E2E 테스트(Playwright)는 DB가 필요하므로 포함하지 않는다: docker compose up -d postgres-e2e 후 cd frontend && npm run e2e
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"

echo "== 백엔드: Checkstyle + 테스트 + 커버리지 100% 검증"
(cd "$ROOT/backend" && ./gradlew check --no-daemon -q)

echo "== 프론트엔드: 타입 검사"
(cd "$ROOT/frontend" && npx tsc -b)

echo "== 프론트엔드: Oxlint"
(cd "$ROOT/frontend" && npm run lint --silent)

echo "== 프론트엔드: 테스트 + 커버리지 100% 검증"
(cd "$ROOT/frontend" && npm run test:coverage --silent)

echo "모든 품질 점검 통과"
