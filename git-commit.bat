@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "GIT_PATH="
if exist "C:\Program Files\Git\bin\git.exe" set "GIT_PATH=C:\Program Files\Git\bin\git.exe"
if exist "C:\Program Files (x86)\Git\bin\git.exe" set "GIT_PATH=C:\Program Files (x86)\Git\bin\git.exe"
if exist "C:\Program Files\Git\cmd\git.exe" set "GIT_PATH=C:\Program Files\Git\cmd\git.exe"

if defined GIT_PATH (
    "%GIT_PATH%" add .
    "%GIT_PATH%" commit -m "Curations, Cinema Book Ticket, recommendation API, JWT_SECRET"
    if errorlevel 1 pause
) else (
    echo Git not found. Install from https://git-scm.com/download/win
    pause
)
