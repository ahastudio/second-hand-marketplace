# 서버 배포

Ansible로 Ubuntu/Debian 서버에 프론트엔드, 백엔드, PostgreSQL을 배포한다. 배포 명령은 로컬에서 Docker 이미지를 빌드한 뒤 서버로 전달하고 Docker Compose로 실행한다.

## 요구 사항

- 로컬: Docker Engine/Desktop, Ansible 2.15 이상, SSH 접속
- 서버: Ubuntu/Debian, SSH와 sudo 권한이 있는 사용자
- 방화벽: TCP 25800(프론트), 25801(백엔드) 허용. PostgreSQL 포트는 열지 않는다.

플레이북은 서버에서 `docker compose version`이 실패할 때만 `docker.io`와 `docker-compose-v2`를 apt로 설치하고 Docker 서비스를 활성화한다. 이미 Docker와 Compose가 있으면 건드리지 않는다. 기본 이미지 아키텍처는 `linux/amd64`이며, 다른 아키텍처 서버는 `vars.yml`의 `image_platform`을 변경한다.

## 설정

```bash
cd infra
cp inventory.ini.example inventory.ini
```

`inventory.ini`는 저장소에 없으므로 위 명령으로 직접 만든다(Git이 무시하는 파일이다). 서버 IP 또는 호스트명과 SSH 사용자를 설정한다. `vars.yml`은 커밋 가능한 운영 설정이며, DB/JWT 비밀값은 실행하는 로컬 셸의 환경변수에서 읽는다. 각각 최소 32바이트의 암호학적 난수로 설정한다.

```bash
export MARKETPLACE_DB_PASSWORD="$(openssl rand -hex 32)"
export MARKETPLACE_APP_JWT_SECRET="$(openssl rand -hex 32)"
ansible-playbook -i inventory.ini deploy.yml --ask-become-pass
```

비밀값을 저장소, inventory, 명령행 인자, 로그에 기록하지 않는다. 플레이북은 두 값이 64자 미만이면 로그를 숨긴 채 배포를 중단한다. 서버의 `.env`는 로컬에 만들지 않고 플레이북이 `.env.j2`로 서버에 렌더링한다. 이 파일은 권한 `0600`으로 만들고, `.gitignore`는 이를 포함한 로컬 비밀 파일과 실제 inventory를 제외한다.

## 배포

```bash
ansible-playbook -i inventory.ini deploy.yml --ask-become-pass
```

플레이북은 로컬에서 Java 25(Temurin)/Node 24 기반 이미지를 빌드하고, 이미지를 서버로 복사한다. 서버에는 Compose 파일과 권한 `0600`의 `.env`를 설치한 다음 설정을 검증하고 서비스를 시작한다. 앱 포트는 프론트 `25800`, 백엔드 `25801`이다. 프론트 Nginx가 `/api/`를 백엔드로 전달하며, 백엔드 주소로 직접 API 요청도 가능하다. DB는 외부 포트를 게시하지 않는다.

## 서버에 만들어지는 것

| 경로/리소스 | 설명 |
| --- | --- |
| `/opt/second-hand-marketplace/compose.yaml` | `infra/compose.yaml` 복사본 |
| `/opt/second-hand-marketplace/.env` | `.env.j2`로 렌더링한 비밀 파일(0600): DB 이름·계정·비밀번호, JWT 비밀값, 허용 CORS 출처, 프론트 CSP용 `API_ORIGIN`, 게시 주소 `PUBLISH_HOST` |
| `second-hand-marketplace_default` | Compose가 프로젝트 이름으로 자동 생성하는 전용 네트워크(postgres·backend·frontend) |
| `second-hand-marketplace_postgres-data` | DB 데이터 볼륨 |

비밀값은 로컬 셸 환경변수로만 전달되므로 저장소와 로컬 디스크에는 `.env.j2`(템플릿)만 있고, 플레이북은 로컬에 `.env`를 만들지 않는다. 확인 방법: `ssh <사용자>@<서버> 'cat /opt/second-hand-marketplace/.env'`.

- **서버의 `.env`가 비밀번호의 유일한 원본이다.** 서버를 지우거나 이 파일을 잃으면 복구할 수 없으니 비밀번호 관리자 등 안전한 곳에 따로 보관한다.
- 이후 배포에서는 새 값을 만들지 말고 서버의 `.env`에 있는 같은 값을 `MARKETPLACE_DB_PASSWORD`, `MARKETPLACE_APP_JWT_SECRET`으로 export한다. DB 볼륨은 처음 만든 비밀번호를 유지하므로 값이 바뀌면 백엔드가 DB에 접속하지 못한다.
- JWT 비밀값을 바꾸면 기존 로그인 토큰이 모두 무효가 된다.
- DB 컨테이너는 호스트 포트를 게시하지 않아 외부에서 이 비밀번호로 직접 접속할 수 없다.

## API 주소와 CORS

프론트 이미지는 빌드 시 `VITE_API_BASE_URL`(`api_base_url`)을 주입받고, 백엔드는 `cors_allowed_origins`의 출처만 허용한다. 두 값은 `inventory.ini`의 호스트 변수 `marketplace_api_base_url`, `marketplace_web_origin`으로 지정한다(예시는 `inventory.ini.example`, 미지정 시 `example.com` 자리표시자). 도메인 연결(TLS 포함)은 별도 리버스 프록시에서 한다.

## 컨테이너 보안 설정

`compose.yaml`은 다음을 적용한다. 전체 설계와 점검 방법은 [docs/04-SECURITY.md](../docs/04-SECURITY.md).

- 백엔드: 비루트 실행, `read_only`(쓰기는 `/tmp` tmpfs만), `cap_drop: ALL`, `no-new-privileges`. 설정은 `application.yml` 하나이며 값은 모두 환경변수로 받고, `APP_JWT_SECRET`이 없거나 32바이트 미만이면 기동에 실패한다.
- 프론트(Nginx): `read_only`, `cap_drop: ALL` 후 기동에 필요한 `CHOWN`·`SETGID`·`SETUID`·`NET_BIND_SERVICE`만 추가, CSP 등 보안 헤더(`frontend/nginx.conf.template`, 기동 시 `API_ORIGIN` 치환).
- DB: `no-new-privileges`, 호스트 포트 미게시.
- 게시 주소: 기본은 모든 인터페이스(`0.0.0.0`). 같은 호스트의 리버스 프록시만 쓴다면 `inventory.ini`의 호스트 변수 `marketplace_publish_host=127.0.0.1`로 좁히는 것을 권장한다. 다른 컨테이너의 프록시가 호스트 포트로 접근하는 구성이라면 먼저 접근 경로를 확인한다.

배포 전후로 `scripts/security-scan.sh`(이미지·의존성·시크릿 스캔, 보안 테스트)를 실행한다.

## 보안 및 운영 한계

- 실제 서버 주소·SSH 사용자 설정은 Git에서 제외되는 `inventory.ini`에만 둔다.
- 추적되는 `vars.yml`에는 안전한 기본 운영값과 비밀 환경변수 lookup만 있으며 비밀값 자체는 없다.
- DB/JWT 비밀값은 배포를 실행하는 셸 환경에만 두고 `.env`는 서버에서 mode `0600`으로 생성한다. 로컬 디스크에는 저장하지 않으며, 서버의 `.env`가 유일한 원본이므로 별도로 안전하게 백업한다.
- 개인 키 파일, `.env`, 이미지 아카이브는 저장소에 추가하지 않는다.
- 배포 계정은 SSH 키 인증의 일반 사용자 + sudo를 권장한다. 호스트 키 확인을 끄고(`ANSIBLE_HOST_KEY_CHECKING=False`) 접속하는 것은 첫 접속에서만 쓰고, 이후에는 호스트 키를 등록해 둔다.
- 이 구성은 TLS/도메인/인증서 자동화를 제공하지 않는다. 공개 인터넷에서 운영하려면 HTTPS 리버스 프록시와 방화벽 제한을 별도로 구성한다.
- 자동 CI/CD, 백업 정책, 자동 롤백은 포함하지 않는다. PostgreSQL 데이터는 Docker named volume에 보존된다.
- 배포 전 대상 서버의 25800/25801 포트 점유 및 방화벽을 확인한다.
