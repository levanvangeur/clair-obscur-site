@echo off
title Clair-Obscur - Site local
color 0A
echo.
echo  ================================================
echo    Demarrage du site Clair-Obscur en local...
echo  ================================================
echo.

cd /d "%~dp0"
echo  Dossier : %CD%
echo.

:: Liberer le port 3000 si deja utilise
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Verifier que Node.js est installe
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERREUR : Node.js n'est pas installe !
    echo.
    echo  Telechargez-le sur : https://nodejs.org
    echo  Choisissez la version LTS et installez-la.
    echo.
    pause
    exit /b 1
)

echo  Node.js detecte :
node --version
echo.

if not exist node_modules (
    echo  Installation des dependances (premiere fois)...
    echo  Patientez 1-2 minutes...
    npm install
    if errorlevel 1 (
        echo.
        echo  ERREUR lors de l'installation !
        pause
        exit /b 1
    )
    echo.
)

echo  Demarrage du serveur...
echo  Le site va s'ouvrir dans votre navigateur.
echo  Pour arreter : appuyez sur CTRL+C ou fermez cette fenetre.
echo.
echo  Adresse voyageurs : http://localhost:3000
echo  Adresse admin     : http://localhost:3000/admin
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
npm start

echo.
echo  Le serveur s'est arrete.
pause
