# Moodie 디자인 스펙 (현재 사이트 기준)

현재 구현된 UI를 기준으로 정리한 단일 디자인 스펙이다.  
새 화면·컴포넌트 추가 시 이 규칙을 따르면 일관성을 유지할 수 있다.

---

## 1. 색상

| 용도 | 값 | 사용 예 |
|------|-----|---------|
| **배경 (Primary)** | `#D8D5CF` | body, 메인 배경, 모달·챗봇 배경, Tailwind: `bg-[#D8D5CF]`, `moodie-bg` |
| **본문/제목 텍스트** | `#2D2A26` | 제목, 본문, 입력 글자, 버튼 글자: `text-[#2D2A26]` |
| **강조/버튼 배경** | `black` | CTA 버튼, 호버 시: `bg-black`, `hover:bg-black` |
| **버튼 글자 (강조 위)** | `#D8D5CF` | 검정 버튼 위 글자: `text-[#D8D5CF]` |
| **보조/테두리** | `black` + opacity | `border-black/5`, `border-black/10`, `border-black/20`, `bg-black/5` |
| **에러** | `red-600` | 에러 메시지: `text-red-600` |
| **스크롤바** | 트랙 `#D8D5CF`, 썸 `#A8A59F` | `index.css`에 정의 |

---

## 2. 타이포그래피

| 용도 | 클래스 | 폰트 |
|------|--------|------|
| **제목·로고·강조** | `.serif` 또는 `font-serif` | Playfair Display, Georgia, serif |
| **본문·라벨·버튼** | 기본 (body) | Inter, -apple-system, BlinkMacSystemFont, sans-serif |

**자주 쓰는 크기**
- 섹션 제목: `text-3xl md:text-4xl` (serif)
- 페이지 제목: `text-4xl md:text-5xl` (serif)
- 히어로 대제목: `text-4xl sm:text-6xl md:text-6xl lg:text-7xl` (serif)
- 소제목/라벨: `text-[8px]` ~ `text-[10px]`, `tracking-[0.2em]` ~ `tracking-[0.3em]`, `uppercase`
- 본문: `text-sm`, `text-xs`, `text-[11px]`

---

## 3. 브레이크포인트 (Tailwind 기본)

| 구간 | Tailwind 접두어 | 용도 |
|------|-----------------|------|
| 기본 | (없음) | 모바일 우선 |
| sm | `sm:` | 640px 이상 |
| md | `md:` | 768px 이상 |
| lg | `lg:` | 1024px 이상 |

**자주 쓰는 패턴**
- 패딩: `px-6 sm:px-8 md:px-20`, `py-16 md:py-24`
- 그리드: `grid-cols-2 sm:grid-cols-3 md:grid-cols-5`
- 텍스트: `text-[9px] md:text-[10px]`, `text-3xl md:text-4xl`

---

## 4. 레이아웃·컨테이너

| 용도 | 클래스 | 비고 |
|------|--------|------|
| **섹션 컨테이너** | `max-w-7xl mx-auto` | 홈 섹션, 무드 위젯, Navbar 내부 |
| **폼/로그인** | `max-w-md` | 로그인 폼 등 좁은 블록 |
| **마이페이지** | `max-w-4xl mx-auto` | 본문 너비 제한 |
| **모달** | `max-w-2xl` | Contact 등 |
| **섹션 패딩** | `px-6 sm:px-8 md:px-20` 또는 `px-4 md:px-8` | 좌우 여백 통일 |

---

## 5. 버튼 스타일

| 종류 | 클래스 요약 | 사용처 |
|------|-------------|--------|
| **Primary (검정)** | `bg-black text-[#D8D5CF] py-3 uppercase text-[10px] tracking-[0.4em] hover:bg-black/90` | 로그인 제출, 모달 닫기, CTA |
| **Outline** | `border border-black/20 px-4 py-2 (또는 px-6 py-2) uppercase text-[10px] tracking-wider hover:bg-black hover:text-[#D8D5CF]` | Sign Out, Copy, Edit, 취소 옆 저장 |
| **Ghost** | `border border-black/10 py-3 text-[8px] tracking-[0.2em] uppercase hover:bg-black/5 text-[#2D2A26]` | 소셜 로그인 버튼 등 |
| **위험** | `border border-red-300 text-red-700 hover:bg-red-700 hover:text-white` | 계정 삭제 등 |

공통: `transition-all`, 필요 시 `disabled:opacity-30 disabled:cursor-not-allowed`

---

## 6. 카드·입력·섹션 박스

| 요소 | 클래스 요약 |
|------|-------------|
| **섹션 카드/박스** | `border border-black/10 p-6 md:p-8 bg-[#D8D5CF]/30` (또는 `bg-white/40`) |
| **입력 필드** | `bg-transparent border-b border-black/10 py-3 text-sm focus:outline-none focus:border-black text-[#2D2A26]` |
| **영화 카드** | `aspect-[2/3]`, 호버 시 그라데이션 + 텍스트, serif 제목 |
| **챗봇 말풍선 (봇)** | `bg-white/40 italic serif border-l border-black/5` |
| **챗봇 말풍선 (유저)** | `bg-black text-[#D8D5CF] tracking-wider font-light` |

---

## 7. 기타

- **선택 강조:** `selection:bg-black selection:text-[#D8D5CF]` (App.tsx)
- **마블 오버레이:** `.marble-overlay` — 전역 저투명 패턴 (index.css)
- **애니메이션:** `.animate-fadeIn`, `.animate-slideUp` (index.css)
- **로고:** `.logo-m`(M), `.logo-rest`(oodie) — index.css

---

*문서 기준: 현재 moodie 프론트엔드 코드 반영. 변경 시 이 스펙도 함께 수정 권장.*
