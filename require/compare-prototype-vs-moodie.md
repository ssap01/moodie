# 프로젝트 비교: prototype vs moodie

- **prototype:** `c:\Users\pc07-00\Downloads\prototype`
- **moodie:** 현재 워크스페이스 (`c:\Users\pc07-00\Downloads\moodie`)
- **project_260219_이명욱:** 지정 경로에서 폴더/파일 접근 불가(한글 경로 또는 미추출 가능성). 추후 해당 폴더를 워크스페이스에 포함시키면 비교 가능.

---

## 1. prototype

### 구성
- **스택:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4
- **역할:** BFF(Backend For Frontend) — 프론트와 외부 API 사이에서 API 라우트로 처리
- **DB:** 없음. 실시간 API 중심(나중에 PostgreSQL 전환 고려)
- **데이터 소스:** KOBIS Open API (박스오피스, 영화 검색)
- **캐시:** 메모리 캐시(예: 30분 TTL)로 KOBIS 호출 최소화

### 디렉터리 구조
- `app/` — 페이지 및 API 라우트
  - `(public)/` — login, signup, movies/[movieCd], page(메인)
  - `(admin)/admin/` — 관리자 대시보드
  - `api/` — boxoffice, search, recommend, auth/login|signup|me|logout, admin/stats, movies/[movieCd]
- `components/layout/` — Header, Footer
- `lib/` — repo(liveKobisRepo, movieRepo), cache, http, types
- `scripts/` — dev-with-open.js (개발 서버 + 브라우저 오픈)
- 문서: PRD_PROTOTYPE_V1.md, DESIGN_SPEC.md, API_GUIDE_PRD_ALIGNED_V1.md

### 장점
- **단일 프로젝트:** 프론트+API가 한 Repo, 배포/개발 흐름 단순
- **명시적 디자인 스펙:** DESIGN_SPEC에 브레이크포인트, 타이포, 색상, 컨테이너 규칙 정리 → UI 일관성 확보
- **BFF + Repository 패턴:** API 라우트 ↔ Repository 분리로 KOBIS 교체/테스트 용이
- **실시간 박스오피스:** DB 없이 KOBIS + 캐시로 “오늘/어제” 박스오피스 제공
- **PRD/API 가이드 정리:** 요구사항·API 정렬 문서 있음

### 단점
- **인증/추천 미구현:** login/signup/recommend 등이 TODO 또는 스텁
- **DB 없음:** 사용자·평점·추천 저장 불가, 운영 전환 시 작업 필요
- **Admin:** 페이지만 있고 실제 기능 없음

---

## 2. moodie (현재 워크스페이스)

### 구성
- **스택:** 백엔드 Express + SQLite(better-sqlite3), 프론트 React 19 + Vite + TypeScript + Tailwind
- **역할:** 백엔드 서버(포트 3000) + 프론트(포트 5173) 분리
- **DB:** SQLite — users, movies, rating, genres, movie_genres, recommendation_cache
- **데이터 소스:** OMDb (현재 KOBIS는 사용하지 않음), 서버 기동 시 영화 동기화

### 디렉터리 구조
- **백엔드:** server.js, db.js, routes(auth, movies, ratings, recommendations, chatbot, moodRecommendations), controllers, services, middleware
- **프론트:** frontend/ — Vite, src/pages(Home, Login, MyPage, Admin, MovieDetail), components(ChatBot, MovieModal, MoodRecommendWidget 등), services/api
- 문서: require/project-status.md, chatbot-faq-list.md

### 장점
- **전체 플로우 구현:** 회원가입/로그인(JWT), 프로필·비밀번호 변경·계정 삭제, 평점 CRUD, 맞춤 추천, 기분 기반 추천, 챗봇(규칙+FAQ)
- **에러 메시지 영어 통일:** API·프론트 에러 문구 일관됨
- **챗봇:** 규칙 기반 + 감정 추천 + FAQ(비밀번호, 이메일 변경, 계정 삭제 등)
- **Contact/복사:** 클립보드 API + execCommand 폴백
- **문서화:** 프로젝트 현황·챗봇 FAQ 목록 정리

### 단점
- **프론트/백 분리:** 두 서버 실행 필요, CORS·프록시 설정 필요
- **디자인 스펙 문서 없음:** prototype처럼 단일 DESIGN_SPEC 없음
- **영화 데이터:** OMDb 단일 사용(향후 TMDB 등으로 전환 시 이전 작업 필요)

---

## 3. 비교 요약

| 항목 | prototype | moodie |
|------|-----------|--------|
| 프레임워크 | Next.js (풀스택) | Express + Vite (분리) |
| DB | 없음 | SQLite |
| 인증 | 스텁 | JWT·회원가입·프로필·비밀번호·계정삭제 구현 |
| 영화 데이터 | KOBIS 실시간 | OMDb, DB 동기화 |
| 추천 | API 스텁 | 규칙 기반 + 기분 기반 + 챗봇 |
| 디자인 스펙 | DESIGN_SPEC 명시 | 없음 |
| 문서 | PRD, API 가이드 | project-status, chatbot FAQ |
| Admin | 페이지만 | 페이지 + (기능은 제한적) |

---

## 4. 장점 합칠 때 참고

- **prototype에서 가져올 수 있는 것**
  - **DESIGN_SPEC.md** 스타일: 브레이크포인트(mobile/tablet/desktop), 타이포, 색상/컨테이너 규칙을 moodie용으로 요약해 두면 UI 일관성에 도움.
  - **BFF + Repository 패턴:** moodie는 이미 services/로 비슷하게 분리돼 있음. KOBIS 전용 repo처럼 “데이터 소스별 모듈” 정리 시 참고.
  - **단일 앱 선호 시:** 나중에 Next.js로 묶는 선택지가 있음(현재는 Express+Vite 유지해도 무방).

- **moodie에서 유지할 것**
  - 완성된 인증·평점·추천·챗봇·에러 메시지 통일.
  - SQLite 기반으로 바로 동작하는 구조.

- **이명욱 프로젝트**
  - `project_260219_이명욱` 폴더를 워크스페이스에 포함하거나, 영문 경로로 압축 해제한 뒤 경로를 알려주면, 같은 형식으로 구조·장단점을 추가해 3자 비교와 “장점만 합치기” 정리 가능.
