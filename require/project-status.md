# Moodie 프로젝트 현황

## 백엔드
- Node.js + Express (port 3000)
- JWT 인증, bcrypt 비밀번호 암호화
- API: `/auth`(로그인·회원가입·프로필·비밀번호변경·계정삭제), `/movies`, `/ratings`, `/recommendations`, `/mood-recommendations`, `/chatbot`
- 영화 데이터: OMDb·KOBIS 연동, 서버 기동 시 DB 동기화
- 규칙 기반 추천, GPT는 1줄 추천 이유용

## 프론트엔드
- React 19 + TypeScript + Vite (port 5173)
- Tailwind CSS
- 페이지: Home, Login(회원가입 포함), My Page, Admin
- 기능: 영화 목록·검색·상세·평점, 챗봇, 기분 추천 위젯, 프로필 수정, 비밀번호 변경, 내 평점, 계정 삭제
- UI/에러 메시지: 영어 통일

## DB
- SQLite (moodie.db), better-sqlite3
- 테이블: users, movies, rating, genres, movie_genres, recommendation_cache
- users: email(로그인 ID), password, nickname, phone, role, status, terms_privacy_agreed_at
- 이메일 변경 기능 없음 (의도적)

## 기타
- run-backend.bat / run-frontend.bat 로 실행
- .env: PORT, JWT_SECRET 등
- 비밀번호 찾기(이메일 재설정): 보류

## 앞으로 계획
- 비밀번호 찾기(재설정) 기능 추가 (이메일 발송 연동 시)
- 마이페이지: 내 추천 영화 목록, 간단 통계(평점 개수 등) 검토
- (선택) TMDB로 영화 데이터 소스 전환
