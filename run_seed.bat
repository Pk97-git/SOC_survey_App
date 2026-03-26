@echo off
cd /d "%~dp0backend"
npx dotenv -e .env -- npx ts-node src/scripts/seed.ts
pause
