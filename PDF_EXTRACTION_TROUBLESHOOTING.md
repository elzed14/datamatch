# Guide de Dépannage - Extraction PDF

## Problème Résolu : "Erreur lors de l'extraction du PDF"

### Cause du problème
Le serveur refusait les fichiers PDF car le filtre Multer n'acceptait que les fichiers Excel (.xlsx, .xls, .csv).

### Solution Appliquée
1. **Création d'un nouveau middleware Multer** (`uploadAny`) sans filtre de type de fichier
2. **Utilisation de `uploadAny`** pour les endpoints `/api/extract-pdf` et `/api/prepare-image`
3. **Correction de l'import pdf-parse** pour résoudre les erreurs TypeScript

### Code Modifié

```typescript
// Nouveau middleware pour tous types de fichiers
const uploadAny = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

// Utilisation dans les endpoints
app.post('/api/extract-pdf', uploadAny.single('file'), async (req, res) => {
  // ...
})

app.post('/api/prepare-image', uploadAny.single('file'), async (req, res) => {
  // ...
})
```

## Comment Tester

### 1. Attendre le Redéploiement
Le serveur Render redémarre automatiquement après chaque push Git. Cela prend environ **2-3 minutes**.

Vérifier le statut : https://dashboard.render.com/

### 2. Tester l'Extraction PDF

**Étape 1 : Accéder à l'application**
- URL : https://client-elzeds-projects.vercel.app

**Étape 2 : Cliquer sur "Import PDF"**
- Dans la section Smart Import

**Étape 3 : Sélectionner un fichier PDF**
- Formats supportés : .pdf
- Taille max : 50 MB

**Étape 4 : Attendre l'extraction**
- Temps estimé : 5-40 secondes
- Un message de progression s'affiche

**Étape 5 : Vérifier le résultat**
- Les données extraites apparaissent dans le tableau
- Vous pouvez les exporter en Excel

## Types de PDF Supportés

### ✅ PDF avec Texte Sélectionnable
- PDF générés par ordinateur (Word, Excel, etc.)
- Factures électroniques
- Rapports générés automatiquement
- **Extraction : Rapide et précise**

### ⚠️ PDF Scannés (Images)
- Documents scannés
- Photos de documents
- PDF créés à partir d'images
- **Solution : Utiliser "Import Image (OCR)" à la place**

## Conseils pour Meilleure Extraction

### 1. Structure du PDF
- Les tableaux bien formatés sont mieux détectés
- Les colonnes séparées par des espaces ou tabulations
- Éviter les PDF avec mise en page complexe

### 2. Qualité du PDF
- Préférer les PDF natifs (non scannés)
- Éviter les PDF protégés par mot de passe
- Taille recommandée : < 10 MB

### 3. Format des Données
- Les tableaux avec en-têtes sont mieux reconnus
- Les données numériques sont automatiquement détectées
- Les dates au format standard (DD/MM/YYYY)

## Messages d'Erreur Courants

### "Aucun fichier PDF uploadé"
**Cause** : Le fichier n'a pas été correctement sélectionné
**Solution** : Cliquer à nouveau sur "Import PDF" et sélectionner le fichier

### "Aucun tableau détecté"
**Cause** : Le PDF ne contient pas de données structurées en tableau
**Solution** : 
- Vérifier que le PDF contient bien un tableau
- Essayer avec "Import Image (OCR)" si c'est un scan
- Extraire manuellement les données

### "Erreur lors de l'extraction du PDF"
**Cause** : Problème serveur ou PDF corrompu
**Solution** :
1. Attendre 1-2 minutes (cold start Render)
2. Réessayer
3. Vérifier que le PDF n'est pas corrompu
4. Essayer avec un autre PDF

### Timeout (5 minutes)
**Cause** : Le serveur Render est en veille (cold start)
**Solution** :
1. Attendre la fin du timeout
2. Le serveur sera réveillé
3. Réessayer immédiatement après

## Alternatives

### Si l'extraction PDF ne fonctionne pas :

1. **Import Image (OCR)**
   - Prendre une capture d'écran du tableau PDF
   - Utiliser "Import Image (OCR)"
   - Temps : 30-60 secondes

2. **Copier-Coller dans Excel**
   - Ouvrir le PDF
   - Sélectionner le tableau
   - Copier dans Excel
   - Uploader le fichier Excel

3. **Conversion PDF → Excel en ligne**
   - Utiliser un convertisseur en ligne
   - Télécharger le fichier Excel
   - Uploader dans DataMatch

## Vérification du Déploiement

### Backend (Render)
```bash
# Vérifier que le serveur répond
curl https://datamatch-07wn.onrender.com/api/health
```

**Réponse attendue :**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123
}
```

### Frontend (Vercel)
- URL stable : https://client-elzeds-projects.vercel.app
- Vérifier que le bouton "Import PDF" est visible
- Vérifier que le clic ouvre le sélecteur de fichiers

## Logs de Débogage

### Côté Serveur (Render)
Les logs affichent :
```
Fichier reçu: document.pdf Type: application/pdf
Nouveau nom de fichier: 1234567890-document.pdf
```

### Côté Client (Console Navigateur)
```javascript
// Ouvrir la console (F12)
// Vérifier les requêtes réseau
// Onglet "Network" → Filtrer "extract-pdf"
```

## Support

Si le problème persiste après le redéploiement :
1. Vérifier les logs Render : https://dashboard.render.com/
2. Vérifier la console navigateur (F12)
3. Tester avec un PDF simple (1 page, 1 tableau)
4. Attendre 5 minutes complètes pour le cold start

## Statut Actuel

✅ **Code corrigé et déployé**
- Commit : "Fix: PDF extraction - accept PDF files in multer upload"
- Date : Maintenant
- Statut Render : En cours de redéploiement (2-3 minutes)

⏳ **Prochaine étape**
- Attendre la fin du déploiement Render
- Tester l'extraction PDF
- Vérifier que tout fonctionne
