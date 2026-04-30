@echo off
title Publication sur le site en ligne
color 0B
echo.
echo  ================================================
echo    Publication de vos modifications...
echo  ================================================
echo.

cd /d "%~dp0"

echo  Etape 1/3 : Preparation des fichiers...
git add -A

echo  Etape 2/3 : Enregistrement des modifications...
git commit -m "Mise a jour du contenu - %date% %time%"

echo  Etape 3/3 : Envoi vers le site en ligne...
git push

echo.
echo  ================================================
echo    Termine ! Le site se met a jour en ligne.
echo    (Attendre 2-3 minutes puis actualiser)
echo  ================================================
echo.
pause
