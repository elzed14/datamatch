# Guide de démarrage rapide - DataMatch

## Problème d'importation résolu

Les corrections suivantes ont été apportées:

1. **Configuration CORS améliorée** - Le serveur accepte maintenant explicitement les requêtes depuis localhost:5173
2. **Validation des fichiers** - Multer vérifie maintenant le type et la taille des fichiers (max 50MB)
3. **Logs détaillés** - Ajout de logs côté client et serveur pour faciliter le débogage
4. **Gestion d'erreurs améliorée** - Messages d'erreur plus explicites

## Démarrage de l'application

### Option 1: Utiliser les scripts batch (Windows)

1. **Démarrer le serveur** (dans un terminal):
   ```
   start-server.bat
   ```

2. **Démarrer le client** (dans un autre terminal):
   ```
   start-client.bat
   ```

### Option 2: Démarrage manuel

1. **Terminal 1 - Serveur**:
   ```bash
   cd server
   npm install
   npm run dev
   ```
   Le serveur démarre sur http://localhost:3001

2. **Terminal 2 - Client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Le client démarre sur http://localhost:5173

## Vérification

1. Ouvrez http://localhost:5173 dans votre navigateur
2. Vérifiez que le serveur affiche "Serveur démarré sur http://localhost:3001"
3. Essayez d'importer un fichier Excel (.xlsx ou .xls)
4. Ouvrez la console du navigateur (F12) pour voir les logs détaillés

## Débogage

Si l'importation ne fonctionne toujours pas:

1. **Vérifiez que le serveur est démarré**:
   - Vous devriez voir "Serveur démarré sur http://localhost:3001" dans le terminal
   
2. **Vérifiez la console du navigateur** (F12):
   - Recherchez les messages d'erreur en rouge
   - Vérifiez les logs "Tentative d'upload" et "Réponse reçue"

3. **Vérifiez le terminal du serveur**:
   - Recherchez "Uploaded file:" quand vous uploadez un fichier
   - Vérifiez les erreurs éventuelles

4. **Testez la connexion au serveur**:
   - Ouvrez http://localhost:3001 dans votre navigateur
   - Vous devriez voir une erreur "Cannot GET /" (c'est normal, ça prouve que le serveur fonctionne)

## Formats de fichiers supportés

- .xlsx (Excel 2007+)
- .xls (Excel 97-2003)
- .csv (Comma Separated Values)
- Taille maximale: 50MB

## Dossier uploads

Les fichiers uploadés sont stockés dans `server/uploads/`
