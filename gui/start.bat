@echo off
title scrcpy-qol Dashboard
echo ========================================================
echo         Launching scrcpy-qol Dashboard (Phase 1)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking dependencies...
if not exist "backend\node_modules\" (
    echo Installing backend dependencies...
    cd backend && call npm install && cd ..
)
if not exist "frontend\node_modules\" (
    echo Installing frontend dependencies...
    cd frontend && call npm install && cd ..
)

echo.
echo [2/3] Starting Local Companion Backend on port 5050...
start "scrcpy-qol Backend" /min cmd /c "cd /d %~dp0backend && npm start"

timeout /t 2 /nobreak >nul

echo.
echo [3/3] Starting Frontend Dev Server on port 5173...
start "scrcpy-qol Frontend" /min cmd /c "cd /d %~dp0frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo Opening browser to http://localhost:5173 ...
start http://localhost:5173

echo ========================================================
echo   scrcpy-qol Dashboard is running!
echo   Dashboard: http://localhost:5173
echo   Backend:   http://localhost:5050
echo.
echo   To stop all servers anytime, run stop.bat
echo ========================================================
pause

