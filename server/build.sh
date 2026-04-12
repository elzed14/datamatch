#!/bin/bash
set -e

echo "==> Installation des dépendances npm..."
npm install

echo "==> Installation de Chromium pour Puppeteer sur Linux..."
apt-get update -qq && apt-get install -y -qq \
  chromium \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends 2>/dev/null || echo "apt-get non disponible, Chromium ignoré"

echo "==> Build TypeScript..."
npm run build

echo "==> Build terminé !"
