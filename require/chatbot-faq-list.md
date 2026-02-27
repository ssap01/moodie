# 챗봇 FAQ 목록 (구현 기준)

챗봇은 **규칙 기반**으로 동작합니다.  
- 규칙 정의: `services/chatbotRules.js`  
- 매칭·답변 생성: `services/chatbotService.js`  
- **감정/상황 키워드 + 추천 요청**이면 `moodRecommendationService`로 기분 기반 영화 3편 + 이유를 반환합니다.

---

## 1. 규칙 기반 FAQ (chatbotRules.js)

입력은 소문자로 만든 뒤 **위에서부터 순서대로** 패턴 매칭하며, **첫 번째로 맞는 규칙**의 답변이 사용됩니다.

| 번호 | 주제 | 질문 패턴 예시 | 답변 요약 |
|------|------|----------------|-----------|
| 1 | 영화 추천 | 영화 추천, 추천, 추천해, 뭐 볼까, recommend | 로그인·평점에 따라 선호 장르/맞춤 추천 안내 + 기분 말하기 유도 |
| 2 | 내 취향 | 내가 좋아하는, 내 취향, 내 선호, 내 평점, 내가 본 | 선호 장르·평점 개수·평균 (로그인+평점 있을 때) |
| 3 | 최근 본 영화 | 최근, 방금, 요즘, 최근에 본 | 최근 평가 영화 3개 (로그인+평점 있을 때) |
| 4 | 회원가입 | 회원 가입, 회원가입, 가입 방법, sign up, join | Sign Up / Log In 위치 안내 |
| 5 | 로그인 필수 | 로그인 해야, 로그인 필수, must login | 로그인 없이 가능한 것 / 필요한 것 구분 안내 |
| 6 | 로그인 | 로그인, log in | 이미 로그인됐으면 평점·추천 유도, 아니면 Log In / Sign Up 안내 |
| 7 | 별점/평점 | 별점, 평점, rating, 점수, 내 평가 | Your Impression(상세 모달) 안내 |
| 8 | 신작/최신 | 신작, 최신, new arrival | New Arrivals 섹션 안내 |
| 9 | 인기/순위 | 인기, 순위, top rated, 평점 순 | Top Rated Movies, IMDb 순 안내 |
| 10 | 인사 | 안녕, hello, hi, 반가 | 로그인 여부에 따라 물어볼 수 있는 것 안내 |
| 11 | 도움말 | 도움, help, 뭐 할 수, 기능 | 할 수 있는 기능 나열 |
| 12 | 비밀번호 찾기 | 비밀번호 찾기, 잊어버렸, forgot password | 미제공 안내 + Contact 유도 |
| 13 | 비밀번호 변경 | 비밀번호 변경, change password | 마이페이지 > Change Password 안내 |
| 14 | 이메일 변경 | 이메일 변경, email change | 변경 불가 안내 |
| 15 | 계정 삭제/탈퇴 | 계정 삭제, 탈퇴, delete account | Danger Zone > Delete Account 안내 |
| 16 | 프로필 수정 | 프로필 수정, 닉네임 변경, profile, nickname | 마이페이지 > Profile Information > Edit 안내 |
| 17 | 마이페이지 | 마이페이지, my page, 내 정보 | 메뉴 위치 + 프로필·비밀번호·평점·찜·계정삭제 안내 |
| 18 | 추천 기준 | 추천 기준, 어떻게 추천, how recommend | 4~5점 장르 기반 + 미시청 영화 최신순 설명 |
| 19 | 기분/감정 추천 | 기분 추천, 감정 추천, 상황 추천 | 예시 문장으로 사용법 안내 |
| 20 | 문의/연락처 | 문의, 연락처, contact | 하단 Contact 버튼 안내 |
| 21 | Top/New 설명 | top rated 뭐, 신작 뭐 | Top Rated vs New Arrivals 설명 |
| 22 | 별점 방법 | 별점 어떻게, 평점 어떻게, rating how | 포스터 클릭 → 모달 → Your Impression 1~5점 |
| 23 | **찜하기/위시리스트** | 찜, 찜하기, 위시리스트, wishlist, 찜한 영화, 나중에 볼 | 로그인 시: 상세 모달 하트 → 마이페이지 Wishlist. 비로그인: 로그인 후 이용 안내 |
| 24 | **장르** | 장르, genre, 장르별 | Discover/View All 안내 + 기분·상황 입력 유도 |
| - | **기본 답변** | 위 규칙에 모두 미매칭 | "그 질문은 아직 답변할 수 없어요. 영화 추천, 로그인, 별점, 찜하기 등 궁금한 걸 물어보세요." (로그인·평점 여부에 따라 문구 약간 다름) |

- **빈 메시지:** `궁금한 걸 입력해 주세요.`

---

## 2. 감정/상황 기반 추천 (chatbotController + moodRecommendationService)

- **조건:** `extractMoodKeywords(message)`로 감정·상황 키워드가 하나 이상 **그리고** `추천`, `recommend`, `뭐 볼`, `볼 영화`, `보고 싶`, `영화`, `movie` 중 하나 포함.
- **동작:** 기분 기반 영화 **3편** + 1줄 이유 → 채팅창에 추천 영화 카드와 함께 표시.

### 감정/상황 키워드 → 장르 (MOOD_TO_GENRES, moodRecommendationService.js)

| 키워드 | 매핑 장르 (영어) |
|--------|------------------|
| 우울, 우울해, 우울한, 슬퍼, 슬픈 | Drama, Romance, Music |
| 기쁨, 행복 | Comedy, Musical, Romance |
| 신나, 신남 | Comedy, Action, Adventure |
| 스트레스, 짜증 | Action, Thriller, Comedy |
| 피곤, 지루, 심심 | Comedy, Drama, Romance / Action, Thriller, Adventure |
| 설렘 | Romance, Comedy, Drama |
| 불안 | Drama, Thriller, Mystery |
| 힐링, 기분전환 | Drama, Comedy, Romance / Comedy, Action, Adventure |
| 웃고싶, 울고싶 | Comedy, Musical / Drama, Romance |
| 무서운, 공포 | Horror, Thriller, Mystery |
| 친구, 친구들, 함께, 모임 | Comedy, Action, Adventure, Thriller |
| 혼자, 혼밥 | Drama, Thriller, Horror, Mystery / Drama, Thriller |
| 데이트, 연인 | Romance, Comedy, Drama |
| 가족 | Family, Comedy, Drama, Animation |
| 여행, 휴가 | Adventure, Comedy, Drama / Comedy, Adventure, Family |
| 운동 | Action, Adventure |
| 밤, 야간 | Thriller, Horror, Mystery, Crime |
| 아침, 오전 | Comedy, Drama, Family |
| 주말, 휴일 | Action, Comedy, Adventure, Fantasy / Comedy, Adventure, Family |

---

## 3. 수정·추가 방법

- **새 질문 추가:** `services/chatbotRules.js`의 `rules` 배열에 `{ pattern: /키워드/, response: '답변' }` 또는 `response: (ctx) => '...'` 추가.
- **기존 답변 수정:** 해당 규칙의 `response` 문자열 또는 함수만 변경.
- **감정 키워드 추가:** `services/moodRecommendationService.js`의 `MOOD_TO_GENRES`에 키워드와 장르 배열 추가.
