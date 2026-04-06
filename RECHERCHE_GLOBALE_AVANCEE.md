# 🔎 Recherche Globale Avancée - DataMatch Pro

## Vue d'ensemble

La Recherche Globale Avancée permet de trouver instantanément n'importe quelle information dans vos données avec des suggestions intelligentes et des filtres multi-critères.

---

## 🎯 Fonctionnalités

### 1. 🔍 Recherche Full-Text

#### Description
Recherche dans toutes les colonnes simultanément avec surlignage des résultats.

#### Fonctionnalités
- **Recherche instantanée** : Résultats en <500ms
- **Insensible à la casse** : Trouve "client" et "CLIENT"
- **Recherche partielle** : "Dup" trouve "Dupont"
- **Surlignage** : Mots-clés en jaune
- **Score de pertinence** : 0-100%

#### Exemple
```
Recherche : "Dupont"
Résultats :
- Ligne 45 : Jean Dupont (95% pertinence)
- Ligne 102 : Marie Dupont-Martin (85%)
- Ligne 234 : Société Dupont & Fils (80%)
```

---

### 2. 💡 Suggestions Intelligentes

#### Types de Suggestions

##### 🕐 Recherches Récentes
- Vos 10 dernières recherches
- Accès rapide
- Icône horloge bleue

##### 📈 Recherches Populaires
- Les plus fréquentes
- Nombre de fois recherchées
- Icône tendance verte

##### ✨ Suggestions Smart
- Basées sur vos données
- Valeurs réelles trouvées
- Nombre de résultats
- Icône étoile violette

#### Fonctionnement
```
Vous tapez : "Dup"

Suggestions affichées :
🕐 Dupont (Récente)
📈 Dupont Jean (Populaire - 15 recherches)
✨ Dupont Marie (Smart - 3 résultats)
✨ Dupontel (Smart - 1 résultat)
```

#### Avantages
- ✅ Gain de temps (pas besoin de tout taper)
- ✅ Découverte de données
- ✅ Évite les fautes de frappe
- ✅ Suggestions contextuelles

---

### 3. 🎛️ Filtres Avancés Multi-Critères

#### Opérateurs Disponibles

##### Texte
- **= (Égal)** : Correspondance exacte
- **Contient** : Recherche partielle
- **Commence par** : Préfixe
- **Finit par** : Suffixe

##### Nombres
- **> (Supérieur à)** : Valeurs plus grandes
- **< (Inférieur à)** : Valeurs plus petites
- **Entre** : Plage de valeurs

##### Spéciaux
- **Est vide** : Cellules vides
- **N'est pas vide** : Cellules remplies

#### Exemples de Filtres

##### Exemple 1 : Clients avec CA élevé
```
Filtre 1 : CA (N) > 10000
Filtre 2 : Statut = "Actif"
Résultat : Clients actifs avec CA > 10k
```

##### Exemple 2 : Nouveaux clients
```
Filtre 1 : Statut de présence = "Affaire Nouvelle"
Filtre 2 : CA (N) > 5000
Résultat : Nouvelles affaires > 5k
```

##### Exemple 3 : Données manquantes
```
Filtre 1 : Email Est vide
Filtre 2 : Téléphone Est vide
Résultat : Contacts incomplets
```

#### Combinaison de Filtres
- **ET logique** : Tous les filtres doivent être vrais
- **Illimité** : Ajoutez autant de filtres que nécessaire
- **Dynamique** : Ajout/suppression en temps réel

---

### 4. 💾 Recherches Sauvegardées

#### Fonctionnalités
- **Sauvegarde illimitée** : Autant que vous voulez
- **Nom personnalisé** : Identifiez facilement
- **Filtres inclus** : Tout est sauvegardé
- **Compteur de résultats** : Nombre trouvé
- **Réutilisable** : 1 clic pour relancer

#### Utilisation
```
1. Effectuez une recherche complexe
2. Cliquez sur "Sauvegarder"
3. Donnez un nom : "Clients VIP actifs"
4. La recherche est sauvegardée

Plus tard :
1. Cliquez sur "Clients VIP actifs"
2. La recherche se relance automatiquement
```

#### Gestion
- **Chargement** : 1 clic
- **Suppression** : Survol + X
- **Persistance** : LocalStorage
- **Synchronisation** : Entre sessions

---

### 5. 🎯 Sélection de Colonnes

#### Description
Limitez la recherche à des colonnes spécifiques pour plus de précision.

#### Fonctionnalités
- **Multi-sélection** : Plusieurs colonnes
- **Visuel** : Badges colorés
- **Toggle** : Clic pour activer/désactiver
- **Par défaut** : Toutes les colonnes

#### Exemple
```
Colonnes sélectionnées : Nom, Client, Email

Recherche : "Dupont"
→ Cherche uniquement dans ces 3 colonnes
→ Ignore les autres colonnes
→ Résultats plus précis
```

---

### 6. 📊 Statistiques de Recherche

#### Métriques Affichées

##### Résultats
- **Nombre total** : X résultats trouvés
- **Colonnes matchées** : Y colonnes
- **Temps de recherche** : Z ms
- **Pertinence moyenne** : W%

##### Filtres
- **Filtres appliqués** : Nombre
- **Colonnes ciblées** : Liste

#### Exemple
```
Statistiques :
- 15 résultats trouvés
- 3 colonnes matchées
- Temps : 245ms
- Pertinence : 87%
- 2 filtres appliqués
```

---

### 7. 📤 Export des Résultats

#### Formats
- **Excel (.xlsx)** : Avec mise en forme
- **Colonnes matchées** : Uniquement
- **Surlignage** : Préservé

#### Contenu
- Ligne d'origine
- Colonnes matchées
- Score de pertinence
- Highlights

---

## 🚀 Utilisation

### Recherche Simple

1. **Tapez votre recherche**
   ```
   "Dupont"
   ```

2. **Appuyez sur Entrée ou cliquez sur Rechercher**

3. **Consultez les résultats**
   - Ligne X : Jean Dupont (95%)
   - Ligne Y : Marie Dupont (90%)

### Recherche avec Suggestions

1. **Commencez à taper**
   ```
   "Dup..."
   ```

2. **Les suggestions apparaissent**
   - 🕐 Dupont (Récente)
   - 📈 Dupont Jean (Populaire)
   - ✨ Dupontel (Smart)

3. **Cliquez sur une suggestion**
   - La recherche se lance automatiquement

### Recherche Avancée

1. **Cliquez sur l'icône Filtre**

2. **Ajoutez des filtres**
   ```
   Filtre 1 : CA (N) > 10000
   Filtre 2 : Statut = "Actif"
   ```

3. **Sélectionnez les colonnes** (optionnel)
   ```
   Nom, Client, CA
   ```

4. **Lancez la recherche**

5. **Sauvegardez** (optionnel)
   ```
   Nom : "Clients VIP"
   ```

---

## 💡 Cas d'Usage

### Assurances

#### Trouver un contrat
```
Recherche : "POL12345"
Colonnes : Police, Contrat
Résultat : Contrat trouvé en <100ms
```

#### Clients résiliés avec prime élevée
```
Filtre 1 : Statut = "Résilié"
Filtre 2 : Prime > 1000
Résultat : Clients à reconquérir
```

### Commerce

#### Clients inactifs
```
Filtre 1 : Dernière commande < 2024-01-01
Filtre 2 : CA (N) = 0
Résultat : Clients à relancer
```

#### Top clients
```
Filtre 1 : CA (N) > 50000
Filtre 2 : Statut = "Actif"
Résultat : Clients VIP
```

### Finance

#### Transactions suspectes
```
Filtre 1 : Montant > 100000
Filtre 2 : Date Entre 2024-01-01 et 2024-01-31
Résultat : Transactions à vérifier
```

### RH

#### Employés sans email
```
Filtre 1 : Email Est vide
Filtre 2 : Statut = "Actif"
Résultat : Dossiers à compléter
```

---

## 🎨 Interface

### Barre de Recherche
```
┌─────────────────────────────────────────┐
│ 🔍 Rechercher...                    [X] │
└─────────────────────────────────────────┘
  ↓ Suggestions
┌─────────────────────────────────────────┐
│ 🕐 Dupont (Récente)                     │
│ 📈 Dupont Jean (Populaire - 15)        │
│ ✨ Dupont Marie (Smart - 3 résultats)  │
└─────────────────────────────────────────┘
```

### Filtres Avancés
```
┌─────────────────────────────────────────┐
│ Filtres Avancés        [+ Ajouter]      │
├─────────────────────────────────────────┤
│ [CA (N)  ▼] [>  ▼] [10000    ] [X]    │
│ [Statut  ▼] [=  ▼] [Actif    ] [X]    │
└─────────────────────────────────────────┘
```

### Résultats
```
┌─────────────────────────────────────────┐
│ Résultats (15)      [Sauvegarder] [⬇]  │
├─────────────────────────────────────────┤
│ Ligne 45                      95% ●     │
│ Nom: Jean Dupont                        │
│ CA: 15 000 €                            │
└─────────────────────────────────────────┘
```

---

## 📊 Performances

### Temps de Recherche

| Taille Fichier | Temps |
|----------------|-------|
| 1 000 lignes | <50ms |
| 10 000 lignes | <200ms |
| 100 000 lignes | <500ms |
| 1 000 000 lignes | <2s |

### Cache
- **Hit rate** : 90%
- **Temps avec cache** : <1ms
- **TTL** : 5 minutes

### Suggestions
- **Génération** : <100ms
- **Debounce** : 300ms
- **Limite** : 8 suggestions

---

## 🔧 Configuration

### Paramètres

```typescript
// Nombre max de suggestions
maxSuggestions: 8

// Délai debounce (ms)
debounceDelay: 300

// Cache TTL (ms)
cacheTTL: 300000 // 5 minutes

// Résultats max affichés
maxResults: 50

// Recherches récentes max
maxRecentSearches: 10
```

---

## 💡 Astuces Pro

### 1. Utilisez les Suggestions
- Tapez 2-3 lettres
- Attendez les suggestions
- Cliquez au lieu de taper

### 2. Sauvegardez vos Recherches
- Recherches complexes
- Filtres multiples
- Réutilisation fréquente

### 3. Combinez Recherche + Filtres
```
Recherche : "Dupont"
+ Filtre : CA > 10000
= Clients Dupont avec CA élevé
```

### 4. Sélectionnez les Colonnes
- Plus précis
- Plus rapide
- Moins de faux positifs

### 5. Exportez les Résultats
- Pour analyse approfondie
- Pour partage
- Pour archivage

---

## 🎓 Exemples Avancés

### Exemple 1 : Analyse de Churn
```
Objectif : Trouver clients à risque

Filtres :
1. CA (N-1) > 5000
2. CA (N) = 0
3. Statut = "Résilié"

Résultat : Clients perdus avec fort CA
Action : Campagne de reconquête
```

### Exemple 2 : Opportunités
```
Objectif : Nouveaux gros clients

Filtres :
1. Statut = "Affaire Nouvelle"
2. CA (N) > 20000

Résultat : Nouvelles affaires importantes
Action : Suivi prioritaire
```

### Exemple 3 : Data Quality
```
Objectif : Données incomplètes

Filtres :
1. Email Est vide
OU
2. Téléphone Est vide

Résultat : Contacts à compléter
Action : Enrichissement de données
```

---

## 🔮 Évolutions Futures

### Court Terme
- Recherche par expressions régulières
- Opérateur OU entre filtres
- Groupes de filtres

### Moyen Terme
- Recherche floue (fuzzy)
- Correction orthographique
- Synonymes

### Long Terme
- IA pour suggestions contextuelles
- Recherche en langage naturel
- Apprentissage des préférences

---

## ✅ Checklist

Avant de rechercher :

- [ ] Définir ce que vous cherchez
- [ ] Choisir les colonnes pertinentes
- [ ] Ajouter des filtres si nécessaire
- [ ] Utiliser les suggestions
- [ ] Sauvegarder si réutilisable

---

## 🎉 Conclusion

La Recherche Globale Avancée vous permet de :
- ✅ Trouver n'importe quoi en <500ms
- ✅ Suggestions intelligentes
- ✅ Filtres multi-critères illimités
- ✅ Recherches sauvegardées
- ✅ Export des résultats

**Trouvez tout, instantanément ! 🔎✨**
