# AWS 배포 전 경량화 · 수정 제안 리스트

아래는 **분석만** 수행한 결과이며, 코드/스키마/API/UI 변경은 하지 않은 상태입니다.  
적용 시에는 각 항목별로 이유 확인 후 승인하고, 필요 시 **diff 형식**으로만 제안합니다.

---

## 1. 불필요한 npm 패키지

| 위치 | 패키지 | 판단 | 비고 |
|------|--------|------|------|
| 루트 | **없음** | 현재 dependencies 8개 모두 사용 중 | express, cors, dotenv, bcryptjs, better-sqlite3, jsonwebtoken, node-cron, nodemailer 각각 server/auth/db/이메일 등에서 사용 |
| frontend | **없음** | dependencies 3개 모두 사용 | react, react-dom, react-router-dom |

**결론:** 제거할 패키지 없음. (OpenAI는 npm 패키지 없이 `fetch`로 호출)

---

## 2. devDependencies로 옮겨야 할 항목

| 위치 | 현재 | 권장 | 이유 |
|------|------|------|------|
| 루트 | **해당 없음** | - | 루트에는 devDependencies가 없고, 모든 의존성이 런타임 사용 |
| frontend | 이미 분리됨 | - | Vite, TypeScript, Tailwind, PostCSS, @types/*, @vitejs/plugin-react 은 이미 devDependencies |

**결론:** 옮길 항목 없음. 프론트는 이미 빌드 도구/타입이 devDependencies에 있음.

---

## 3. 사용되지 않는 파일/폴더

| 경로 | 용도 | 프로덕션 배포 시 |
|------|------|------------------|
| `require/*.md` | 기획/디자인/비교 문서 (prd, design-spec, chatbot-faq-list, project-status, compare-prototype-vs-moodie 등) | **제외 권장** – 앱 실행에 불필요. 배포 이미지/아티팩트에서 제외 시 용량·보안(내부 문서 노출 방지)에 유리 |
| `scripts/test-omdb-key.js` | OMDb API 키 로컬 테스트 | **제외 권장** – 운영 서버에서 불필요 |
| `scripts/seed-users.js` | 초기 사용자 시딩 | **선택** – 최초 1회 설정용. 배포 후 한 번만 실행할 경우 포함해도 되고, 별도 저장소/스크립트로 두어도 됨 |
| `scripts/check-db.js` | DB 테이블/상태 점검 | **선택** – 운영 점검용으로 유지할지 결정 |
| `scripts/set-super-admin.js` | 슈퍼관리자 설정 | **선택** – 최초 1회 또는 운영 시 필요 시만 포함 |
| `run-backend.bat`, `run-frontend.bat` | Windows 로컬 실행 | **제외 권장** – AWS 리눅스 환경에서는 미사용 |
| `git-commit.bat` | Windows에서 Git 커밋 | **제외 권장** – 배포와 무관 |
| `사이트-보기-방법.txt` | 로컬 실행 안내 | **제외 권장** – 문서만 있고 런타임 미참조 |
| `frontend/README.md` | 프론트 설명 | **선택** – 배포 이미지에서 제외 가능 |

**주의:** “폴더 구조 대규모 변경 금지”이므로, **삭제가 아니라 배포 시 복사/빌드 대상에서 제외**하는 방식 권장 (예: Docker `.dockerignore`, 또는 빌드 스크립트에서 제외).

---

## 4. 프로덕션에서 제외 가능한 리소스

| 대상 | 제외 권장 내용 | 이유 |
|------|----------------|------|
| **소스/문서** | `require/`, `*.bat`, `사이트-보기-방법.txt`, `frontend/README.md` | 앱 실행 불필요, 용량·노출 최소화 |
| **개발 스크립트** | `scripts/test-omdb-key.js` | API 키 테스트용, 프로덕션 불필요 |
| **프론트 소스** | `frontend/src/`, `frontend/index.html`, `frontend/*.config.*`, `frontend/tsconfig.json` | 프로덕션에서는 `frontend/dist/`(빌드 결과)만 서빙하면 됨 |
| **프론트 node_modules** | `frontend/node_modules/` | 빌드가 완료된 뒤에는 `frontend/dist`만 필요. 서버에서 빌드하지 않으면 node_modules 자체를 이미지에 넣지 않음 |
| **백엔드 dev 툴** | 루트에 devDependencies 없음 | 현재 구조상 별도 제외 항목 없음 |
| **.env.example** | 배포 이미지에 넣지 않거나, 배포 전용 예시만 별도 관리 | 실제 값이 아니어도 배포본에 포함하면 구조 노출. Secrets Manager 등으로 실제 값만 주입 권장 |

---

## 5. .env 보안 위험 요소

| 항목 | 위험 | 권장 조치 |
|------|------|-----------|
| **JWT_SECRET** | 미설정 시 로그인/회원가입 500. 짧거나 예시값이면 토큰 위변조·브루트포스 위험 | 프로덕션에서는 반드시 설정, 32자 이상 랜덤. AWS Secrets Manager 또는 파라미터 스토어에 저장 후 주입 |
| **.env 커밋** | .gitignore에 .env 있으나, 실수로 커밋 시 키 유출 | 저장소에 .env 올라갔는지 주기 점검. 이미 올렸다면 키 로테이션 |
| **OMDB_API_KEY** | 유출 시 할당량 소진·악용 | 배포 시 환경변수/Secrets Manager로만 주입, 기본값 없음 |
| **OPENAI_API_KEY** | 유출 시 비용·악용 | 동일하게 Secrets Manager 등으로만 주입 |
| **SMTP_PASS, GOOGLE_CLIENT_SECRET** | 직접 노출 시 이메일/계정 위험 | .env 파일 대신 Secrets Manager 권장 |
| **FRONTEND_URL / BACKEND_URL** | 잘못 설정 시 비밀번호 재설정·OAuth 리다이렉트 실패 | 프로덕션 도메인으로 명시적 설정, 기본 localhost 제거 |
| **.env.example에 예시값** | JWT_SECRET=your-secret-... 등 그대로 복사해 사용 가능성 | “실제 값으로 교체 필수” 주석 유지, 배포 문서에 Secrets 사용 안내 |

---

## 6. SQLite(moodie.db) 배포 시 문제점

| 문제 | 설명 | 완화 방안 (스키마/기능 변경 없이) |
|------|------|-------------------------------------|
| **단일 파일** | 인스턴스당 하나의 DB 파일. 복제/샤딩 없음 | 단일 인스턴스 또는 단일 DB 파일을 쓰는 구조 유지 (현재와 동일) |
| **스케일 아웃 제한** | 여러 서버에서 동일 DB 파일 공유 불가 (NFS 등으로 공유는 가능하나 동시 쓰기·락 이슈) | 1대 배포 또는 DB만 공유 스토리지에 두고 앱은 1대만 쓰기로 제한 |
| **백업** | 파일 삭제/손상 시 복구 필요 | 정기 스냅샷(예: S3, EBS 스냅샷). `better-sqlite3`는 백업 시 connection 닫거나 `.backup` API 고려 |
| **디스크** | DB 성장에 따라 디스크 부족 가능 | 디스크 사용량 모니터링, 로그/검색 로그 정리(이미 cron으로 30일·2만 건 제한 있음) |
| **동시 쓰기** | SQLite는 동시 쓰기 제한적. 현재 better-sqlite3 동기 사용으로 한 프로세스 내 순차 처리 | 현재 구조 유지 시 큰 이슈 없음. 트래픽 매우 많아지면 쓰기 큐/캐시 고려 |
| **인스턴스 재시작** | 인스턴스 교체 시 로컬 디스크의 moodie.db 사라짐 | DB 파일을 EBS 볼륨에 두거나, 기동 시 S3 등에서 복원하는 절차 권장 (구조 변경 없이 스크립트/배포 절차로 해결) |

---

## 7. node_modules 용량 최적화 방법

| 대상 | 방법 | 비고 |
|------|------|------|
| **백엔드 (루트)** | `npm install --omit=dev` 또는 `npm ci --omit=dev` | 루트에는 devDependencies 없어서 효과 제한적. 향후 dev 툴 추가 시 유효 |
| **프론트** | 배포 이미지에 `frontend/node_modules` 포함하지 않음 | CI에서 `npm ci` → `vite build` 후 `frontend/dist`만 이미지에 넣기. Node는 백엔드만 실행 |
| **Docker 사용 시** | 멀티스테이지: 1단계에서 frontend 빌드, 2단계에서는 `dist` + 백엔드 코드 + 백엔드 `npm install --omit=dev` 결과만 복사 | frontend node_modules는 1단계에만 존재, 최종 이미지에는 없음 |
| **optionalDependencies** | better-sqlite3의 prebuild-install 등은 네이티브 빌드용. 제거 시 빌드 실패 가능 | 제거하지 말 것. 대신 최종 이미지에 devDependencies가 없도록 하는 것만 적용 |

---

## 8. 서버 메모리 절약 방안

| 항목 | 내용 | 제한 사항 |
|------|------|-----------|
| **Node 단일 프로세스** | 현재 Express 단일 프로세스. PM2 cluster 등 미사용이면 추가 프로세스 메모리 없음 | 그대로 유지 가능 |
| **NODE_OPTIONS** | `NODE_OPTIONS=--max-old-space-size=256` (또는 512)로 힙 상한 지정 | 메모리 적은 인스턴스에서 OOM 방지. 너무 작으면 추천/동기화 시 실패할 수 있으니 모니터링 필요 |
| **better-sqlite3** | 동기·내장 DB로 별도 DB 프로세스 없음. 메모리 사용은 쿼리 결과·캐시 정도 | 스키마/로직 변경 없이 특별히 줄일 부분 제한적 |
| **cron** | node-cron이 같은 프로세스에서 실행. syncMovies 등은 실행 시 메모리 일시 증가 | 동시 실행 제한(한 번에 하나씩) 등은 코드 변경 없이 설정으로 조정 가능한지만 검토 가능 |
| **로그/버퍼** | console.log 과다 시 버퍼 사용 | 프로덕션에서는 로그 레벨 조정 또는 간단한 로그 줄이기로 완화 (경량 리팩토링 범위) |
| **프론트 빌드** | 프로덕션에서는 정적 파일만 서빙. Node 메모리와 무관 | Express에서 `express.static('frontend/dist')` 등으로 서빙 시 추가 메모리 거의 없음 |

---

## 9. 적용 시 참고 (요약)

- **기능/API/DB/UI/실행 방식:** 변경하지 않음.
- **불필요 패키지:** 없음.
- **devDependencies 이전:** 필요 없음.
- **제외 권장:** `require/`, `scripts/test-omdb-key.js`, `*.bat`, `사이트-보기-방법.txt`, (선택) 기타 문서·개발 전용 스크립트. **배포 시 복사/이미지 대상에서 제외**하는 방식 권장.
- **.env:** 프로덕션에서는 Secrets Manager 등으로 주입, JWT_SECRET·API 키 강화.
- **SQLite:** 단일 인스턴스 또는 단일 DB 파일 전제, 백업·디스크·인스턴스 교체 시 DB 보존 절차 권장.
- **node_modules:** 프론트는 빌드 결과만 배포, 백엔드는 `--omit=dev` 유지.
- **메모리:** `NODE_OPTIONS=--max-old-space-size` 설정으로 상한 두는 것 검토.

수정이 필요한 경우에는 **이유 설명 후 승인을 받고, diff 형식으로만 제안**하면 됩니다.
