@echo off
setlocal

cd /d "%~dp0"

title discord-mcbe

if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    call pnpm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b %ERRORLEVEL%
    )
)

call pnpm build:silent

call pnpm -F server start

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server stopped with an error.
)

pause
