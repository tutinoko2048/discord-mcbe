@echo off
setlocal

cd /d "%~dp0"

rem Check if app folder exists
if not exist "app" (
    echo App folder not found. Running updater...
    call updater.exe
    if errorlevel 1 (
        echo Failed to run updater
        pause
        exit /b 1
    )
)

set BUN_BE_BUN=1
updater.exe run app\discord-mcbe.js

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server stopped with an error.
)

pause
