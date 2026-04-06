@echo off
echo ========================================
echo Demarrage du serveur DataMatch
echo ========================================
cd server
echo Installation des dependances si necessaire...
call npm install
echo.
echo Demarrage du serveur sur le port 3001...
call npm run dev
