# EC2 단일 인스턴스 + Docker 배포 실행 계획

`deploy-lightweight-suggestions.md` 제안만 반영. **기능/API/DB/UI/기술 스택 변경 없음.** 코드 수정 없이, 실행 순서와 명령어만 정리.

---

## 전제

- **대상:** EC2 단일 인스턴스 1대, Docker로 백엔드만 컨테이너 실행.
- **프론트:** 현재 `server.js`는 정적 파일을 서빙하지 않음 → EC2에 nginx 설치 후 빌드된 `frontend/dist` 서빙 + `/api`만 컨테이너로 프록시.
- **DB:** SQLite `moodie.db` 1개 파일, 컨테이너 외부 볼륨에 두어 인스턴스/컨테이너 재생성 시에도 유지.

---

## Phase 0: 사전 준비 (로컬 또는 운영 PC)

### 0-1. 환경변수/시크릿 정리

- JWT_SECRET, OMDB_API_KEY, OPENAI_API_KEY, SMTP, Google OAuth 등은 **배포 이미지에 넣지 않고**, EC2에서 환경변수 또는 AWS Secrets Manager로만 주입.
- 프로덕션용 값은 32자 이상 랜덤 JWT_SECRET, 실제 API 키만 사용. `.env.example`은 배포 이미지에 포함하지 않음.

**할 일:**  
프로덕션에서 쓸 환경변수 목록을 한 번 정리해 두고, 아래 중 하나로 EC2에서 줄 준비를 한다.

- **방법 A (간단):** EC2에 `.env` 파일을 만들고 `docker run --env-file .env` 로 넘긴다. (이미지에는 넣지 않음.)
- **방법 B (권장):** Secrets Manager에 저장 후 EC2에서 조회해 `docker run -e JWT_SECRET=...` 형태로 넘기거나, ECS 사용 시 태스크 정의에서 시크릿 바인딩.

**필수 변수 예시 (값은 반드시 실제 값으로):**

```bash
PORT=3000
NODE_ENV=production
JWT_SECRET=<32자 이상 랜덤>
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
OMDB_API_KEY=<실제 키>
OPENAI_API_KEY=<선택>
# SMTP, GOOGLE_CLIENT_ID/SECRET 등 사용 시 추가
```

---

### 0-2. (선택) 메모리 상한

- 문서 제안: `NODE_OPTIONS=--max-old-space-size=256` 또는 `512` 로 힙 상한 지정.
- 적용: `docker run` 시 `-e NODE_OPTIONS=--max-old-space-size=512` 로 전달 (아래 Phase 6 참고).

---

## Phase 1: .dockerignore 추가 (이미지 경량화·보안)

**목적:** 문서 제안대로 `require/`, 개발 스크립트, `*.bat`, 프론트 소스(이미지에 넣지 않을 경우) 등 제외. 코드 수정 없이 **새 파일만 추가.**

**위치:** 프로젝트 **루트**에 `.dockerignore` 파일 생성.

**내용 (복사해서 사용):**

```text
# 문서·기획 (실행 불필요, 노출 최소화)
require/
사이트-보기-방법.txt
frontend/README.md

# Windows 로컬용
*.bat

# 개발/테스트 스크립트
scripts/test-omdb-key.js

# 프론트 전체 (백엔드 전용 이미지이므로 dist는 EC2에서 nginx로 별도 서빙)
frontend/

# 환경·보안 (이미지에 넣지 않음)
.env
.env.*
!.env.example

# Git·IDE
.git
.gitignore
.vscode
.idea

# 로그·임시
*.log
*.tmp
*.temp
```

**실행:**

```bash
# 프로젝트 루트에서
cd /path/to/moodie
# 위 내용으로 .dockerignore 파일 생성 (에디터로 저장)
```

---

## Phase 2: Dockerfile 작성 (백엔드 전용, 멀티스테이지)

**목적:** 문서 제안대로  
- 프론트는 **빌드만** 하고 `dist`만 복사 (frontend node_modules는 최종 이미지에 없음).  
- 백엔드는 `npm ci --omit=dev` 로 프로덕션 의존성만 설치.  
- 단, **현재 server.js는 정적 서빙을 하지 않으므로** 이 Dockerfile은 **백엔드 API 전용**으로 두고, 프론트는 Phase 7에서 nginx로 서빙.

**옵션:**  
- **A)** Dockerfile은 **백엔드만** 포함 (프론트 dist 없음). → 프론트는 EC2에서 별도 빌드 후 nginx가 서빙.  
- **B)** Dockerfile 멀티스테이지에서 프론트도 빌드해 `dist`를 이미지에 넣어 두고, 나중에 server.js에 정적 서빙을 **추가**할 경우 대비. (지금은 코드 수정 없으므로 A 권장.)

아래는 **A: 백엔드 전용** 기준.

**위치:** 프로젝트 **루트**에 `Dockerfile` 생성.

**내용 (복사해서 사용):**

```dockerfile
# 백엔드 전용 (프론트는 EC2 nginx로 별도 서빙)
FROM node:20-alpine AS backend

WORKDIR /app

# 백엔드 의존성만 설치 (문서 제안: --omit=dev)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 백엔드 소스 (.dockerignore로 require/, frontend 소스 등 제외됨)
COPY . .

# DB 파일은 런타임에 볼륨으로 마운트하므로 여기서는 빈 디렉터리만
RUN mkdir -p /data

WORKDIR /app

# db.js가 moodie.db를 process.cwd() 기준으로 찾을 수 있도록,
# 실행 시 -v 로 /data 를 마운트하고, DB 파일은 /data/moodie.db 로 두는 방식 권장
# (또는 현재와 동일하게 작업 디렉터리 내 moodie.db 사용 시, 볼륨을 /app 에 마운트)
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
```

**참고:** `db.js`에서 DB 경로가 `path.join(__dirname, 'moodie.db')` 이면, 컨테이너 내부는 `/app/moodie.db`가 됨. 따라서 **볼륨 마운트 시** `-v /host/path/data:/app` 처럼 `/app` 전체를 마운트하면 호스트의 `moodie.db`가 사용됨. (DB 스키마/로직 변경 없음.)

**실행:**

```bash
cd /path/to/moodie
# 위 내용으로 Dockerfile 저장
```

---

## Phase 3: Docker 이미지 빌드

**위치:** 프로젝트 루트. `.dockerignore` 적용되어 문서에서 제외한 항목은 빌드 컨텍스트에 포함되지 않음.

```bash
cd /path/to/moodie
docker build -t moodie-backend:latest .
```

---

## Phase 4: EC2 준비

### 4-1. EC2 인스턴스

- Amazon Linux 2 또는 Ubuntu 등. 단일 인스턴스 1대.
- 보안 그룹: 80(HTTP), 443(HTTPS), 22(SSH) 등 필요 포트 개방.

### 4-2. EC2에 Docker 설치

```bash
# SSH 접속 후 (Amazon Linux 2 예시)
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
# 재로그인 후 docker 명령 사용
```

### 4-3. DB·데이터 디렉터리

- 인스턴스 재시작/교체 시에도 DB 유지하려면 **EBS 볼륨**에 디렉터리 생성.

```bash
sudo mkdir -p /data/moodie
sudo chown ec2-user:ec2-user /data/moodie
# 최초 1회: 빈 moodie.db가 필요하면 컨테이너 1회 실행 후 생성되도록 하거나,
# 로컬에서 만든 moodie.db를 scp로 올린 뒤 이 경로에 둠
```

### 4-4. 환경변수 파일 (방법 A 사용 시)

```bash
# EC2 어딘가에 (예: /home/ec2-user/moodie.env)
# 실제 값으로 채움. chmod 600 권장
nano /home/ec2-user/moodie.env
chmod 600 /home/ec2-user/moodie.env
```

---

## Phase 5: 이미지 전달 및 DB 준비

### 5-1. 이미지를 EC2로 가져오기

**방법 1: 레지스트리 없이 로컬에서 직접**

```bash
# 로컬(빌드한 PC)에서
docker save moodie-backend:latest | gzip > moodie-backend.tar.gz
scp -i your-key.pem moodie-backend.tar.gz ec2-user@<EC2-IP>:~/

# EC2에서
docker load < moodie-backend.tar.gz
```

**방법 2: ECR 사용**

```bash
# 로컬: ECR 로그인 후 푸시
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.ap-northeast-2.amazonaws.com
docker tag moodie-backend:latest <ACCOUNT>.dkr.ecr.ap-northeast-2.amazonaws.com/moodie-backend:latest
docker push <ACCOUNT>.dkr.ecr.ap-northeast-2.amazonaws.com/moodie-backend:latest

# EC2: 동일 리전에서 pull
aws ecr get-login-password --region ap-northeast-2 | sudo docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.ap-northeast-2.amazonaws.com
sudo docker pull <ACCOUNT>.dkr.ecr.ap-northeast-2.amazonaws.com/moodie-backend:latest
```

### 5-2. DB 파일 최초 준비

- **이미 로컬에 moodie.db가 있으면:** EC2 `/data/moodie/` 로 복사.

```bash
# 로컬
scp -i your-key.pem moodie.db ec2-user@<EC2-IP>:/data/moodie/
```

- **없으면:** 컨테이너 1회 실행 시 `db.js`가 `/app` 아래에 `moodie.db`를 만들 수 있으므로, 그때는 `/app`을 호스트 경로에 마운트해 두어야 호스트에 파일이 생김. 아래 Phase 6에서 `-v /data/moodie:/app` 사용 시, **앱이 /app/moodie.db에 쓰므로** 호스트에는 `/data/moodie/moodie.db`로 생성됨.

---

## Phase 6: 컨테이너 실행

- **DB 유지:** `-v /data/moodie:/app` 로 마운트하면 컨테이너 내부의 `/app`(작업 디렉터리)에 호스트의 `/data/moodie`가 붙고, `moodie.db`는 호스트 `/data/moodie/moodie.db`에 저장됨.
- **환경변수:** `--env-file` 또는 `-e` 로 전달. 이미지에는 `.env` 포함하지 않음.

```bash
# EC2에서 (env 파일 사용 시)
docker run -d \
  --name moodie-api \
  -p 3000:3000 \
  -v /data/moodie:/app \
  --env-file /home/ec2-user/moodie.env \
  -e NODE_OPTIONS=--max-old-space-size=512 \
  --restart unless-stopped \
  moodie-backend:latest
```

- **동작 확인:**

```bash
curl -s http://localhost:3000/
# "Moodie 영화 추천 서버가 정상 실행 중입니다!" 유사 응답
```

---

## Phase 7: 프론트 빌드 및 nginx로 서빙 (코드 수정 없음)

- 현재 구조 유지: API는 3000 포트, 프론트는 별도 서빙.

### 7-1. 로컬 또는 CI에서 프론트 빌드

```bash
cd /path/to/moodie/frontend
npm ci
npm run build
# frontend/dist/ 생성됨
```

### 7-2. dist를 EC2로 전달

```bash
# 로컬
scp -i your-key.pem -r frontend/dist ec2-user@<EC2-IP>:~/moodie-frontend/
# 또는 rsync
rsync -avz -e "ssh -i your-key.pem" frontend/dist/ ec2-user@<EC2-IP>:~/moodie-frontend/
```

### 7-3. EC2에 nginx 설치 및 리버스 프록시

```bash
# EC2
sudo yum install -y nginx   # Amazon Linux
# 또는 sudo apt install -y nginx  # Ubuntu
sudo systemctl enable nginx
```

**설정:** `/etc/nginx/conf.d/moodie.conf` (예시). API는 컨테이너 3000으로, 나머지는 정적 파일.

```nginx
server {
    listen 80;
    server_name _;
    root /home/ec2-user/moodie-frontend;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t
sudo systemctl start nginx
sudo systemctl reload nginx
```

- 프론트의 API_BASE가 `/api`이면, nginx가 `/api` → `http://127.0.0.1:3000/`으로 넘기면 됨. (기능/UI 변경 없음.)

---

## Phase 8: DB 백업 (문서 제안 반영)

- **정기 스냅샷:** EBS 스냅샷 또는 `/data/moodie` 디렉터리를 주기적으로 S3 등에 복사.

```bash
# 예: 매일 cron
0 3 * * * aws s3 cp /data/moodie/moodie.db s3://your-bucket/backups/moodie-$(date +\%Y\%m\%d).db
```

- 인스턴스 교체 시: 새 인스턴스의 `/data/moodie`를 EBS 볼륨으로 붙이거나, S3에서 복원 후 동일하게 `-v /data/moodie:/app` 로 실행.

---

## Phase 9: (선택) 운영 스크립트 포함 여부

- **문서 제안:** `scripts/seed-users.js`, `set-super-admin.js`, `check-db.js` 등은 **이미지에 넣지 않음** (.dockerignore로 제외 가능).  
- 최초 1회 시딩/슈퍼관리자 설정이 필요하면:  
  - 로컬에서 DB 파일으로 작업 후 다시 업로드하거나,  
  - EC2에 프로젝트를 별도로 clone한 뒤 `node scripts/set-super-admin.js` 등만 실행 (이미지와 분리).

---

## 실행 순서 요약

| 순서 | 단계 | 내용 |
|------|------|------|
| 0 | 사전 준비 | 환경변수/시크릿 정리, NODE_OPTIONS 결정 |
| 1 | .dockerignore | 루트에 생성, 문서 제안 제외 목록 반영 |
| 2 | Dockerfile | 루트에 백엔드 전용 Dockerfile 생성 |
| 3 | 이미지 빌드 | `docker build -t moodie-backend:latest .` |
| 4 | EC2 준비 | Docker 설치, /data/moodie, (선택) moodie.env |
| 5 | 이미지·DB | 이미지 전달( save/load 또는 ECR ), moodie.db 복사 또는 최초 생성 |
| 6 | 컨테이너 실행 | `docker run` (볼륨, env-file, NODE_OPTIONS) |
| 7 | 프론트 | frontend 빌드 → dist EC2 복사 → nginx 설정 및 시작 |
| 8 | 백업 | EBS 스냅샷 또는 S3 정기 복사 |

위 순서대로 진행하면, 문서 제안(경량화·보안·SQLite 유지·메모리 옵션)만 반영한 EC2 단일 인스턴스 + Docker 배포가 가능합니다. 기능/API/DB/UI 변경 및 애플리케이션 코드 수정은 없습니다.
