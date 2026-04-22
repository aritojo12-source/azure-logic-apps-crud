# Architecture Serverless avec Azure Logic Apps
### API REST CRUD — Projet académique · Livraison 22 avril 2026

![CI/CD](https://github.com/aritojo12-source/azure-logic-apps-crud/actions/workflows/ci-cd.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-26%20passing-brightgreen)
![Node](https://img.shields.io/badge/node-18%20LTS-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## C'est quoi ce projet ?

Ce projet construit une **API REST complète** qui permet de gérer des données (créer, lire, modifier, supprimer) en utilisant **Microsoft Azure Logic Apps** — une technologie dite "serverless" où on n'a pas besoin de gérer un serveur.

> **Serverless = sans serveur à gérer.** Microsoft Azure s'occupe automatiquement de tout — démarrage, scalabilité, maintenance. On ne paye que ce qu'on utilise.

### Ce que l'API permet de faire

- Créer un item (nom + prix)
- Lister tous les items
- Lire un item par son ID
- Modifier un item existant
- Supprimer un item

### Statut du pipeline CI/CD

| Étape                       | Résultat |
|-----------------------------|----------|
| Tests Jest (26 tests)       | ✅ Passé |
| Build Docker                | ✅ Passé |
| Déploiement staging         | ✅ Passé |
| Validation workflows JSON   | ✅ Passé |
| Rapport final               | ✅ Passé |

---

## Table des matières

1. [Architecture du projet](#1-architecture-du-projet)
2. [Les données gérées (modèle Item)](#2-les-données-gérées-modèle-item)
3. [Ce dont vous avez besoin](#3-ce-dont-vous-avez-besoin)
4. [Comment installer et démarrer](#4-comment-installer-et-démarrer)
5. [Structure des fichiers](#5-structure-des-fichiers)
6. [Les routes de l'API (endpoints)](#6-les-routes-de-lapi-endpoints)
7. [Les workflows Azure Logic Apps](#7-les-workflows-azure-logic-apps)
8. [Les tests automatisés](#8-les-tests-automatisés)
9. [La collection Postman](#9-la-collection-postman)
10. [Le pipeline CI/CD GitHub Actions](#10-le-pipeline-cicd-github-actions)
11. [Déploiement sur Azure (production)](#11-déploiement-sur-azure-production)
12. [Pourquoi ces choix techniques ?](#12-pourquoi-ces-choix-techniques-)
13. [Guide d'utilisation](#13-guide-dutilisation)
14. [Maintenance et retour en arrière](#14-maintenance-et-retour-en-arrière)
15. [Problèmes fréquents et solutions](#15-problèmes-fréquents-et-solutions)
16. [Auteur](#16-auteur)

---

## 1. Architecture du projet

Voici comment fonctionne le projet de bout en bout :

```
┌─────────────────────────────────────┐
│           CLIENT HTTP               │
│     (Postman / curl / app)          │
└──────────────────┬──────────────────┘
                   │
                   │  Requête HTTPS + clé API (x-api-key)
                   │
                   ▼
┌─────────────────────────────────────┐
│        AZURE API MANAGEMENT         │
│  Vérifie la sécurité                │
│  Limite le nombre de requêtes       │
│  Génère la documentation auto       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              AZURE LOGIC APPS                       │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  CREATE  │ │   READ   │ │  UPDATE  │ │ DELETE │ │
│  │POST/items│ │GET /items│ │PUT /{id} │ │DEL/{id}│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│         AZURE TABLE STORAGE         │
│    Stocke les données en NoSQL      │
│    Table : "items"                  │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│           AZURE MONITOR             │
│  Logs · Alertes · Métriques         │
└─────────────────────────────────────┘
```

### En local vs en production

| Composant       | En local (sur votre PC)          | En production (Azure)          |
|-----------------|----------------------------------|--------------------------------|
| Serveur API     | Express.js sur port 3000         | Azure Logic Apps               |
| Base de données | Tableau en mémoire (fakeDB)      | Azure Table Storage            |
| Build Docker    | GitHub Actions (cloud gratuit)   | GitHub Actions → Azure         |
| Tests           | `npm test` sur votre PC          | GitHub Actions automatique     |
| Authentification| Clé API dans le fichier .env     | Azure API Management + secrets |

> **Pourquoi un environnement local ?**
> L'accès à Azure n'était pas disponible depuis Madagascar pendant le développement.
> Le serveur Express local reproduit exactement le même comportement que les Logic Apps.
> C'est l'approche officielle recommandée par Microsoft avec leur outil **Azurite**.

---

## 2. Les données gérées (modèle Item)

Un **Item** représente n'importe quelle ressource (produit, tâche, article…).

### Les champs d'un Item

| Champ        | Type     | Rempli par   | Description                       | Exemple                              |
|--------------|----------|--------------|-----------------------------------|--------------------------------------|
| `id`         | string   | Automatique  | Identifiant unique (GUID)         | `"a3f9b2c1-4d5e-6f7a-8b9c-0d1e2f3a"` |
| `name`       | string   | Vous         | Nom de l'item (obligatoire)       | `"Chaise ergonomique"`               |
| `price`      | number   | Vous         | Prix > 0 (obligatoire)            | `89.99`                              |
| `created_at` | string   | Automatique  | Date de création (format ISO)     | `"2026-04-18T10:00:00.000Z"`         |
| `updated_at` | string   | Automatique  | Date de modification (format ISO) | `"2026-04-20T14:30:00.000Z"`         |

### Règles importantes

- `name` : **obligatoire**, ne peut pas être vide
- `price` : **obligatoire**, doit être un nombre strictement supérieur à 0
- `id`, `created_at`, `updated_at` : générés automatiquement — vous n'avez pas à les fournir

### À quoi ressemble un Item complet

```json
{
  "id": "a3f9b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "name": "Chaise ergonomique",
  "price": 89.99,
  "created_at": "2026-04-18T10:00:00.000Z",
  "updated_at": "2026-04-18T10:00:00.000Z"
}
```

---

## 3. Ce dont vous avez besoin

### Sur votre machine (obligatoire)

| Outil       | Version | Téléchargement                      | À quoi ça sert                  |
|-------------|---------|-------------------------------------|---------------------------------|
| **Node.js** | 18 LTS  | https://nodejs.org                  | Lancer les tests en local       |
| **Git**     | 2.x     | https://git-scm.com                 | Envoyer le code sur GitHub      |
| **Postman** | Dernière| https://www.postman.com/downloads   | Tester l'API manuellement       |

> **Docker n'est PAS nécessaire sur votre machine.**
> Le build Docker se fait entièrement dans le cloud via **GitHub Actions** (gratuit).
> Cela évite d'alourdir votre PC.

### Compte GitHub (obligatoire)

- Créez un compte gratuit sur https://github.com
- Créez un dépôt nommé `azure-logic-apps-crud`

### Compte Azure (optionnel — seulement pour déployer)

- Un abonnement Azure actif (https://azure.microsoft.com/free — 200$ de crédit gratuit)
- Droits "Contributeur" sur le groupe de ressources

---

## 4. Comment installer et démarrer

### Étape 1 — Télécharger le projet

```bash
git clone https://github.com/aritojo12-source/azure-logic-apps-crud.git
cd azure-logic-apps-crud
```

### Étape 2 — Installer les dépendances

```bash
npm install
```

Cette commande installe automatiquement :
- `express` — le serveur HTTP
- `uuid` — pour générer des IDs uniques
- `jest` — pour les tests
- `supertest` — pour tester l'API

### Étape 3 — Créer le fichier de configuration

```bash
cp .env.example .env
```

Ouvrez le fichier `.env` et vérifiez son contenu :

```
API_KEY=mon-api-key-local-1234
PORT=3000
TABLE_NAME=items
```

> Ce fichier contient des valeurs par défaut qui fonctionnent directement en local.
> **Ne le partagez jamais** — il est listé dans `.gitignore` pour cette raison.

### Étape 4 — Démarrer le serveur

```bash
npm start
```

Vous devriez voir apparaître :

```
==================================================
🚀 API CRUD démarrée !
==================================================
📍 URL : http://localhost:3000/api
🔑 Clé API : mon-api-key-local-1234
==================================================
```

### Étape 5 — Vérifier que ça fonctionne

Ouvrez un terminal et tapez :

```bash
curl http://localhost:3000/api/items -H "x-api-key: mon-api-key-local-1234"
```

Réponse attendue : `[]` (tableau vide — normal, il n'y a pas encore d'items)

### Étape 6 — Lancer les tests

```bash
npm test
```

Résultat attendu :

```
PASS  tests/create.test.js   (9 tests)
PASS  tests/read.test.js     (6 tests)
PASS  tests/update.test.js   (6 tests)
PASS  tests/delete.test.js   (5 tests)

Tests : 26 passed, 26 total 
```

### Étape 7 — Envoyer sur GitHub (déclenche le CI/CD automatiquement)

```bash
git add .
git commit -m "mon premier commit"
git push origin main
```

Allez sur l'onglet **Actions** de votre dépôt GitHub — le pipeline se lance automatiquement.

---

## 5. Structure des fichiers

```
azure-logic-apps-crud/
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml          ← Pipeline CI/CD (4 jobs automatiques)
│
├── workflows/                 ← Les 4 workflows Azure Logic Apps
│   ├── create/
│   │   └── workflow.json      ← Logique de POST /items
│   ├── read/
│   │   └── workflow.json      ← Logique de GET /items et GET /items/:id
│   ├── update/
│   │   └── workflow.json      ← Logique de PUT /items/:id
│   └── delete/
│       └── workflow.json      ← Logique de DELETE /items/:id
│
├── tests/                     ← Tests automatisés
│   ├── create.test.js         ← 9 tests pour la création
│   ├── read.test.js           ← 6 tests pour la lecture
│   ├── update.test.js         ← 6 tests pour la modification
│   └── delete.test.js         ← 5 tests pour la suppression
│
├── postman-collection.json        ← Collection Postman prête à importer
│
├── server-simple.js           ← Serveur local (remplace Logic Apps en local)
├── jest.config.js             ← Configuration des tests
├── package.json               ← Dépendances du projet
├── .env.example               ← Modèle pour le fichier .env
├── .gitignore                 ← Fichiers ignorés par Git
└── README.md                  ← Ce fichier
```

### À quoi servent les fichiers importants ?

**`server-simple.js`**
C'est le cœur du projet en local. Il imite exactement le comportement des workflows Azure Logic Apps : il vérifie la clé API, valide les données, génère des IDs uniques, et retourne les bonnes réponses HTTP.

**`workflows/*/workflow.json`**
Ce sont les vrais workflows Azure Logic Apps au format JSON officiel. En production, ces fichiers sont déployés directement sur Azure. Ils respectent le schéma Microsoft officiel.

**`ci-cd.yml`**
C'est le script qui dit à GitHub quoi faire automatiquement à chaque `git push` : lancer les tests, construire Docker, déployer.

---

## 6. Les routes de l'API (endpoints)

**Adresse de base (en local) :** `http://localhost:3000/api`

**Important :** toutes les requêtes doivent avoir ce header :
```
x-api-key: mon-api-key-local-1234
```
Sans ce header, l'API répond `401 Unauthorized`.

---

### Créer un item — POST /items

**Ce que ça fait :** crée un nouvel item et retourne l'objet créé avec son ID.

```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -H "x-api-key: mon-api-key-local-1234" \
  -d '{"name": "Chaise ergonomique", "price": 89.99}'
```

**Réponse en cas de succès (201 Created) :**
```json
{
  "id": "a3f9b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "name": "Chaise ergonomique",
  "price": 89.99,
  "created_at": "2026-04-18T10:00:00.000Z",
  "updated_at": "2026-04-18T10:00:00.000Z"
}
```

**Erreurs possibles :**
| Code | Raison                              |
|------|-------------------------------------|
| 400  | `name` absent ou vide               |
| 400  | `price` absent, négatif, ou zéro   |
| 401  | Clé API manquante ou incorrecte     |

---

### Lister tous les items — GET /items

**Ce que ça fait :** retourne tous les items sous forme de tableau. Retourne `[]` si vide.

```bash
curl http://localhost:3000/api/items \
  -H "x-api-key: mon-api-key-local-1234"
```

**Réponse en cas de succès (200 OK) :**
```json
[
  {
    "id": "a3f9b2c1-...",
    "name": "Chaise ergonomique",
    "price": 89.99,
    "created_at": "2026-04-18T10:00:00.000Z",
    "updated_at": "2026-04-18T10:00:00.000Z"
  }
]
```

---

### Lire un item par son ID — GET /items/:id

**Ce que ça fait :** retourne un seul item correspondant à l'ID donné.

```bash
curl http://localhost:3000/api/items/a3f9b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c \
  -H "x-api-key: mon-api-key-local-1234"
```

**Erreurs possibles :**
| Code | Raison                              |
|------|-------------------------------------|
| 401  | Clé API manquante ou incorrecte     |
| 404  | Aucun item trouvé avec cet ID       |

---

### Modifier un item — PUT /items/:id

**Ce que ça fait :** met à jour le `name` et/ou le `price`. La date `updated_at` est mise à jour automatiquement. La date `created_at` ne change jamais.

```bash
curl -X PUT http://localhost:3000/api/items/a3f9b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c \
  -H "Content-Type: application/json" \
  -H "x-api-key: mon-api-key-local-1234" \
  -d '{"name": "Chaise Premium", "price": 149.99}'
```

**Réponse en cas de succès (200 OK) :**
```json
{
  "id": "a3f9b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "name": "Chaise Premium",
  "price": 149.99,
  "created_at": "2026-04-18T10:00:00.000Z",
  "updated_at": "2026-04-20T14:30:00.000Z"
}
```

---

### Supprimer un item — DELETE /items/:id

**Ce que ça fait :** supprime définitivement l'item. Ne retourne rien dans le corps.

```bash
curl -X DELETE http://localhost:3000/api/items/a3f9b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c \
  -H "x-api-key: mon-api-key-local-1234"
```

**Réponse en cas de succès :** `204 No Content` (corps vide — c'est normal)

---

### Résumé des codes de réponse HTTP

| Code | Nom            | Quand c'est retourné                              |
|------|----------------|---------------------------------------------------|
| 200  | OK             | Lecture ou modification réussie                   |
| 201  | Created        | Item créé avec succès                             |
| 204  | No Content     | Suppression réussie (pas de corps en réponse)     |
| 400  | Bad Request    | Données manquantes ou invalides dans la requête   |
| 401  | Unauthorized   | Clé API absente ou incorrecte                     |
| 404  | Not Found      | Aucun item trouvé avec l'ID fourni                |
| 500  | Server Error   | Erreur côté Azure (Logic Apps ou Table Storage)   |

---

## 7. Les workflows Azure Logic Apps

Les 4 fichiers `workflow.json` définissent la logique métier au format officiel Azure.

### Comment fonctionne chaque workflow

Tous les workflows suivent la même logique en 3 étapes :

```
Requête HTTP reçue
        │
        ▼
1. Est-ce que la clé API est correcte ?
   → NON : retourner 401 (accès refusé)
   → OUI : continuer
        │
        ▼
2. Est-ce que les données sont valides ?
   → NON : retourner 400 (erreur de données)
   → OUI : continuer
        │
        ▼
3. Effectuer l'opération sur Azure Table Storage
   → Succès : retourner 200 / 201 / 204
   → Échec  : retourner 404 ou 500
```

### Détail de chaque workflow

**`create/workflow.json` — Créer (POST /items)**
- Vérifie que `name` n'est pas vide ET que `price > 0`
- Génère un ID unique avec la fonction `@guid()`
- Enregistre la date actuelle avec `@utcNow()`
- Sauvegarde dans Azure Table Storage
- Retourne `201` avec l'item complet

**`read/workflow.json` — Lire (GET /items et GET /items/{id})**
- Détecte automatiquement si un ID est fourni dans l'URL
- Sans ID → liste tous les items de la table
- Avec ID → cherche l'item exact et retourne `200` ou `404`

**`update/workflow.json` — Modifier (PUT /items/{id})**
- Vérifie que l'item existe avant de le modifier
- Garde la date `created_at` d'origine
- Met à jour `updated_at` avec la date actuelle
- Retourne `200` avec les nouvelles valeurs

**`delete/workflow.json` — Supprimer (DELETE /items/{id})**
- Vérifie que l'item existe avant de le supprimer
- Utilise le header `If-Match: *` requis par Azure Table Storage
- Retourne `204` sans corps de réponse

---

## 8. Les tests automatisés

### Technologies utilisées

- **Jest** — le framework qui exécute les tests
- **Supertest** — permet de tester l'API HTTP sans démarrer de vrai serveur

### Comment les tests sont organisés

Chaque fichier de test crée une **application complètement isolée** via la fonction `createApp()`. Cela signifie que chaque test repart de zéro — aucune donnée ne persiste d'un test à l'autre.

```javascript
// Ce pattern est utilisé dans les 4 fichiers de test
const createApp = () => {
  const app = express();
  const fakeDB = [];  // base de données vide à chaque test
  // ... toutes les routes ...
  return app;
};

beforeEach(() => {
  app = createApp(); // nouvelle instance fraîche avant chaque test
});
```

### Lancer les tests

```bash
# Lancement simple avec détails
npm test

# Avec rapport de couverture de code
npm run test:coverage

# Mode strict pour GitHub Actions
npm run test:ci
```

### Les 26 tests en détail

**`create.test.js` — 9 tests**

| # | Ce qui est testé                    | Réponse attendue |
|---|-------------------------------------|-----------------|
| 1 | Créer avec des données correctes    | 201 + objet complet |
| 2 | Deux items ont des IDs différents   | IDs uniques |
| 3 | name manquant                       | 400 |
| 4 | name vide ("")                      | 400 |
| 5 | price manquant                      | 400 |
| 6 | price négatif (-10)                 | 400 |
| 7 | price égal à zéro (0)               | 400 |
| 8 | Sans clé API                        | 401 |
| 9 | Mauvaise clé API                    | 401 |

**`read.test.js` — 6 tests**

| # | Ce qui est testé                    | Réponse attendue |
|---|-------------------------------------|-----------------|
| 1 | GET /items retourne bien un tableau | 200 + tableau |
| 2 | 2 items créés → liste contient 2   | length === 2 |
| 3 | Base vide → tableau vide            | [] |
| 4 | GET /items/:id avec bon ID          | 200 + item |
| 5 | GET /items/:id avec ID inconnu      | 404 |
| 6 | Sans clé API                        | 401 |

**`update.test.js` — 6 tests**

| # | Ce qui est testé                    | Réponse attendue |
|---|-------------------------------------|-----------------|
| 1 | Modification valide                 | 200 + nouvelles valeurs |
| 2 | La date updated_at change           | Date différente d'avant |
| 3 | ID inconnu                          | 404 |
| 4 | name manquant                       | 400 |
| 5 | price invalide (-10)                | 400 |
| 6 | Sans clé API                        | 401 |

**`delete.test.js` — 5 tests**

| # | Ce qui est testé                    | Réponse attendue |
|---|-------------------------------------|-----------------|
| 1 | Supprimer un item existant          | 204 + corps vide |
| 2 | L'item disparaît de la liste        | GET retourne [] |
| 3 | ID inconnu                          | 404 |
| 4 | Sans clé API                        | 401 |
| 5 | Supprimer deux fois le même item    | 2e fois → 404 |

### Résultat attendu de `npm test`

```
PASS  tests/create.test.js
  ✓ Devrait créer un item avec des données valides (42 ms)
  ✓ Devrait générer un ID unique pour chaque item (9 ms)
  ✓ Devrait retourner 400 si name est manquant (5 ms)
  ✓ Devrait retourner 400 si name est vide (4 ms)
  ✓ Devrait retourner 400 si price est manquant (3 ms)
  ✓ Devrait retourner 400 si price est négatif (3 ms)
  ✓ Devrait retourner 400 si price est zéro (3 ms)
  ✓ Devrait retourner 401 sans clé API (42 ms)
  ✓ Devrait retourner 401 avec mauvaise clé API (16 ms)

PASS  tests/read.test.js    (6 tests)
PASS  tests/update.test.js  (6 tests)
PASS  tests/delete.test.js  (5 tests)

Tests : 26 passed, 26 total ✅
Durée : ~5 secondes
```

---

## 9. La collection Postman

Postman est un outil visuel pour tester une API sans écrire de code.

### Comment importer la collection

1. Ouvrir Postman
2. Cliquer sur **Import** en haut à gauche
3. Sélectionner le fichier `postman/collection.json`
4. La collection **"Azure Logic Apps CRUD API"** apparaît dans la liste

### Variables de la collection

Ces variables sont pré-configurées — vous n'avez rien à changer :

| Variable  | Valeur par défaut           | Description                          |
|-----------|-----------------------------|--------------------------------------|
| `baseUrl` | `http://localhost:3000/api` | L'adresse de base de l'API           |
| `apiKey`  | `mon-api-key-local-1234`    | La clé d'accès                       |
| `itemId`  | (vide au départ)            | L'ID du dernier item créé (auto-rempli) |

> **Astuce pratique :** Après avoir lancé "CREATE", la variable `itemId` est remplie
> automatiquement avec l'ID de l'item créé. Les requêtes READ ONE, UPDATE et DELETE
> utilisent cet ID automatiquement — vous n'avez rien à copier-coller.

### Requêtes disponibles

**Groupe Items (CRUD) :**
- CREATE — POST /items
- READ ALL — GET /items
- READ ONE — GET /items/{{itemId}}
- UPDATE — PUT /items/{{itemId}}
- DELETE — DELETE /items/{{itemId}}

**Groupe Tests d'authentification :**
- Sans clé API → doit retourner 401
- Avec mauvaise clé → doit retourner 401

### Lancer la collection depuis le terminal (Newman)

```bash
# Installer Newman (runner Postman en ligne de commande)
npm install -g newman

# Lancer toute la collection
newman run postman/collection.json \
  --env-var "baseUrl=http://localhost:3000/api" \
  --env-var "apiKey=mon-api-key-local-1234"
```

---

## 10. Le pipeline CI/CD GitHub Actions

**CI/CD = Continuous Integration / Continuous Deployment**
C'est un système qui exécute automatiquement des tâches à chaque fois que vous envoyez du code sur GitHub.

### Ce qui se passe à chaque `git push`

```
Vous faites : git push origin main
                      │
                      ▼
            GitHub Actions démarre
                      │
          ┌───────────┴───────────┐
          ▼                       │
    Job 1 : Tests Jest     (30s)  │
    → npm install                 │
    → npm test (26 tests)         │
          │ si OK                 │
          ▼                       │
    Job 2 : Build Docker   (45s)  │
    → docker build                │
    → création du ZIP             │
          │ si OK                 │
          ▼                       │
    Job 3 : Déploiement    (20s)  │
    → simulation staging          │
          │ toujours              │
          ▼                       ▼
    Job 4 : Rapport final  (10s)
    → résumé des résultats

Durée totale : ~1 min 41 sec
```

### Quand le pipeline se déclenche

| Événement              | Action                                      |
|------------------------|---------------------------------------------|
| Push sur `main`        | Pipeline complet (tests + build + deploy)   |
| Pull Request → main    | Tests uniquement (pas de déploiement)       |
| Relance manuelle       | Possible depuis l'onglet Actions de GitHub  |

### Configurer le déploiement Azure (optionnel)

Allez dans **Settings → Secrets and variables → Actions** de votre dépôt GitHub :

| Nom du secret             | Ce qu'il contient                         |
|---------------------------|-------------------------------------------|
| `AZURE_CREDENTIALS`       | JSON de connexion Azure (voir ci-dessous) |
| `AZURE_SUBSCRIPTION_ID`   | ID de votre abonnement Azure              |
| `AZURE_LOGIC_APP_NAME`    | `logic-app-crud`                          |
| `AZURE_RESOURCE_GROUP`    | `rg-logic-apps-crud`                      |

**Générer le JSON de connexion Azure :**

```bash
az login

az ad sp create-for-rbac \
  --name "github-actions-crud" \
  --role contributor \
  --scopes /subscriptions/VOTRE_ID_ABONNEMENT \
  --sdk-auth
```

Copiez le JSON affiché dans le secret `AZURE_CREDENTIALS`.

---

## 11. Déploiement sur Azure (production)

> Cette section est pour déployer vraiment sur Azure.
> L'environnement local fonctionne sans aucun compte Azure.

### Étape 1 — Se connecter à Azure

```bash
az login
```

### Étape 2 — Créer les ressources Azure

```bash
chmod +x scripts/setup-azure.sh
./scripts/setup-azure.sh
```

Ce script crée automatiquement en ~5 minutes :

| Ressource           | Nom                  | Rôle                                |
|---------------------|----------------------|-------------------------------------|
| Resource Group      | `rg-logic-apps-crud` | Conteneur pour toutes les ressources|
| Storage Account     | `storagelogicapp`    | Héberge la table `items`            |
| Logic Apps Standard | `logic-app-crud`     | Exécute les 4 workflows             |
| API Management      | `apim-logic-crud`    | Sécurité et documentation           |
| Azure Monitor       | (intégré)            | Logs et alertes                     |

### Étape 3 — Déployer les workflows

```bash
./scripts/deploy.sh
```

### Étape 4 — Récupérer l'URL de l'API en production

```bash
az logicapp show \
  --name logic-app-crud \
  --resource-group rg-logic-apps-crud \
  --query "defaultHostName" -o tsv
```

---

## 12. Pourquoi ces choix techniques ?

### Pourquoi serverless (Logic Apps) plutôt qu'un serveur classique ?

| Avantage             | Explication simple                                      |
|----------------------|---------------------------------------------------------|
| Scalabilité auto     | Si 10 000 personnes utilisent l'API en même temps, Azure s'adapte tout seul |
| Coût à l'usage       | Si personne n'utilise l'API, vous ne payez rien         |
| Zéro maintenance     | Pas de mises à jour serveur, pas de patches de sécurité |
| Haute disponibilité  | Azure garantit 99.9% de disponibilité                   |

### Pourquoi Logic Apps plutôt qu'Azure Functions ?

| Critère             | Logic Apps                            | Azure Functions                  |
|---------------------|---------------------------------------|----------------------------------|
| Interface           | Visuelle (glisser-déposer)            | Code pur (JavaScript, Python…)   |
| Idéal pour          | Workflows simples avec règles métier  | Calculs complexes                |
| Connecteurs         | +400 connecteurs Azure natifs         | À coder soi-même                 |
| Voir ce qui s'est passé | Historique visuel de chaque appel | Logs textuels uniquement         |

Pour une API CRUD avec validation simple → **Logic Apps est le meilleur choix**.

### Pourquoi Azure Table Storage plutôt qu'une base SQL ?

| Critère       | Table Storage       | Azure SQL       | Cosmos DB        |
|---------------|---------------------|-----------------|------------------|
| Structure     | Souple (NoSQL)      | Rigide (SQL)    | Souple           |
| Coût          | Très faible         | Moyen           | Élevé            |
| Intégration   | Natif Logic Apps    | Natif           | Natif            |
| Idéal pour    | Données simples     | Requêtes SQL    | Multi-région     |

Pour stocker des items simples → **Table Storage est le choix le plus économique**.

### Pourquoi Supertest plutôt que node-fetch pour les tests ?

- Supertest teste l'API **sans démarrer de vrai serveur** → plus rapide
- Chaque test est **complètement isolé** → pas d'interférence entre tests
- Compatible avec **GitHub Actions** sans configuration supplémentaire

### Pourquoi GitHub Actions plutôt que Jenkins ?

- **Gratuit** pour les dépôts publics
- **Intégré à GitHub** → zéro configuration externe
- **Docker dans le cloud** → pas besoin de Docker sur votre PC
- **Automatique** → se déclenche à chaque `git push`

---

## 13. Guide d'utilisation

### Démarrage rapide (3 commandes)

```bash
git clone https://github.com/aritojo12-source/azure-logic-apps-crud.git
cd azure-logic-apps-crud
npm install && npm start
```

### Scénario complet — de zéro à la suppression

**1. Créer un item**
```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -H "x-api-key: mon-api-key-local-1234" \
  -d '{"name": "Lampe de bureau", "price": 45.00}'
```
→ Notez l'`id` retourné, par exemple : `"c1d2e3f4-5678-..."`

**2. Vérifier qu'il apparaît dans la liste**
```bash
curl http://localhost:3000/api/items \
  -H "x-api-key: mon-api-key-local-1234"
```

**3. Lire cet item précisément**
```bash
curl http://localhost:3000/api/items/c1d2e3f4-5678-... \
  -H "x-api-key: mon-api-key-local-1234"
```

**4. Modifier le prix**
```bash
curl -X PUT http://localhost:3000/api/items/c1d2e3f4-5678-... \
  -H "Content-Type: application/json" \
  -H "x-api-key: mon-api-key-local-1234" \
  -d '{"name": "Lampe LED premium", "price": 75.00}'
```

**5. Supprimer l'item**
```bash
curl -X DELETE http://localhost:3000/api/items/c1d2e3f4-5678-... \
  -H "x-api-key: mon-api-key-local-1234"
```

**6. Vérifier que c'est bien supprimé**
```bash
curl http://localhost:3000/api/items \
  -H "x-api-key: mon-api-key-local-1234"
# Résultat attendu : []
```

### Utiliser avec Postman (plus simple que curl)

1. Importer `postman/collection.json` dans Postman
2. Lancer "CREATE" → l'ID est sauvegardé automatiquement
3. Lancer dans l'ordre : CREATE → READ ALL → READ ONE → UPDATE → DELETE
4. Chaque requête contient des tests automatiques qui vérifient le résultat

---

## 14. Maintenance et retour en arrière

### Retour en arrière via Git

Si une nouvelle version du code crée des problèmes :

```bash
# Voir l'historique des versions
git log --oneline

# Annuler le dernier commit (les fichiers restent sur votre PC)
git revert HEAD
git push origin main

# Revenir à une version précise
git checkout HASH_DU_COMMIT -- .
git commit -m "retour à la version précédente"
git push origin main
```

### Retour en arrière sur Azure (Logic Apps)

Azure garde un historique des versions de chaque workflow :

```bash
# Voir les versions disponibles
az logicapp workflow version list \
  --name logic-app-crud \
  --resource-group rg-logic-apps-crud \
  --workflow-name create

# Revenir à une version précédente
az logicapp workflow version promote \
  --name logic-app-crud \
  --resource-group rg-logic-apps-crud \
  --workflow-name create \
  --version-id ID_DE_LA_VERSION
```

### Retour en arrière via Docker

Chaque build GitHub Actions crée une image Docker taguée avec le hash du commit :

```bash
# Voir les images disponibles
docker images | grep azure-logic-apps-crud

# Relancer une version précédente
docker run -p 3000:3000 azure-logic-apps-crud:HASH_DU_COMMIT
```

### Surveiller avec Azure Monitor

Métriques à surveiller en production :

| Métrique                        | Seuil d'alerte | Action à faire                      |
|---------------------------------|----------------|-------------------------------------|
| Taux d'erreurs (5xx)            | > 5%           | Voir les logs Logic Apps            |
| Temps de réponse moyen          | > 2 secondes   | Analyser le workflow concerné       |
| Exécutions échouées             | > 10 par heure | Faire un retour en arrière          |
| Requêtes sans clé API           | > 100 par heure| Renouveler ou changer la clé API    |

```bash
# Consulter les logs en ligne de commande
az monitor activity-log list \
  --resource-group rg-logic-apps-crud \
  --start-time 2026-04-22T00:00:00Z
```

### Procédure d'urgence en 5 étapes

```
Étape 1 — Identifier le problème
  → Aller dans GitHub Actions : quel job a échoué ?
  → Regarder Azure Monitor : quelle métrique a dépassé le seuil ?

Étape 2 — Retour arrière immédiat
  → git revert HEAD && git push origin main

Étape 3 — Retour arrière du workflow Azure si nécessaire
  → az logicapp workflow version promote ...

Étape 4 — Vérifier que tout fonctionne
  → npm test (doit afficher 26 tests passés)
  → Pipeline GitHub Actions doit être vert

Étape 5 — Comprendre ce qui s'est passé
  → Analyser les logs
  → Ouvrir un ticket dans GitHub Issues
```

---

## 15. Problèmes fréquents et solutions

| Problème rencontré                         | Cause probable                        | Solution                                                     |
|--------------------------------------------|---------------------------------------|--------------------------------------------------------------|
| `npm install` échoue                       | Node.js trop vieux ou absent          | `node --version` → installer Node.js 18 LTS                  |
| `npm test` : "Cannot find module"          | Dépendances pas installées            | Lancer `npm install` d'abord                                 |
| Toutes les requêtes retournent 401         | Clé API manquante                     | Ajouter `-H "x-api-key: mon-api-key-local-1234"` à chaque requête |
| 404 sur un item                            | L'ID n'existe pas                     | Faire `GET /items` pour voir les IDs valides                 |
| 400 Bad Request                            | Données incorrectes                   | Vérifier que `name` n'est pas vide et `price` est un nombre > 0 |
| "Connection refused" sur le port 3000      | Serveur pas démarré                   | Lancer `npm start` dans un terminal séparé                   |
| GitHub Actions ne se déclenche pas         | Fichier au mauvais endroit            | Vérifier que `ci-cd.yml` est bien dans `.github/workflows/`  |
| `npm ci` échoue dans GitHub Actions        | `package-lock.json` absent            | Lancer `npm install` en local puis committer le fichier généré|
| Pipeline rouge sur "Validation workflows"  | Dossiers avec majuscules              | Renommer `Workflows/` en `workflows/` (Linux est sensible)   |
| `node_modules` visible sur GitHub          | Mal configuré dans `.gitignore`       | `git rm -r --cached node_modules && git add . && git push`   |
| Tests passent en local mais échouent sur CI| Noms de fichiers avec majuscules      | Vérifier les noms — Linux est strict sur les majuscules      |

---

## 16. Auteur

**Projet :** Architecture Serverless avec Azure Logic Apps

**Dépôt GitHub :** https://github.com/aritojo12-source/azure-logic-apps-crud

### Technologies utilisées

| Technologie          | Version   | Rôle dans ce projet                    |
|----------------------|-----------|----------------------------------------|
| Node.js              | 18 LTS    | Environnement d'exécution JavaScript   |
| Express.js           | 4.x       | Serveur local (émule Logic Apps)       |
| Jest                 | 29.x      | Framework de tests automatisés         |
| Supertest            | 6.x       | Tests d'API HTTP sans serveur          |
| UUID                 | 9.x       | Génération des identifiants GUID       |
| Azure Logic Apps     | Standard  | Workflows serverless en production     |
| Azure Table Storage  | —         | Stockage des données en production     |
| Azure API Management | —         | Sécurité et documentation en production|
| GitHub Actions       | —         | Pipeline CI/CD automatique             |
| Docker               | 24.x      | Build de l'image dans le cloud GitHub  |
| Postman / Newman     | Dernière  | Tests manuels et automatisés           |

---
