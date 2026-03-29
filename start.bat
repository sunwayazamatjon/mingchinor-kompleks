@echo off
title Mingchinor Kafe - Ishga tushirish
color 0A
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ========================================
echo    MINGCHINOR KAFE - Ishga tushirish
echo ========================================
echo.

echo [0/4] Kerakli vositalar tekshirilmoqda...

where node > nul 2>&1
if %errorlevel% neq 0 (
    echo XATOLIK: Node.js topilmadi. Iltimos Node.js o'rnatilganini tekshiring.
    pause
    exit /b
)
where npm > nul 2>&1
if %errorlevel% neq 0 (
    echo XATOLIK: npm topilmadi. Iltimos Node.js bilan birga o'rnatilganini tekshiring.
    pause
    exit /b
)
echo.

:: 1. Redis (Docker) o'chirildi (In-Memory xotira ishlashga o'tdi)
echo [1/4] Lokal baza tekshirilmoqda...
echo Baza Docker'siz tushishga tayyor.
echo.

:: 2. Backend dependensiyalarini tekshirish
echo [2/4] Backend tekshirilmoqda...
pushd backend > nul
if not exist "node_modules" (
    echo Backend paketlari o'rnatilmoqda...
    call npm install
    if %errorlevel% neq 0 (
        echo XATOLIK: npm install bajarilmadi.
        popd > nul
        pause
        exit /b
    )
)
popd > nul
echo.

:: 3. Backendni ishga tushirish (yangi oynada)
echo [3/4] Backend ishga tushirilmoqda...
start "Mingchinor Backend" cmd /k "cd /d "%ROOT%backend" && echo Backend server ishga tushmoqda... && node server.js"
echo.

:: 4. Frontendni ishga tushirish (yangi oynada)
echo [4/4] Frontend ishga tushirilmoqda...
start "Mingchinor Frontend" cmd /k "cd /d "%ROOT%frontend" && echo Frontend server ishga tushmoqda... && npx serve"
echo.

echo.
echo ========================================
echo    TIZIM ISHGA TUSHDI!
echo ========================================
echo.
echo Frontend manzili: http://localhost:3000
echo Backend manzili: http://localhost:3001
echo.
echo Admin panel: http://localhost:3000/admin-menu.html
echo Ofisant panel: http://localhost:3000/admin-panel.html
echo.
echo Parol: mingchinor123
echo.
echo Oynalarni yopish uchun Ctrl+C bosing
echo ========================================
pause