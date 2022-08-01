@echo off
cd /d %~dp0
if not exist "node_modules" call setup.cmd
echo starting...
call npm run start
pause
