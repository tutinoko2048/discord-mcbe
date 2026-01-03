@echo off
setlocal

set "CUR_DIR=%CD%"

set "TARGET_DIR=%APPDATA%\Minecraft Bedrock\Users\Shared\games\com.mojang\development_behavior_packs\discord-mcbe-addon-dev"

mklink /D "%TARGET_DIR%" "%CUR_DIR%"

pause
