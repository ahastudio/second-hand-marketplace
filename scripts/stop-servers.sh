#!/usr/bin/env bash
# 이 프로젝트의 서버만 정확히 종료한다. (포트 + 작업 디렉터리로 대상을 한정해, 의도하지 않은 프로세스/컨테이너는 건드리지 않음)
#  - 포트 25800(FE), 25801(BE)의 LISTEN 프로세스 중 "작업 디렉터리가 이 프로젝트 하위"인 것만 종료
#  - DB는 이 디렉터리의 docker compose 프로젝트(postgres, postgres-e2e)만 stop
# 사용: scripts/stop-servers.sh [--dry-run] [--with-db]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
PORTS=(25800 25801)
DRY=0; WITH_DB=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --with-db) WITH_DB=1 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done

for port in "${PORTS[@]}"; do
  for pid in $(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true); do
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1)"
    case "$cwd" in
      "$ROOT"|"$ROOT"/*)
        echo "port $port: pid $pid (cwd=$cwd) -> 종료 대상"
        [ "$DRY" = 1 ] || kill "$pid" ;;
      *) echo "port $port: pid $pid (cwd=$cwd) -> 작업 디렉터리가 이 프로젝트 밖이므로 건너뜀" ;;
    esac
  done
done

if [ "$WITH_DB" = 1 ]; then
  echo "docker compose(이 프로젝트) postgres, postgres-e2e stop"
  [ "$DRY" = 1 ] || (cd "$ROOT" && docker compose stop postgres postgres-e2e)
fi
