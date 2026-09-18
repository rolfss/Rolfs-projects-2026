@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo FJORDSPRINT needs Node.js to start its local game server.
  echo Install the current LTS version from https://nodejs.org then open this file again.
  pause
  exit /b 1
)
node launch.mjs
if errorlevel 1 pause
