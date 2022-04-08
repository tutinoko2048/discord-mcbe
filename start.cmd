cd /d %~dp0

if not exist "node_modules" call npm i

call npm run start