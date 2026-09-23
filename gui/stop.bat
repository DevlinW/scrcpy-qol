@echo off
title Stop scrcpy-qol
echo Stopping scrcpy-qol servers...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5050" ^| findstr "LISTENING"') do (
    echo Killing backend on port 5050 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Killing frontend on port 5173 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo All scrcpy-qol servers have been stopped.
timeout /t 2 >nul
