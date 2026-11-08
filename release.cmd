@echo off
rem Bam dup file nay: build frontend + nen tien ich Chrome + nen ca web thanh mot file release\fepass-web.zip
cd /d "%~dp0frontend"
call npm run release
if errorlevel 1 (
  echo.
  echo Co loi, xem thong bao o tren.
  pause
  exit /b 1
)
explorer "%~dp0release"
pause
