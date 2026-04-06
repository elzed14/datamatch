# Modèles de TCD Prédéfinis - DataMatch

## Nouvelle Fonctionnalité 🎯

L'application propose maintenant des **modèles de Tableaux Croisés Dynamiques (TCD) prédéfinis** qui s'adaptent automatiquement à vos données.

## Fonctionnement

### 1. Détection Intelligente
Lorsque vous accédez à l'onglet "Pivot Tables (TCD)", l'application :
- ✅ Analyse automatiquement les colonnes de votre fichier
- ✅ Identifie les modèles de TCD compatibles
- ✅ Affiche un score de compatibilité pour chaque modèle
- ✅ Recommande les meilleurs modèles en premier

### 2. Modèles Disponibles

#### 📊 Ventes par Client
- **Description** : Analyse du CA par client
- **Colonnes recherchées** : Client, Nom, CA, Chiffre d'affaires, Montant, Prime
- **Configuration** :
  - Lignes : Client/Nom
  - Valeurs : CA, Montant, Prime (Somme)

#### 📅 Ventes par Période
- **Description** : Évolution temporelle des ventes
- **Colonnes recherchées** : Date, Mois, Année, Période, CA, Montant
- **Configuration** :
  - Lignes : Date/Mois/Année
  - Valeurs : CA, Montant (Somme)

#### 🏷️ Analyse Produits
- **Description** : Performance par produit/catégorie
- **Colonnes recherchées** : Produit, Catégorie, Type, CA, Quantité
- **Configuration** :
  - Lignes : Produit/Catégorie/Type
  - Valeurs : CA, Quantité (Somme)

#### 🗺️ Analyse Géographique
- **Description** : Répartition par région/ville
- **Colonnes recherchées** : Région, Ville, Pays, Département, CA, Montant
- **Configuration** :
  - Lignes : Région/Ville/Pays
  - Valeurs : CA, Montant (Somme)

#### 🔄 Comparaison Statuts
- **Description** : Analyse par statut de présence (après fusion)
- **Colonnes recherchées** : Statut, Présence, CA, Montant, Évolution
- **Configuration** :
  - Lignes : Statut
  - Valeurs : CA, Montant, Évolution (Somme)

#### 🛡️ Analyse Assurances
- **Description** : Suivi des polices et primes
- **Colonnes recherchées** : Police, Contrat, Prime, Assuré, Courtier
- **Configuration** :
  - Lignes : Police/Assuré/Courtier
  - Valeurs : Prime, Montant (Somme)

#### ✨ TCD Personnalisé
- **Description** : Créez votre propre analyse de zéro
- **Configuration** : Vide, à configurer manuellement

## Utilisation

### Étape 1 : Sélection du Modèle
1. Accédez à l'onglet "Pivot Tables (TCD)"
2. Consultez les modèles suggérés avec leur score de compatibilité
3. Cliquez sur le modèle qui correspond le mieux à votre besoin
4. Le TCD est automatiquement configuré avec les colonnes détectées

### Étape 2 : Personnalisation (Optionnel)
Après avoir appliqué un modèle, vous pouvez :
- ✅ Glisser-déposer des champs pour modifier la configuration
- ✅ Ajouter ou retirer des colonnes
- ✅ Changer le type d'agrégation (Somme, Moyenne, Max, Min, Nombre)
- ✅ Réorganiser les lignes et colonnes

### Étape 3 : Génération
1. Cliquez sur "Actualiser le TCD"
2. Visualisez les résultats
3. Exportez en Excel si nécessaire

## Avantages

### 🚀 Gain de Temps
- Plus besoin de configurer manuellement chaque TCD
- Configuration automatique basée sur vos données
- Modèles prêts à l'emploi pour les cas d'usage courants

### 🎯 Précision
- Détection intelligente des colonnes pertinentes
- Score de compatibilité pour chaque modèle
- Recommandations basées sur le contenu réel de vos fichiers

### 🔧 Flexibilité
- Tous les modèles sont modifiables
- Possibilité de créer un TCD personnalisé
- Drag & drop pour ajuster la configuration

### 📊 Cas d'Usage Métier
- Analyse de ventes
- Suivi de performance
- Comparaison temporelle
- Analyse géographique
- Suivi d'assurances/contrats

## Exemple d'Utilisation

### Scénario : Analyse après Fusion
Vous avez fusionné deux fichiers de CA (N-1 et N) :

1. **Colonnes disponibles** :
   - Police
   - Client
   - CA (N-1)
   - CA (N)
   - Évolution CA (+/-)
   - Évolution CA (%)
   - Statut de présence

2. **Modèle recommandé** : "🔄 Comparaison Statuts"
   - Score : 5 matches
   - Configuration automatique :
     - Lignes : Statut de présence
     - Valeurs : CA (N-1), CA (N), Évolution CA

3. **Résultat** :
   ```
   | Statut              | CA (N-1)  | CA (N)    | Évolution CA |
   |---------------------|-----------|-----------|--------------|
   | Maintenu            | 1 500 000 | 1 650 000 | +150 000     |
   | Résilié             | 300 000   | 0         | -300 000     |
   | Affaire Nouvelle    | 0         | 450 000   | +450 000     |
   ```

## Personnalisation Avancée

Après avoir appliqué un modèle, vous pouvez :

1. **Ajouter des filtres** (bientôt disponible)
2. **Créer des colonnes calculées**
3. **Modifier les agrégations** :
   - Somme (par défaut)
   - Moyenne
   - Maximum
   - Minimum
   - Nombre d'occurrences

4. **Réorganiser l'affichage** :
   - Glisser des champs de "Lignes" vers "Colonnes"
   - Ajouter plusieurs niveaux de regroupement
   - Combiner plusieurs valeurs

## Conseils

- 💡 Commencez toujours par un modèle suggéré avec un score élevé
- 💡 Utilisez "Comparaison Statuts" après une fusion pour analyser les évolutions
- 💡 Combinez plusieurs valeurs pour une analyse complète
- 💡 Exportez en Excel pour des analyses plus poussées avec Excel

## Prochaines Améliorations

- 🔜 Filtres dynamiques sur les TCD
- 🔜 Sauvegarde de modèles personnalisés
- 🔜 Graphiques automatiques basés sur les TCD
- 🔜 Suggestions de TCD basées sur l'historique
