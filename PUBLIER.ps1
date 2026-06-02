# PUBLIER.ps1 -- Deploiement vers Netlify
# Executer depuis le dossier du site : .\PUBLIER.ps1

param(
  [string]$Message = "Mise a jour du site"
)

Write-Host ""
Write-Host "=== Deploiement Netlify ===" -ForegroundColor Cyan
Write-Host ""

# Verifie que git est initialise
if (-not (Test-Path ".git")) {
  Write-Host "  Pas de depot git. Initialisation..." -ForegroundColor Yellow
  git init
  git branch -M main
}

# Verifie qu'un remote GitHub est configure
$remote = git remote get-url origin 2>$null
if (-not $remote) {
  Write-Host "ERREUR : Aucun remote GitHub configure." -ForegroundColor Red
  Write-Host "  Creez un depot sur github.com puis executez :"
  Write-Host "  git remote add origin https://github.com/VOTRE-COMPTE/NOM-DU-DEPOT.git"
  exit 1
}

Write-Host "  Ajout des fichiers..." -ForegroundColor Gray
git add -A

$status = git status --short
if (-not $status) {
  Write-Host "OK : Aucune modification detectee -- rien a publier." -ForegroundColor Green
  exit 0
}

Write-Host "  Commit : $Message" -ForegroundColor Gray
git commit -m $Message

Write-Host "  Envoi vers GitHub (declenche Netlify)..." -ForegroundColor Gray
git push origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "OK : Publie ! Netlify va deployer automatiquement." -ForegroundColor Green
  Write-Host "     Suivez l avancement sur : https://app.netlify.com" -ForegroundColor Cyan
} else {
  Write-Host ""
  Write-Host "ERREUR : Echec du push. Verifiez vos droits GitHub." -ForegroundColor Red
}
Write-Host ""