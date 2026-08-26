# Walkthrough — Centralisation des constantes (Frontend, Backend, Seed, Documentation)

Les constantes de rôles, statuts de demandes, types de demandes et actions de validation ont été entièrement centralisées et alignées à travers toute l'application ERP MCT IT.

---

## Modifications réalisées

### 1. Backend (`backend/src/config/`)

- **[roles.js](mct-it-portal/backend/src/config/roles.js)** : ajout de la constante `ROLE_LABELS` contenant la traduction officielle en français de chaque rôle (`Employé`, `Chef de département`, `Directeur de division`, `Administrateur IT`, etc.) et exportation explicite.
- **[request.constants.js](mct-it-portal/backend/src/config/request.constants.js)** : ajout de `STATUS_LABELS` et `TYPE_LABELS` pour le backend.

### 2. Frontend (`frontend/src/constants/` et `types/`)

- **[roles.ts](mct-it-portal/frontend/src/constants/roles.ts)** : création d'un module centralisé contenant `ROLES`, `VALID_ROLES`, `ADMIN_ROLES`, `ROLE_AUTHORITY`, `ROLE_LABELS`, l'inférence du type `Role` et les helpers `isValidRole` et `isAdminRole`.
- **[requests.ts](mct-it-portal/frontend/src/constants/requests.ts)** : création d'un module centralisé contenant `REQUEST_TYPES`, `REQUEST_STATUSES`, `VALIDATION_ACTIONS`, `STATUS_LABELS`, `TYPE_LABELS`, `STATUS_BADGE_CLASS` et les helpers associés.
- **[index.ts](mct-it-portal/frontend/src/constants/index.ts)** : point d'entrée réexportant l'ensemble des constantes frontend.
- **[types/index.ts](mct-it-portal/frontend/src/types/index.ts)** : réexportation des types et constantes depuis `constants` et mise à jour du typage de `User.role`.
- **[AdminPage.tsx](mct-it-portal/frontend/src/pages/AdminPage.tsx)**, **[DashboardPage.tsx](mct-it-portal/frontend/src/pages/DashboardPage.tsx)** et **[RequestTypeSelector.tsx](mct-it-portal/frontend/src/components/requests/forms/RequestTypeSelector.tsx)** : remplacement des définitions locales dupliquées par les imports du module centralisé `constants`.

### 3. Script de seeding (`backend/prisma/seed.js`)

- **[seed.js](mct-it-portal/backend/prisma/seed.js)** : remplacement de toutes les chaînes brutes de rôles par l'utilisation de `ROLES.*` importé depuis `../src/config/roles`.

### 4. Documentation et backlog

- **[check_new_role.md](tasks/check_new_role.md)** : mise à jour de la procédure pour référencer la déclaration centralisée dans `roles.js` (backend) et `roles.ts` (frontend).
- **[todo.md](tasks/todo.md)** : tâche de centralisation des constantes marquée comme terminée `[x]`.

---

## Résultats des vérifications

| Test / Contrôle | Commande | Résultat |
| :--- | :--- | :--- |
| **Backend Unit Tests** | `npm run test:unit` | **PASS** (11/11 sous-tests OK) |
| **Backend Integration Tests** | `npm run test:integration` | **PASS** (21/21 routes Express réelles OK) |
| **Frontend TypeScript Check** | `npx tsc --noEmit` | **PASS** (0 erreur) |
| **Frontend Production Build** | `npm run build` | **PASS** (build Vite réussi en 1,55 s) |
