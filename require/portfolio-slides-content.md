# Moodie 포트폴리오 – 바이브 코딩 관점 (PPT용)

> PRD·프롬프트로 AI를 지시하며 만든 과정 중심

---

## 1. Cover

**Moodie**  
AI Vibe Coding MVP 영화 추천 웹 서비스

---

## 2. Project Overview

**Approach** – 프로젝트 상태 체크 → AI와 예열(질문·훑어보기) → PRD·스펙 작성 → AI 지시 → 검토·수정 반복  
**My Role** – PRD 작성, 프롬프트 설계, 결과 검토·수정 지시, 스코프 조절  
**Result** – "지금 기분에 맞는 영화" 추천 MVP, 규칙 기반 + GPT 1줄 이유

---

## 3. Documents & PRD

**prd.md** – DB 스키마, API 명세, 비밀번호·이메일 규칙  
**project-status.md** – 현황, 계획, 보류 기능  
**design-spec.md** – UI·화면, 에러 메시지 영어 통일  
**chatbot-faq-list.md** – 챗봇 FAQ·응답 규칙  
**deploy-*.md** – 배포 계획, Docker

---

## 4. How I Prompted

**Architecture** – "Node + Express + SQLite로 만들어줘", "규칙 기반만, GPT 1줄만", "JWT, bcrypt"  
**Recommendations** – "4~5점 영화 장르 → 그 장르 미평가 영화 추천", "최신 개봉순", "캐싱해서 GPT 호출 줄여줘"  
**Mood** – "우울해·데이트·친구들이랑 → 장르 매핑 테이블"  
**Chatbot** – "정규식 규칙 기반", "내 취향·최근 본 영화 → DB에서 답해줘"

---

## 5. Constraints & Rules

**Project Rules** – MVP, 단순·규칙 기반, GPT 1줄만, JWT·SQLite, 추가 기술 최소화  
**PRD** – 비밀번호 8자+영문·숫자·특수문자, 유저당 영화당 평점 1회, OMDb만 1회 동기화  
**Emphasized** – "과하지 않게", "fallback 넣어줘", "영어로 통일해줘"

---

## 6. Iteration & Refinement

**After 1st build** – "추천 캐시 넣어줘", "기분 위젯 추가해줘", "위시리스트 넣어줘"  
**Document-based** – project-status → "비밀번호 찾기 보류", chatbot-faq → "이 규칙으로 챗봇 수정"  
**Deployment** – "Dockerfile 만들어줘", "deploy-plan 참고해서 정리해줘"

---

## 7. My Role vs AI's Role

**My Role** – 프로젝트 상태 체크, AI와 예열(질문·훑어보기), PRD·스펙·FAQ 작성, 프롬프트 설계, 스코프·제약 결정, 결과 검토·피드백, 문서화  
**AI's Role** – 코드 작성(서버·DB·API·프론트), 정규식·매핑 구현, OMDb·OpenAI 연동

---

## 8. Deliverables

**[사진 2장: 홈 화면 | 영화 모달(평점·위시리스트)]**

**Features** – 인증(OAuth), 영화·평점, 규칙 추천+GPT 1줄, 기분 추천, 챗봇, 위시리스트, 마이페이지, Admin  
**Documents** – prd, project-status, design-spec, chatbot-faq, deploy-*, portfolio-slides

---

## 9. Reflection

**Learnings** – PRD를 구체적으로 쓰면 AI가 더 정확히 구현함 / "~규칙으로 해줘"가 "~하게 해줘"보다 결과가 좋음 / 문서로 정리해두면 "여기 수정해줘" 지시가 쉬움  
**Improvements** – 프롬프트 템플릿화, 단계별로 나눠서 지시, 한 번에 많은 지시 피하기, 예열 단계 더 활용, 추천 캐시 무효화(평점 변경 시), 비밀번호 찾기·마이페이지 통계

---

## 10. Q&A

감사합니다.
