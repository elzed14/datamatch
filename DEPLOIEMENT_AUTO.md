# Configuration du Déploiement Automatique sur Vercel

## 🚀 Déploiement Automatique depuis GitHub

Pour que votre site soit **PUBLIC** et accessible à tous sans connexion Vercel, suivez ces étapes :

### 1. Connecter le Repository GitHub à Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Add New..."** → **"Project"**
3. Sélectionnez votre repository GitHub : `elzed14/datamatch`
4. Configurez le projet :
   - **Framework Preset** : Vite
   - **Root Directory** : `client`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
   - **Install Command** : `npm install`

### 2. Configurer les Variables d'Environnement

Dans les paramètres du projet Vercel :
- Allez dans **Settings** → **Environment Variables**
- Ajoutez :
  - **Name** : `VITE_API_URL`
  - **Value** : `https://datamatch-07wn.onrender.com`
  - **Environment** : Production

### 3. Déployer

- Cliquez sur **"Deploy"**
- Vercel va automatiquement :
  - Installer les dépendances
  - Builder le projet
  - Déployer sur un domaine public

### 4. Domaine Public

Après le déploiement, vous obtiendrez :
- Un domaine Vercel public : `https://votre-projet.vercel.app`
- Ce domaine est **accessible à tous sans connexion**

### 5. Déploiements Automatiques

Une fois configuré :
- Chaque `git push` sur la branche `main` déclenche un déploiement automatique
- Vous n'avez plus besoin d'utiliser `vercel --prod` en CLI

## ⚠️ Important

**NE PLUS utiliser** `vercel --prod` en ligne de commande car cela crée des déploiements privés liés à votre compte.

À la place :
1. Faites vos modifications
2. `git add .`
3. `git commit -m "votre message"`
4. `git push`
5. Vercel déploie automatiquement !

## 🔗 Liens Utiles

- Dashboard Vercel : https://vercel.com/dashboard
- Documentation : https://vercel.com/docs
- GitHub Repository : https://github.com/elzed14/datamatch

## 📝 Configuration Actuelle

- **Frontend** : Vercel (déploiement automatique depuis GitHub)
- **Backend** : Render (https://datamatch-07wn.onrender.com)
- **Repository** : https://github.com/elzed14/datamatch
