# 샘플 스크린샷

현실적인 샘플 데이터(중고 물품 8개, 판매자 3명, 판매중/예약중/판매완료 혼합)로 촬영한 화면이다. 해상도는 2배(retina)이며 데스크톱은 1040px, 모바일은 390px 너비 기준이다.

| 파일 | 화면 |
| --- | --- |
| `01-home.png` | 홈 — 비로그인, 전체 목록 |
| `02-home-logged-in.png` | 홈 — 로그인 상태(헤더에 상품 등록·닉네임·로그아웃) |
| `03-search.png` | 검색 결과 ("자전거") |
| `04-search-empty.png` | 검색 결과 없음 |
| `05-detail-visitor.png` | 상품 상세 — 비로그인(수정/삭제 없음) |
| `06-detail-owner.png` | 상품 상세 — 판매자 본인(상태 변경·수정·삭제) |
| `07-detail-reserved.png` | 상품 상세 — 예약중 배지 |
| `08-login.png` | 로그인 |
| `09-signup.png` | 회원가입 |
| `10-new-product.png` | 상품 등록 폼 |
| `11-edit-product.png` | 상품 수정 폼(기존 값 채움) |
| `12-mobile-home.png` | 모바일 홈 |
| `13-mobile-detail.png` | 모바일 상세(판매자) |

## 다시 만들기

개발 DB의 테스트 데이터가 섞이지 않도록, 개발 DB 컨테이너 안에 임시 데모 DB를 만들어 그 DB에 연결한 서버로 촬영한다. 프로젝트의 서버 종료 규칙(`AGENTS.md`)에 따라 `scripts/stop-servers.sh`만 사용한다.

```bash
scripts/stop-servers.sh                                   # 기존 개발 서버 종료
docker compose exec -T postgres psql -U marketplace -d marketplace -c "CREATE DATABASE marketplace_demo"
(cd backend && SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:25803/marketplace_demo ./gradlew bootRun) &
(cd frontend && npm run dev -- --strictPort) &
node scripts/capture-screenshots.mjs                      # screenshots/*.png 덮어쓰기
scripts/stop-servers.sh                                   # 데모 서버 종료
docker compose exec -T postgres psql -U marketplace -d marketplace -c "DROP DATABASE marketplace_demo"
```

스크립트는 실행할 때마다 샘플 데이터를 새로 등록하므로, 재촬영 전에는 데모 DB를 새로 만든다(위 절차대로 매번 생성/삭제).
