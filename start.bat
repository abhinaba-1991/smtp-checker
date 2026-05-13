@echo off
title MailProbe - SMTP Checker

echo.
echo  ==========================================
echo    MailProbe - SMTP ^& Email Validator
echo  ==========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js not found.
    echo  Install from https://nodejs.org ^(v16+^)
    pause
    exit /b 1
)

for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
echo  [OK] Node.js found

echo.
echo  [1/2] Installing backend dependencies...
cd backend
call npm install --silent
cd ..
echo  [OK] Backend ready

echo.
echo  [2/2] Installing frontend dependencies...
cd frontend
call npm install --silent
cd ..
echo  [OK] Frontend ready

echo.
echo  Starting backend API on port 5000...
cd backend
start "MailProbe Backend" cmd /k "node server.js"
cd ..

timeout /t 2 /nobreak >nul

echo  Starting frontend on port 3000...
echo.
echo  ==========================================
echo   Open http://localhost:3000 in browser
echo  ==========================================
echo.

cd frontend
start "MailProbe Frontend" cmd /k "npm start"
cd ..

echo  Both servers started in separate windows.
echo  Close those windows to stop the servers.
echo.
pause
