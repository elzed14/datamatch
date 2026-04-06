# DataMatch - Application de gestion et analyse de données

## Description
DataMatch est une application web permettant d'importer, fusionner, analyser et visualiser des données Excel avec des fonctionnalités avancées de Power Query, Tableaux Croisés Dynamiques (TCD) et Dashboard.

## Corrections effectuées

### Client
1. **Configuration des alias de chemin**
   - Ajout de la configuration des alias dans `vite.config.ts` pour utiliser `@/` comme raccourci vers `src/`
   - Mise à jour de `tsconfig.app.json` pour reconnaître les alias TypeScript

2. **Dépendances**
   - Ajout des dépendances manquantes :
     - `@dnd-kit/core` pour le drag & drop
     - `@radix-ui/react-slot` pour les composants UI
     - `class-variance-authority` pour les variantes de composants
     - `clsx` et `tailwind-merge` pour la gestion des classes CSS
     - `leaflet` et `react-leaflet` pour les cartes géographiques
     - `recharts` pour les graphiques
   - Ajout des dépendances de développement :
     - `tailwindcss`, `autoprefixer`, `postcss` pour le styling
     - `@types/leaflet` pour les types TypeScript

3. **Configuration Tailwind CSS**
   - Création de `tailwind.config.js` avec la configuration de base
   - Création de `postcss.config.js` pour le traitement CSS
   - Ajout des directives Tailwind dans `index.css`

4. **Mise à jour des imports**
   - Standardisation des imports pour utiliser les alias `@/` dans tous les composants

### Serveur
- Le serveur est correctement configuré avec toutes les routes API nécessaires
- Les fonctionnalités de fusion, nettoyage et analyse des données sont opérationnelles

## Installation et lancement

### Prérequis
- Node.js (version 18 ou supérieure)
- npm ou yarn

### Installation des dépendances

**Client :**
```bash
cd client
npm install
```

**Serveur :**
```bash
cd server
npm install
```

### Lancement de l'application

**Serveur (dans un terminal) :**
```bash
cd server
npm run dev
```

**Client (dans un autre terminal) :**
```bash
cd client
npm run dev
```

L'application sera accessible à l'adresse : http://localhost:5173

## Structure du projet

```
DataMatch/
├── client/              # Application React
│   ├── src/
│   │   ├── components/  # Composants React
│   │   │   ├── ui/      # Composants UI réutilisables
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── ExportButton.tsx
│   │   │   ├── GeoMap.tsx
│   │   │   ├── MappingModule.tsx
│   │   │   ├── MergeModule.tsx
│   │   │   ├── PivotBuilder.tsx
│   │   │   └── UploadZone.tsx
│   │   ├── lib/        # Utilitaires
│   │   └── App.tsx     # Composant principal
│   └── package.json
└── server/             # API Express
    ├── src/
    │   └── index.ts    # Point d'entrée du serveur
    └── package.json
```

## Fonctionnalités

1. **Import Excel** : Upload et prévisualisation de fichiers Excel
2. **Power Query & Merge** : Fusion de fichiers avec gestion des clés de jointure
3. **Mapping & Colonnes** : Configuration et nettoyage des colonnes
4. **Tableaux Croisés Dynamiques** : Création de TCD avec drag & drop
5. **Dashboard** : Visualisation des données avec graphiques et cartes
6. **Export** : Export des résultats en Excel

## Développement

Pour le développement, il est recommandé d'utiliser :
- VS Code avec l'extension ESLint
- Les outils de développement du navigateur pour le débogage
- Les logs console pour le suivi des opérations

## Notes

- Le serveur écoute sur le port 3001
- Le client utilise le port 5173 (par défaut avec Vite)
- Les fichiers uploadés sont stockés dans `server/uploads/`
