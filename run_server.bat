@echo off
@chcp 65001 >nul
set PORT=8000

REM Получение локального IP
for /f "tokens=2 delims=:" %%f in ('ipconfig ^| findstr /i "IPv4"') do set IP=%%f
set IP=%IP: =%

echo.
echo 🔹 Сервер запущен!
echo 🔸 Открой в браузере: http://%IP%:%PORT%
echo 🔸 Или на этом компьютере: http://localhost:%PORT%
echo.

python -m http.server %PORT%