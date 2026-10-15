#!/usr/bin/env bash
# 보안 점검을 한 번에 반복 실행한다. 사용: scripts/security-scan.sh [--skip-build]
#  1) npm audit            : 프론트엔드 의존성 취약점 (high 이상)
#  2) Trivy 이미지 스캔    : 백엔드 jar 의존성 + OS 패키지, 프론트 Nginx 이미지 (HIGH/CRITICAL, 수정 버전이 있는 것만)
#  3) Trivy 시크릿 스캔    : 저장소 파일에 비밀값이 들어갔는지 (node_modules 등 제외)
#  4) 백엔드 보안 테스트   : SecurityHardeningTest, CorsTest
# 필요: Docker (Trivy는 aquasec/trivy 컨테이너로 실행하며 로컬 설치가 필요 없다)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
TRIVY="aquasec/trivy:latest"
SKIP_BUILD=0
[ "${1:-}" = "--skip-build" ] && SKIP_BUILD=1
FAIL=0

trivy() {
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache "$TRIVY" "$@"
}

echo "== 1) npm audit (frontend, high 이상)"
(cd "$ROOT/frontend" && npm audit --audit-level=high) || FAIL=1

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "== 이미지 빌드 (스캔용 태그)"
  docker build -q -t marketplace-backend:scan "$ROOT/backend" >/dev/null
  docker build -q -t marketplace-frontend:scan "$ROOT/frontend" >/dev/null
fi

for img in marketplace-backend:scan marketplace-frontend:scan; do
  echo "== 2) Trivy 이미지 스캔: $img"
  trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 --quiet "$img" || FAIL=1
done

echo "== 3) Trivy 시크릿 스캔 (저장소 파일)"
docker run --rm -v "$ROOT":/repo:ro -v trivy-cache:/root/.cache "$TRIVY" fs \
  --scanners secret --skip-dirs node_modules,build,.gradle,.git --exit-code 1 --quiet /repo || FAIL=1

echo "== 4) 백엔드 보안 테스트"
(cd "$ROOT/backend" && ./gradlew test --tests '*SecurityHardeningTest' --tests '*CorsTest' --no-daemon -q) || FAIL=1

if [ "$FAIL" -eq 0 ]; then echo "모든 보안 점검 통과"; else echo "실패한 점검이 있습니다 (위 출력 참고)"; exit 1; fi
