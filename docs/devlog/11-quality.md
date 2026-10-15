# 11. 품질 강화와 전체 검증

- 날짜: 2026-10-15
- 범위: 백엔드 Checkstyle, 백엔드·프론트엔드 커버리지 100% 강제, 이름·추출 중심 리팩터링, 전체 검증을 한 번에 돌리는 `/check` 스킬
- 규칙과 명령은 [SPEC §7](../02-SPEC.md) 참고

## 진행 방식

1. **측정 먼저**: JaCoCo(백엔드), Vitest 커버리지(프론트엔드)로 현재 수준을 쟀다. 백엔드 라인 97%·분기 75%, 프론트 문장 94.7%·분기 87%였다.
2. **Checkstyle 규칙**: 기존 코드 스타일(탭, 120자, Spring 스타일)을 그대로 규칙으로 고정했다. 와일드카드 import, 한 줄 getter, `else`·`catch` 위치 등을 고쳐 위반 0으로 만들었다.
3. **리팩터링과 테스트를 함께**: 기존 테스트(JUnit 37, Vitest 26, E2E 테스트 26)를 안전망으로 두고 구조를 바꾸고, 새로 생긴 작은 단위마다 테스트를 더해 100%에 맞췄다.
4. **임계값으로 고정**: 커버리지 100%와 Checkstyle 0을 빌드(`./gradlew check`, `npm run test:coverage`)가 강제한다.

## 리팩터링 원칙

- 주석 대신 이름으로 의도를 드러낸다.
- 긴 메서드는 의도가 보이는 이름의 작은 메서드로 추출한다.
- 같은 모양이 반복되면 훅·컴포넌트·값 객체로 뽑는다.

대표 예시:

| 전 | 후 |
| --- | --- |
| `AuthService.login` 한 메서드 | `authenticate`, `matchesStoredOrUnknownEmailHash`, `upgradePasswordHashIfOutdated`로 분해 |
| `ProductService`의 검색어 가공 | 값 객체 `SearchKeyword`(`toContainsLikePattern`) |
| 세 화면의 중복된 조회·취소 처리 | 훅 `useApiResource` |
| 거대한 홈·상세 화면 | `SearchBar`, `ProductCard`, `SellerControls`, `ErrorAlert`, `FormField` 등 컴포넌트 |
| `auth.tsx`(컴포넌트와 훅 혼재, lint 경고) | `authContext.ts` + `AuthProvider.tsx` |

## 전체 검증 스킬 (`/check`)

품질 점검(`scripts/check-quality.sh`)과 보안 점검(`scripts/security-scan.sh`)은 따로 있어서, 전체를 확인하려면 순서와 주의점을 기억해야 했다. 저장소의 `/check` 스킬이 이를 한 절차로 묶는다.

- 수행: Markdown lint → 백엔드·프론트엔드 테스트와 정적 분석(커버리지 100% 포함) → 프론트엔드 프로덕션 빌드 → Playwright E2E 테스트 → 의존성·이미지·시크릿 보안 스캔.
- 안전 규칙: E2E 테스트는 전용 DB(`postgres-e2e`)만 사용하고, 개발 서버가 떠 있으면 이 프로젝트의 서버만 안전하게 종료한 뒤 실행한다. 포트를 모르는 프로세스가 점유하고 있으면 종료하지 않고 충돌을 보고하며 E2E 테스트를 막힌 항목으로 표시한다. 보안 스캔이 만드는 Docker 이미지·캐시 부작용도 명시했다.
- 사용: 전체 검증이 필요할 때 `/check`를 실행한다.

## 배운 것

- **리팩터링은 보안 동작을 조용히 지울 수 있다**: `authenticate`를 정리하다가 `user.isEmpty() || !matches(...)`의 단락 평가 때문에 "없는 이메일도 해시를 검증한다"는 타이밍 보호가 사라졌다. 코드 리뷰에서 발견했고, 호출 여부를 확인하는 `AuthServiceTest`로 다시는 빠지지 않게 했다. 보안 동작은 눈이 아니라 테스트로 지킨다.
- **`main`도 커버할 수 있다**: 제외하지 않고 Testcontainers DB와 임의 포트로 `BackendApplication.main`을 실행하는 테스트를 만들었다(비웹 모드는 Spring Security 설정이 만들어지지 않아 쓸 수 없었다).

## 검증

- 백엔드 `./gradlew check`: Checkstyle 위반 0, JUnit 72개, 명령어·분기·라인·메서드 100%.
- 프론트엔드: `tsc -b`·Oxlint 오류 0, Vitest 40개, 문장·분기·함수·라인 100%.
- E2E 테스트 26개, 프론트 프로덕션 빌드, 보안 스캔 통과(`/check`가 이 전체를 한 번에 확인한다).

## 남은 것

- 프론트 `main.tsx`(React 마운트 진입점)는 커버리지 대상에서 제외했다. E2E 테스트가 간접적으로 실행한다.
- 프론트엔드에는 포매터(Prettier 등)를 두지 않았고 Oxlint와 타입 검사만 쓴다.
