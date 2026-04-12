FROM node:22-slim

# Installer LibreOffice + dépendances
RUN apt-get update && apt-get install -y \
  libreoffice \
  libreoffice-writer \
  libreoffice-calc \
  fonts-liberation \
  fonts-dejavu \
  --no-install-recommends \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN PUPPETEER_SKIP_DOWNLOAD=true npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
