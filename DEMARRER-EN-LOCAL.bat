@echo off
title Clair-Obscur - Site local
color 0A
echo.
echo  ================================================
echo    Demarrage du site Clair-Obscur en local...
echo  ================================================
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo  Installation des dependances (premiere fois)...
    npm install
    echo.
)

echo  Le site va s'ouvrir dans votre navigateur.
echo  Pour arreter le site : fermez cette fenetre.
echo.
echo  Adresse voyageurs : http://localhost:3000
echo  Adresse admin     : http://localhost:3000/admin
echo.

start "" "http://localhost:3000"
npm start
