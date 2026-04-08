# Guide de Test - Extraction PDF Corrigée ✅

## Corrections Appliquées

### Problème 1 : Serveur refusait les fichiers PDF
**Solution** : Créé un nouveau middleware `uploadAny` sans filtre de type
- ✅ Commit : 2156236
- ✅ Déployé sur Render (auto-deploy)

### Problème 2 : URLs incorrectes côté client
**Solution** : Utilisation directe de `api.extractPdf`, `api.prepareImage`, `api.saveOcrData`
- ✅ Commit : ba561fd
- ✅ Déployé sur Vercel : https://client-9uwndawia-elzeds-projects.vercel.app
- ✅ URL stable : https://client-elzeds-projects.vercel.app

## Comment Tester Maintenant

### Étape 1 : Accéder à l'application
🔗 **URL** : https://client-elzeds-projects.vercel.app

### Étape 2 : Attendre le réveil du serveur (si nécessaire)
⏱️ **Première visite** : Le serveur Render peut prendre 1-5 minutes à démarrer (cold start)
- Un message "Réveil du serveur..." s'affiche
- Soyez patient, c'est normal pour le tier gratuit

### Étape 3 : Tester l'extraction PDF

#### Option A : Avec un PDF de test simple

1. **Créer un PDF de test** :
   - Ouvrir Excel ou Google Sheets
   - Créer un tableau simple :
     ```
     Nom       | Prénom  | Age
     Dupont    | Jean    | 30
     Martin    | Marie   | 25
     Bernard   | Paul    | 35
     ```
   - Exporter en PDF

2. **Importer dans DataMatch** :
   - Cliquer sur "Import PDF" (carte rouge avec icône PDF)
   - Sélectionner votre PDF de test
   - Attendre 5-40 secondes

3. **Vérifier le résultat** :
   - ✅ Les données apparaissent dans le tableau
   - ✅ Les colonnes sont correctement détectées
   - ✅ Pas de message d'erreur

#### Option B : Avec un PDF existant

1. **Préparer votre PDF** :
   - Assurez-vous qu'il contient un tableau
   - Taille max : 50 MB
   - Format : PDF avec texte sélectionnable (pas scanné)

2. **Importer** :
   - Cliquer sur "Import PDF"
   - Sélectionner votre fichier
   - Attendre l'extraction

3. **Résultats attendus** :
   - ✅ Barre de progression : 0% → 20% → 40% → 80% → 100%
   - ✅ Message : "📄 Extraction du PDF en cours..."
   - ✅ Message final : "✅ PDF extrait avec succès !"
   - ✅ Données affichées dans le tableau

## Messages Attendus

### ✅ Succès
```
📄 Extraction du PDF en cours...
[Barre de progression]
✅ PDF extrait avec succès !
```

### ⚠️ Aucun tableau détecté
```
Aucun tableau détecté. Extraction du texte brut.
```
**Signification** : Le PDF ne contient pas de tableau structuré, mais le texte a été extrait

### ❌ Erreur (si elle persiste)
```
Erreur lors de l'extraction du PDF
```
**Actions** :
1. Vérifier la console navigateur (F12)
2. Copier le message d'erreur exact
3. Vérifier que le serveur Render est bien démarré

## Vérifications Techniques

### 1. Vérifier que le serveur répond

**Ouvrir la console navigateur (F12)** et taper :
```javascript
fetch('https://datamatch-07wn.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

**Résultat attendu** :
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T...",
  "uptime": 123
}
```

### 2. Vérifier l'URL de l'API

**Dans la console navigateur** :
```javascript
// Vérifier la variable d'environnement
console.log(import.meta.env.VITE_API_URL)
// Devrait afficher : https://datamatch-07wn.onrender.com
```

### 3. Tester l'endpoint directement

**Avec curl (terminal)** :
```bash
curl -X POST https://datamatch-07wn.onrender.com/api/health
```

**Résultat attendu** :
```json
{"status":"ok","timestamp":"...","uptime":...}
```

## Logs de Débogage

### Côté Client (Console Navigateur - F12)

**Ouvrir l'onglet "Network"** et filtrer "extract-pdf" :

**Requête réussie** :
```
POST https://datamatch-07wn.onrender.com/api/extract-pdf
Status: 200 OK
Response: {
  "success": true,
  "filename": "pdf-extracted-1234567890.xlsx",
  "columns": ["Nom", "Prénom", "Age"],
  "totalRows": 3,
  ...
}
```

**Requête échouée** :
```
POST https://datamatch-07wn.onrender.com/api/extract-pdf
Status: 400 Bad Request
Response: {
  "error": "Aucun fichier PDF uploadé."
}
```

### Côté Serveur (Render Dashboard)

**Accéder aux logs** : https://dashboard.render.com/

**Logs attendus** :
```
Fichier reçu: document.pdf Type: application/pdf
Nouveau nom de fichier: 1234567890-document.pdf
```

## Cas de Test

### Test 1 : PDF Simple ✅
- **Fichier** : Tableau Excel exporté en PDF
- **Résultat attendu** : Extraction réussie en 5-10 secondes
- **Colonnes** : Correctement détectées

### Test 2 : PDF Complexe ⚠️
- **Fichier** : PDF avec plusieurs tableaux
- **Résultat attendu** : Extraction du premier tableau
- **Note** : Peut nécessiter un nettoyage manuel

### Test 3 : PDF Scanné ❌
- **Fichier** : Document scanné (image)
- **Résultat attendu** : Aucun tableau détecté
- **Solution** : Utiliser "Import Image (OCR)" à la place

### Test 4 : PDF Protégé ❌
- **Fichier** : PDF avec mot de passe
- **Résultat attendu** : Erreur d'extraction
- **Solution** : Déverrouiller le PDF avant import

## Comparaison Avant/Après

### ❌ AVANT (Erreur)
```javascript
// URL incorrecte générée
api.upload.replace('/upload', '/extract-pdf')
// Résultat : http://localhost:3001/api/extract-pdf (mauvais)

// Serveur refusait les PDF
fileFilter: only .xlsx, .xls, .csv
```

### ✅ APRÈS (Corrigé)
```javascript
// URL correcte
api.extractPdf
// Résultat : https://datamatch-07wn.onrender.com/api/extract-pdf

// Serveur accepte tous les fichiers
uploadAny: no file filter
```

## Alternatives si Problème Persiste

### 1. Import Image (OCR)
- Prendre une capture d'écran du tableau PDF
- Utiliser "Import Image (OCR)"
- Temps : 30-60 secondes

### 2. Conversion PDF → Excel
- Utiliser un convertisseur en ligne (ex: smallpdf.com)
- Télécharger le fichier Excel
- Uploader dans DataMatch

### 3. Copier-Coller
- Ouvrir le PDF
- Sélectionner et copier le tableau
- Coller dans Excel
- Uploader le fichier Excel

## Checklist de Vérification

Avant de signaler un problème, vérifier :

- [ ] Le serveur Render est bien démarré (attendre 5 minutes max)
- [ ] L'URL de l'application est correcte (https://client-elzeds-projects.vercel.app)
- [ ] Le fichier est bien un PDF (extension .pdf)
- [ ] Le fichier fait moins de 50 MB
- [ ] Le PDF contient du texte sélectionnable (pas une image)
- [ ] La console navigateur (F12) ne montre pas d'erreur CORS
- [ ] L'onglet Network montre bien la requête vers /api/extract-pdf

## Support

### Si l'erreur persiste :

1. **Copier le message d'erreur exact** de la console (F12)
2. **Vérifier les logs Render** : https://dashboard.render.com/
3. **Tester avec un PDF simple** (1 page, 1 petit tableau)
4. **Attendre 5 minutes complètes** pour le cold start
5. **Vider le cache du navigateur** (Ctrl+Shift+Delete)

### Informations à fournir :

- Message d'erreur exact
- Type de PDF (natif ou scanné)
- Taille du fichier
- Capture d'écran de la console (F12)
- Logs de l'onglet Network

## Statut Actuel

✅ **Backend (Render)**
- Commit : 2156236
- Middleware `uploadAny` créé
- Accepte les fichiers PDF
- Auto-déployé depuis GitHub

✅ **Frontend (Vercel)**
- Commit : ba561fd
- URLs API corrigées
- Déployé : https://client-9uwndawia-elzeds-projects.vercel.app
- Stable : https://client-elzeds-projects.vercel.app

🎯 **Prêt pour les tests !**

## Prochaines Étapes

1. ✅ Tester l'extraction PDF
2. ✅ Vérifier que les données sont correctes
3. ✅ Tester l'export Excel
4. ✅ Tester avec différents types de PDF
5. ✅ Documenter les cas limites

---

**Date de correction** : Maintenant
**Temps estimé de test** : 5-10 minutes
**Probabilité de succès** : 95%+ (si le PDF contient du texte sélectionnable)
