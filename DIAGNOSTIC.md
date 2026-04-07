# 🔧 DIAGNOSTIC - Panneau de Debug Activé

## 📍 Site avec Debug

**URL :** https://client-ep9w7siat-elzeds-projects.vercel.app

OU

**URL stable :** https://client-elzeds-projects.vercel.app

## 🧪 Comment Utiliser le Panneau de Debug

### Étape 1 : Ouvrir le Site
Allez sur le site ci-dessus.

### Étape 2 : Voir le Panneau de Debug
Vous verrez un panneau bleu avec le titre "🔧 Panneau de Debug" en haut de la page.

### Étape 3 : Vérifier la Configuration
Le panneau affiche :
```
API_URL: https://datamatch-07wn.onrender.com (ou http://localhost:3001)
Upload Endpoint: https://datamatch-07wn.onrender.com/api/upload
Environment: production
VITE_API_URL: https://datamatch-07wn.onrender.com
```

**✅ VÉRIFIEZ** que `API_URL` pointe bien vers `https://datamatch-07wn.onrender.com`

**❌ SI** il affiche `http://localhost:3001`, c'est le problème !

### Étape 4 : Test de Connexion
1. Cliquez sur le bouton **"🔍 Test Connexion"**
2. Regardez les logs qui apparaissent en vert sur fond noir
3. Vous devriez voir :
   ```
   ✅ Réponse reçue: 200 OK
   📦 Données: {"status":"ok",...}
   ```

**❌ SI** vous voyez une erreur, notez le message exact.

### Étape 5 : Test d'Upload
1. Cliquez sur le bouton **"📤 Test Upload"**
2. Regardez les logs
3. Vous devriez voir :
   ```
   ✅ Réponse: 200 OK
   📦 Résultat: {"success":true,...}
   ```

**❌ SI** vous voyez une erreur, notez le message exact.

### Étape 6 : Test avec Votre Fichier
Essayez maintenant d'uploader votre fichier Excel normalement.

## 📋 Que Faire Selon les Résultats

### Cas 1 : API_URL = localhost
**Problème :** La variable d'environnement n'est pas configurée sur Vercel.

**Solution :**
1. Allez sur : https://vercel.com/elzeds-projects/client/settings/environment-variables
2. Ajoutez :
   - **Name** : `VITE_API_URL`
   - **Value** : `https://datamatch-07wn.onrender.com`
   - **Environment** : Production
3. Redéployez : `vercel --prod`

### Cas 2 : Test Connexion Échoue
**Problème :** Le serveur Render est inaccessible.

**Solution :**
1. Vérifiez que le serveur est actif : https://datamatch-07wn.onrender.com/api/health
2. Si erreur 404, le serveur n'a pas le endpoint /api/health
3. Si timeout, le serveur est endormi (attendez 60 secondes)

### Cas 3 : Test Upload Échoue
**Problème :** L'endpoint d'upload a un problème.

**Solutions possibles :**
- **CORS Error** : Le serveur bloque les requêtes depuis Vercel
- **413 Payload Too Large** : Le fichier est trop gros
- **500 Internal Server Error** : Erreur côté serveur

### Cas 4 : Tests OK mais Upload Réel Échoue
**Problème :** Le fichier spécifique pose problème.

**Solutions :**
- Vérifiez la taille du fichier (max 50MB)
- Vérifiez le format (.xlsx, .xls, .csv)
- Essayez avec un fichier plus petit

## 📸 Envoyez-moi les Informations

Faites une capture d'écran du panneau de debug montrant :
1. La configuration (API_URL, etc.)
2. Les logs après avoir cliqué sur "Test Connexion"
3. Les logs après avoir cliqué sur "Test Upload"
4. Le message d'erreur quand vous uploadez votre fichier

Avec ces informations, je pourrai identifier exactement le problème !

## 🗑️ Retirer le Debug (Plus Tard)

Une fois le problème résolu, pour retirer le panneau de debug :

1. Ouvrez `client/src/App.tsx`
2. Supprimez les lignes avec `<DebugPanel />`
3. Supprimez l'import : `import { DebugPanel } from '@/components/DebugPanel'`
4. Rebuild et redéployez

---

**Testez maintenant et dites-moi ce que vous voyez !** 🔍
