# Moodie Frontend

React + TypeScript + Vite 기반 영화 추천 웹 애플리케이션 프론트엔드

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (포트 5173)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 환경 설정

백엔드 서버가 `http://localhost:3000`에서 실행 중이어야 합니다.

프론트엔드는 `http://localhost:5173`에서 실행됩니다.

## 주요 기능

- 영화 목록 조회 (박스오피스 Top 10)
- 영화 상세 정보 조회
- 회원가입/로그인
- 평점 등록/조회
- 맞춤 추천 영화 (로그인 시)
- 어드민 페이지 (UI만, 기능은 백엔드 연결 필요)

## 기술 스택

- React 19
- TypeScript
- Vite
- Tailwind CSS
