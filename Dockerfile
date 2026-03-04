# 백엔드 전용 (프론트는 EC2 nginx로 별도 서빙)
FROM node:20-alpine

WORKDIR /app

# 백엔드 의존성만 설치 (문서 제안: --omit=dev)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 백엔드 소스 (.dockerignore로 require/, frontend 등 제외됨)
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
