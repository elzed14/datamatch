#!/usr/bin/env pwsh
# Script de déploiement automatique pour DataMatch

Write-Host "🚀 Déploiement de DataMatch sur Vercel..." -ForegroundColor Cyan
Write-Host ""

# Vérifier si on est dans le bon dossier
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: Ce script doit être exécuté depuis le dossier client/" -ForegroundColor Red
    exit 1
}

# Build du projet
Write-Host "📦 Build du projet..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build réussi!" -ForegroundColor Green
Write-Host ""

# Déploiement sur Vercel
Write-Host "🌐 Déploiement sur Vercel..." -ForegroundColor Yellow
vercel --prod --yes

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Déploiement réussi!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Votre site est accessible à:" -ForegroundColor Cyan
Write-Host "   https://client-elzeds-projects.vercel.app" -ForegroundColor White
Write-Host ""
Write-Host "📋 Autres URLs:" -ForegroundColor Cyan
Write-Host "   https://client-lovat-pi-57.vercel.app" -ForegroundColor Gray
Write-Host "   https://client-elzed14-elzeds-projects.vercel.app" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Partagez ces liens avec vos amis - ils sont publics!" -ForegroundColor Green
