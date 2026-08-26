# ERP NATIF MCT — Portail de Demandes IT & Approvisionnements

Ce portail est une application web d'entreprise conçue pour dématérialiser et automatiser les circuits de signature et d'approbation des demandes internes de MCT (Habilitations, Actifs Informatiques, Bons de Caisse et Demandes d'Approvisionnement).

---

## 1. Structure du Projet

Le projet est configuré sous forme de monorepo simplifié :
*   `backend/` : API REST en Node.js/Express connectée à SQLite (développement) ou PostgreSQL (production) via Prisma ORM.
*   `frontend/` : Application Single Page Application (SPA) développée en React, TypeScript et Tailwind CSS (compilée avec Vite).

---

## 2. Prérequis Systèmes

*   **Node.js** : Version 18 ou supérieure recommandée.
*   **npm** : Livré avec Node.js.
*   **Navigateur pour PDF** : Le backend utilise Puppeteer pour générer les PDF. En environnement Linux (serveur de production sans interface graphique), assurez-vous d'installer les dépendances de Chromium (voir section Déploiement Production).

---

## 3. Configuration de l'Environnement

### A. Configuration Backend (`backend/.env`)
Créez un fichier `.env` dans le dossier `backend` inspiré de `.env.example` :
```env
# Base de données (SQLite par défaut)
DATABASE_URL="file:./dev.db"

# JWT Sécurité
JWT_SECRET="<générer une valeur aléatoire unique d'au moins 32 caractères>"
JWT_EXPIRES_IN="7d"

# Configuration Serveur
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Navigateur utilisé pour générer les PDF
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Configuration SMTP (Emails de validation)
SMTP_HOST=<serveur SMTP>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<identifiant SMTP fourni par l'administrateur>
SMTP_PASS=<secret SMTP fourni par l'administrateur>
EMAIL_FROM="ERP NATIF MCT <adresse d'expédition validée>"

# Délais cibles optionnels, en jours ouvrés (valeurs par défaut : 2 ou 5)
SLA_VALIDATION_N1_BUSINESS_DAYS=2
SLA_VALIDATION_N2_BUSINESS_DAYS=2
SLA_VALIDATION_DG_BUSINESS_DAYS=2
SLA_PENDING_PAYMENT_BUSINESS_DAYS=2
SLA_IN_PROGRESS_IT_BUSINESS_DAYS=5
SLA_PROCESSING_BUSINESS_DAYS=5
```

### B. Configuration Frontend (`frontend/.env` ou constant)
Par défaut, le frontend communique avec `http://localhost:3001/api`. Pour modifier l'adresse de l'API en production, renseignez la variable d'environnement appropriée ou configurez la cible dans `frontend/src/lib/api.ts`.

---

## 4. Démarrage Rapide (Développement Local)

### Étape 1 : Initialisation de la Base de Données (Backend)
Dans le répertoire `backend/` :
1.  Installez les dépendances :
    ```bash
    npm install
    ```
2.  Générez le client Prisma :
    ```bash
    npm run db:generate
    ```
3.  Synchronisez le schéma et créez les tables (SQLite `dev.db` sera créé automatiquement) :
    ```bash
    npm run db:push
    ```
4.  Injectez les données initiales de configuration et comptes de validation :
    ```bash
    npm run db:seed
    ```

### Étape 2 : Lancement des Serveurs
*   **Démarrer le backend (dans `backend/`) :**
    ```bash
    npm run dev
    ```
    L'API tourne sur `http://localhost:3001`.
*   **Démarrer le frontend (dans `frontend/`) :**
    ```bash
    npm install
    npm run dev
    ```
    Le client web est disponible sur `http://localhost:3000` (ou le premier port disponible).

---

## 5. PostgreSQL en production

SQLite reste utilisé pour le développement local et les tests isolés via
`backend/prisma/schema.prisma`. La production dispose d'un schéma dédié et de
migrations versionnées dans `backend/prisma/postgresql/`; il ne faut plus
modifier manuellement le provider Prisma.

1.  **Configurer la connexion de production :**
    ```env
    DATABASE_URL="postgresql://<utilisateur>:<secret>@<serveur>:5432/mct_it_portal?schema=public"
    ```
2.  **Valider puis générer le client de production :**
    ```bash
    npm run db:validate:production
    npm run db:generate:production
    ```
3.  **Appliquer uniquement les migrations versionnées :**
    ```bash
    npm run db:migrate:production
    ```
4.  **Initialiser les données si nécessaire :**
    ```bash
    npm run db:seed
    ```

La commande `db:push` est réservée au SQLite local. Elle ne doit pas être
utilisée en production. Les montants financiers sont stockés en
`DECIMAL(18,2)` sous PostgreSQL.

---

## 6. Déploiement en Production

### Frontend
Compilez l'application pour générer les fichiers statiques optimisés :
```bash
cd frontend
npm run build
```
Les fichiers générés se trouvent dans le dossier `frontend/dist/` et peuvent être servis par un serveur web performant comme **Nginx** ou **Apache**.

### Backend & Puppeteer
1.  Configurez le serveur d'API avec un gestionnaire de processus comme **PM2** :
    ```bash
    cd backend
    npm install --production
    pm2 start src/server.js --name "mct-it-api"
    ```
2.  **Préréquis Puppeteer sur Linux (Ubuntu/Debian) :**
    Pour que la génération de PDF fonctionne correctement sans interface graphique, installez les paquets système requis pour Chromium :
    ```bash
    sudo apt-get update
    sudo apt-get install -y libgbm-dev wget gnupg ca-certificates procps libxss1 \
      libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 \
      libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
      libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
      libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
      libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxshmfence1 libxtst6
    ```
    Installez également Chromium, puis indiquez son chemin au backend :
    ```bash
    sudo apt-get install -y chromium
    export CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
    ```

### Supervision

La route `GET /health` vérifie à la fois que l'API répond et que la base de
données est joignable. Elle renvoie HTTP `200` lorsque les deux contrôles
réussissent et HTTP `503` si la connexion à la base échoue.

### Relances SLA planifiées

La commande ponctuelle `npm run sla:run`, exécutée depuis `backend/`, détecte
les étapes en retard et traite les relances puis escalades idempotentes. Elle
doit être appelée par le planificateur de l’infrastructure (cron, PM2 ou
équivalent) ; l’API ne démarre aucune boucle en arrière-plan. Les seuils et
l’adresse fonctionnelle d’escalade sont configurés via les variables
`SLA_REMINDER_OVERDUE_BUSINESS_DAYS`,
`SLA_ESCALATION_OVERDUE_BUSINESS_DAYS` et `SLA_ESCALATION_EMAIL`.

Les journaux structurés, le stockage persistant et la procédure testable de
sauvegarde/restauration sont décrits dans
[`docs/OPERATIONS.md`](docs/OPERATIONS.md).

---

## 7. Initialisation sécurisée des comptes

La commande `npm run db:seed` initialise les départements et les comptes
nécessaires aux circuits de validation. Les identifiants de connexion ne sont
pas publiés dans cette documentation : ils doivent être communiqués au
responsable du déploiement par un canal sécurisé.

Après le premier seed :

1. connectez-vous avec le compte administrateur d’amorçage ;
2. remplacez immédiatement son mot de passe initial par une valeur unique ;
3. attribuez un secret distinct à chaque compte créé par le seed avant de
   rendre l’application accessible ;
4. désactivez les comptes de démonstration inutiles ;
5. conservez les secrets dans un gestionnaire prévu à cet effet, jamais dans le
   dépôt Git, le README ou un ticket.

> Sécurité : tous les mots de passe ou identifiants précédemment publiés dans
> la documentation doivent être considérés comme compromis. Effectuez leur
> rotation immédiate sur les environnements où ils ont pu être utilisés, ainsi
> que celle des accès SMTP concernés. Cette procédure documentaire ne modifie
> aucun compte existant automatiquement.
