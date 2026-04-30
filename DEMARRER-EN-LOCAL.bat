@echo off
title Clair-Obscur - Site local
color 0A
echo.
echo  ================================================
echo    Demarrage du site Clair-Obscur en local...
echo  ================================================
echo.

cd /d "%~dp0"

:: Liberer le port 3000 si deja utilise
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

if not exist node_modules (
    echo  Installation des dependances (premiere fois)...
    echo  Patientez 1-2 minutes...
    npm install
    echo.
)

echo  Le site va s'ouvrir dans votre navigateur.
echo  Pour arreter le site : fermez cette fenetre.
echo.
echo  Adresse voyageurs : http://localhost:3000
echo  Adresse admin     : http://localhost:3000/admin
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
npm start
