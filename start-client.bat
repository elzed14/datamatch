@echo off
echo ========================================
echo Demarrage du client DataMatch
echo ========================================
cd client
echo Installation des dependances si necessaire...
call npm install
echo.
echo Demarrage du client sur le port 5173...
call npm run dev
