@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [Moodie] 백엔드 시작 중... (종료: Ctrl+C)
node server.js
pause
