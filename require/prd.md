# Moodie 프로젝트 PRD (완전판)

## 프로젝트 개요
Node.js + Express + SQLite 기반 영화 추천 서버

- 인증: 회원가입 / 로그인 / JWT
- 영화: CRUD 및 상세 조회
- 평점: 영화별 평점, 한 유저 1회
- 추천: 유저 평점 기반 추천 + GPT 추천 이유
- 영화 데이터: TMDB 또는 KOBIS API 활용, 1회만 서버 시작 시 가져오기
- 환경변수: JWT_SECRET, OPENAI_API_KEY

## 기본 환경
- Node.js + Express
- SQLite (better-sqlite3)
- dotenv
- CORS
- JSON body parsing
- 기본 폴더 구조:
  - server.js
  - db.js
  - routes/
  - controllers/
  - middleware/

## DB 테이블

### 1. users
- user_id BIGINT PK
- email VARCHAR(100) NOT NULL UK
- password VARCHAR(255) NOT NULL
- nickname VARCHAR(50) NULL
- phone VARCHAR(20) NULL
- role VARCHAR(20) NOT NULL
- status VARCHAR(20) NOT NULL
- created_at DATETIME NOT NULL
- updated_at DATETIME NULL

### 2. movies
- movie_id BIGINT PK
- title VARCHAR(255) NOT NULL
- title_en VARCHAR(255) NULL
- synopsis TEXT NULL
- release_date DATE NULL
- runtime INT NULL
- type_nm VARCHAR(50) NULL
- poster_url VARCHAR(255) NULL
- rank INT NULL
- created_at DATETIME NOT NULL
- updated_at DATETIME NULL

### 3. rating
- rating_id BIGINT PK
- user_id BIGINT NOT NULL FK → users.user_id
- movie_id BIGINT NOT NULL FK → movies.movie_id
- rating INT NOT NULL
- created_at DATETIME NOT NULL
- updated_at DATETIME NULL
- UNIQUE(user_id, movie_id)

### 4. genres
- genre_id BIGINT PK
- name VARCHAR(50) NOT NULL
- description TEXT NULL
- created_at DATETIME NOT NULL
- updated_at DATETIME NULL

### 5. movie_genres
- movie_id BIGINT NOT NULL FK → movies.movie_id
- genre_id BIGINT NOT NULL FK → genres.genre_id
- PRIMARY KEY(movie_id, genre_id)

---

## 인증 API

### POST /auth/signup
- body: { email, password, nickname, phone }
- 이메일 형식 검증: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- 비밀번호 정책: 최소 8자, 특수문자 1개 이상 포함
- bcryptjs로 비밀번호 해시 저장
- JWT 발급 (7일 만료)
- 중복 이메일 시 409 반환
- 응답: { user_id, token }

### POST /auth/login
- body: { email, password }
- bcryptjs로 비밀번호 검증
- JWT 발급 (Bearer 방식, 7일 만료)
- status !== 'approved' 시 403 반환
- 응답: { token }

### GET /auth/me
- JWT 인증 필요
- 현재 로그인 사용자 정보 반환

---

## 영화 API

### GET /movies?page=1&limit=20
- 페이지네이션 지원
- 영화 목록 반환

### GET /movies/:id
- 영화 상세 정보 반환
- 포함 필드: movie_id, title, title_en, synopsis, release_date, runtime, type_nm, poster_url, rank

### 영화 데이터 초기화
- 서버 시작 시 1회만 TMDB/KOBIS API 호출
- 필수: movie_id, title, release_date
- 선택: title_en, synopsis, runtime, type_nm, poster_url, rank
- 이미 DB에 데이터 존재 시 재호출 금지

---

## 평점 API

### POST /ratings
- JWT 인증 필요
- body: { movie_id, rating }
- 한 유저 한 영화 1회
- 중복 시 update

### GET /ratings/:movie_id
- 영화별 평균 평점 + 로그인 유저 평점(있으면) 반환

### DELETE /ratings/:movie_id
- JWT 인증 필요
- 로그인 유저 평점 삭제 가능

---

## 추천 API

### GET /recommendations
- JWT 인증 필요
- 추천 로직:
  1. 로그인 유저가 4~5점 준 영화 장르 수집
  2. 해당 장르에서 로그인 유저가 평가하지 않은 영화 선택
  3. 최신 개봉순 정렬
  4. 상위 5개 영화 반환

### GPT 추천 이유
- OPENAI_API_KEY 사용
- 추천 이유: "이 사용자가 높은 평점을 준 [장르 리스트] 영화들을 기반으로, [추천 영화 제목]을 좋아할 수 있는 이유를 한 문장으로 작성"
- 추천 결과 DB 캐싱, 이미 존재하면 GPT 호출 최소화
- 응답 예시:
```json
[
  {
    "movie": { ... },
    "reason": "높은 평점 유사 장르 기반 추천"
  }
]