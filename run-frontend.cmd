@echo off
setlocal

set "NODE_HOME=%~dp0.tools\node\node-v20.11.1-win-x64"
set "PATH=%NODE_HOME%;%PATH%"

cd /d "%~dp0mock-server-frontend"

echo Installing frontend dependencies...
call npm install
if errorlevel 1 (
  echo npm install failed.
  exit /b 1
)

echo Starting frontend on http://localhost:5173 ...
call npm run dev

endlocal
