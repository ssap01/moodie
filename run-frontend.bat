@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"
echo [Moodie] 프론트엔드 시작 중... (종료: Ctrl+C)
echo.
echo 브라우저에서 http://localhost:5173 열어보세요.
echo.
npx vite
pause
