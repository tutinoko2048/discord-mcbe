@echo off
setlocal

cd /d "%~dp0"

set "LAUNCHER_VERSION="
for /f "usebackq delims=" %%i in (`updater.exe --version 2^>nul`) do (
    if not defined LAUNCHER_VERSION set "LAUNCHER_VERSION=%%i"
)

rem Check if app folder exists
if not exist "app" (
    echo App folder not found. Running updater...

    call updater.exe stable
    if errorlevel 1 (
        echo Failed to run updater
        pause
        exit /b 1
    )

    echo Please set up the .env file before running discord-mcbe.

    pause
    exit /b 1
)

set BUN_BE_BUN=1
set "LAUNCHER_VERSION=%LAUNCHER_VERSION%"
updater.exe run app\discord-mcbe.js

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server stopped with an error.
)

pause
