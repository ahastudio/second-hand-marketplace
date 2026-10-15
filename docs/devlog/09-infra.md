# 09. 서버 배포 인프라

- 날짜: 2026-10-15
- 범위: Java/Node LTS 고정, 컨테이너 이미지, Compose 파일 구성, Ansible 기반 수동 배포

## 결정

- **런타임 버전 고정**: SDKMAN! Temurin `25.0.4-tem`(`backend/.sdkmanrc`), Gradle toolchain Java 25, Node 24.21.0(`frontend/.nvmrc`). 로컬·컨테이너 버전을 맞춰 "내 PC에서만 되는" 문제를 없앤다.
- **이미지**: 백엔드는 JDK 빌드 → JRE 실행의 멀티스테이지, 프론트는 Node 빌드 → Nginx 정적 서비스. 프론트 Nginx가 `/api/`를 백엔드로 프록시한다.
- **배포**: Ansible이 로컬에서 `linux/amd64` 이미지를 빌드해 서버로 전송하고 Docker Compose로 실행한다. 이미 Docker·Compose가 있는 서버에서는 설치를 건너뛴다.
- **Compose 파일명**: 개발·E2E 테스트용 루트와 운영용 `infra/` 모두 Compose 기본 파일명 `compose.yaml`을 써서 `docker compose` 명령에 `-f`를 줄 필요가 없다.
- **공개 범위**: 프론트 25800, 백엔드 25801만 공개하고 DB 포트는 열지 않는다. Compose가 만드는 전용 네트워크 안에서만 서비스끼리 통신한다.
- **비밀값**: 저장소에는 환경변수 참조만 둔다. 실제 값(DB 비밀번호, JWT 비밀값)은 배포를 실행하는 셸 환경변수로 넘기고, 약하거나 없으면 플레이북이 로그를 숨긴 채 중단한다. 서버의 `.env`(0600)가 유일한 원본이므로 재배포 때는 그 값을 그대로 쓴다.
- **서버 주소·도메인**: Git이 무시하는 `inventory.ini`에만 둔다.
- **API 주소**: 프론트가 빌드 시 `VITE_API_BASE_URL`을 주입받아 API 도메인을 직접 호출하고, 백엔드는 `APP_CORS_ALLOWED_ORIGINS`의 출처만 CORS로 허용한다. `CorsTest`와 `api.test.ts`를 먼저 작성한 뒤 구현했다.
- **범위 밖**: TLS/도메인 연결(별도 리버스 프록시), CI/CD, 백업·롤백 자동화.

## 검증

- Java 25 `compileJava`, 백엔드·프론트 `docker build`, 운영 Compose `config --quiet`, `npm audit` 0건.
- Trivy 이미지 스캔(HIGH/CRITICAL, 수정 버전이 있는 항목): 프론트 Nginx(Alpine) 44건, 백엔드 jar 13건(Tomcat 치명적 3건, Jackson 높음 10건)이 나와 `apk upgrade`와 Tomcat 11.0.25·Jackson 2.21.7/3.1.7 상향으로 해결했다. 재스캔 0건. Spring Boot가 해당 패치를 반영하면 상향 설정은 제거한다.
- 배포 후 서버에서 확인: 세 컨테이너 실행, 허용 출처 preflight 200 / 다른 출처 403, 목록 API 200, 프론트 200, 프론트 번들에 API 주소 포함, DB 포트 미게시.
