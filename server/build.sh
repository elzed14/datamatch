#!/bin/bash
set -e

echo "==> Installation des dépendances npm..."
npm install

echo "==> Installation de LibreOffice..."
apt-get update -qq
apt-get install -y -qq libreoffice --no-install-recommends

echo "==> Vérification LibreOffice..."
libreoffice --version

echo "==> Build TypeScript..."
npm run build

echo "==> Build terminé !"
