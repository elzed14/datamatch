#!/bin/bash
set -e
echo "==> Installation des dépendances npm..."
npm install
echo "==> Build TypeScript..."
npm run build
echo "==> Build terminé !"
