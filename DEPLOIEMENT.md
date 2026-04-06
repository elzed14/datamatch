# 🚀 Guide de Déploiement Gratuit - DataMatch

## 📋 Prérequis
- Compte GitHub (gratuit)
- Compte Vercel (gratuit)
- Compte Render (gratuit)

---

## Étape 1 : Préparer le code sur GitHub

### 1.1 Créer un dépôt GitHub
```bash
# Dans le dossier DataMatch
git init
git add .
git commit -m "Initial commit - DataMatch"
```

### 1.2 Créer un fichier .gitignore
Créez `.gitignore` à la racine :
```
node_modules/
dist/
.env
.env.local
.env.production
uploads/
*.log
.DS_Store
```

### 1.3 Pousser sur GitHub
```bash
# Créez un nouveau repo sur github.com, puis :
git remote add origin https://github.com/VOTRE_USERNAME/datamatch.git
git branch -M main
git push -u origin main
```

---

## Étape 2 : Déployer le Backend sur Render

### 2.1 Créer un compte sur Render.com
- Allez sur https://render.com
- Inscrivez-vous avec GitHub (gratuit)

### 2.2 Créer un nouveau Web Service
1. Cliquez sur "New +" → "Web Service"
2. Connectez votre dépôt GitHub
3. Configurez :
   - **Name** : `datamatch-backend`
   - **Root Directory** : `server`
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Instance Type** : `Free`

### 2.3 Ajouter les variables d'environnement
Dans l'onglet "Environment" :
```
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://votre-app.vercel.app
```
(Vous mettrez à jour CORS_ORIGIN après avoir déployé le frontend)

### 2.4 Déployer
- Cliquez sur "Create Web Service"
- Attendez le déploiement (5-10 min)
- Notez l'URL : `https://datamatch-backend.onrender.com`

---

## Étape 3 : Déployer le Frontend sur Vercel

### 3.1 Créer un compte sur Vercel.com
- Allez sur https://vercel.com
- Inscrivez-vous avec GitHub (gratuit)

### 3.2 Importer le projet
1. Cliquez sur "Add New..." → "Project"
2. Sélectionnez votre dépôt GitHub
3. Configurez :
   - **Framework Preset** : `Vite`
   - **Root Directory** : `client`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

### 3.3 Ajouter les variables d'environnement
Dans "Environment Variables" :
```
VITE_API_URL=https://datamatch-backend.onrender.com
```
(Utilisez l'URL de votre backend Render)

### 3.4 Déployer
- Cliquez sur "Deploy"
- Attendez le déploiement (2-3 min)
- Notez l'URL : `https://votre-app.vercel.app`

---

## Étape 4 : Mettre à jour le CORS

### 4.1 Retournez sur Render
1. Allez dans votre service backend
2. Onglet "Environment"
3. Modifiez `CORS_ORIGIN` avec l'URL Vercel :
   ```
   CORS_ORIGIN=https://votre-app.vercel.app
   ```
4. Sauvegardez (le service redémarrera automatiquement)

---

## Étape 5 : Mettre à jour le code client

### 5.1 Modifier le fichier .env.production
```bash
# Dans client/.env.production
VITE_API_URL=https://datamatch-backend.onrender.com
```

### 5.2 Pousser les changements
```bash
git add .
git commit -m "Update production API URL"
git push
```

Vercel redéploiera automatiquement !

---

## ✅ Vérification

Testez votre application :
1. Ouvrez `https://votre-app.vercel.app`
2. Testez l'upload de fichiers
3. Testez la fusion de données
4. Vérifiez les graphiques

---

## 🎯 URLs Finales

- **Frontend** : https://votre-app.vercel.app
- **Backend** : https://datamatch-backend.onrender.com
- **GitHub** : https://github.com/VOTRE_USERNAME/datamatch

---

## ⚠️ Limitations du plan gratuit

### Render (Backend)
- ✅ 750 heures/mois (suffisant)
- ⚠️ Le serveur s'endort après 15 min d'inactivité
- ⚠️ Premier chargement lent (30-60s) après inactivité
- ✅ SSL gratuit
- ✅ Déploiement automatique depuis GitHub

### Vercel (Frontend)
- ✅ Bande passante : 100GB/mois
- ✅ Builds : 6000 min/mois
- ✅ SSL gratuit
- ✅ CDN mondial
- ✅ Déploiement automatique depuis GitHub

---

## 🔧 Dépannage

### Le backend ne répond pas
- Attendez 30-60s (réveil du serveur)
- Vérifiez les logs sur Render

### Erreur CORS
- Vérifiez que `CORS_ORIGIN` sur Render correspond à l'URL Vercel
- Pas de `/` à la fin de l'URL

### Erreur 404 sur les routes
- Vérifiez que `vercel.json` est à la racine
- Vérifiez la configuration des routes

### Upload de fichiers ne fonctionne pas
- Les fichiers sont stockés en mémoire sur Render (plan gratuit)
- Ils seront perdus au redémarrage du serveur
- Pour persistance : utilisez AWS S3 (gratuit jusqu'à 5GB)

---

## 🚀 Améliorations futures (toujours gratuit)

### Option 1 : Stockage persistant avec AWS S3
- 5GB gratuit pendant 12 mois
- Intégration avec multer-s3

### Option 2 : Base de données avec MongoDB Atlas
- 512MB gratuit à vie
- Pour sauvegarder les configurations

### Option 3 : Domaine personnalisé
- Achetez un domaine (.com ~10€/an)
- Configurez-le sur Vercel (gratuit)

---

## 📊 Monitoring

### Vercel Analytics (gratuit)
- Activez dans les paramètres du projet
- Suivez les performances et le trafic

### Render Logs
- Consultez les logs en temps réel
- Déboguez les erreurs backend

---

## 🎉 Félicitations !

Votre application DataMatch est maintenant en ligne et accessible partout dans le monde, gratuitement ! 🌍

**Partagez l'URL avec vos utilisateurs et profitez de votre application !**
