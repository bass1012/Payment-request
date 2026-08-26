# Mémo Technique — Ajout de Rôle ou de Département dans l'ERP MCT IT

Ce document sert de checklist préventive pour éviter les omissions de code lors de l'ajout d'un nouveau rôle utilisateur ou d'un nouveau département dans l'application.

---

## 1. Procédure pour l'Ajout d'un Département

L'organigramme et les circuits de validation sont **100 % déclaratifs** :
toute la donnée vit dans un fichier unique, aucun code métier n'est à modifier.

1.  **Configuration déclarative (source de vérité) :**
    *   Fichier : [organization.config.js](file:///Users/bassoued/Documents/DEMANDE%20IT/mct-it-portal/backend/src/config/organization.config.js)
    *   Action : Ajouter une entrée dans `DEPARTMENT_DEFS` avec `code`, `name`,
        `directionCode` (doit exister dans `DIRECTIONS`), `chefEmail`/`chefName`
        (N+1) et `directorEmail`/`directorName` (N+2).
    *   Facultatif : `selectableInForms: false` pour masquer le département des
        formulaires publics (réservé aux directions déclarées comme services).
    *   Si le département a un directeur différent de celui de sa direction,
        déclarer le contact dans `DIRECTIONS[...]` ou utiliser un `routeTo`.
2.  **Rôle métier du responsable (si exception) :**
    *   Ajouter l'email dans `ROLE_BY_EMAIL` (ex: `'email@mct.ci': ROLES.TREASURY`).
    *   Sans exception, le seed attribue automatiquement `CHEF_DEPT` (chef) ou
        `DIRECTOR` (directeur).
3.  **Circuit de validation :**
    *   Aucune action si le département suit les circuits existants.
    *   Pour un circuit nouveau, éditer `WORKFLOW_DEFINITIONS` (liste ordonnée
        d'étapes typées) ou `DIRECTIONS` (comportement du pas direction).
4.  **Base de données locale :**
    *   Lancer : `npm run db:seed` dans le dossier backend. Les comptes chef/
        directeur sont créés automatiquement par itération de la configuration.
5.  **Vérification :**
    *   `node test/organization.config.test.js` — valide l'intégrité de la
        config et les circuits figés (la config est aussi validée au chargement,
        fail-fast, si une direction référencée n'existe pas).

> `departments.js` est désormais une simple façade : il réexporte la config et
> le moteur (`workflow.engine.js`) pour préserver l'API historique
> `getWorkflowSteps`. Ne plus le modifier pour ajouter de la donnée.

---

## 2. Procédure pour l'Ajout d'un Rôle Utilisateur

Lors de l'introduction d'un nouveau rôle métier dans le système (ex: `TREASURY`, `MOYENS_GENERAUX`) :

1.  **Constantes Backend :**
    *   Fichier : [roles.js](file:///Users/bassoued/Documents/DEMANDE%20IT/mct-it-portal/backend/src/config/roles.js)
    *   Action : Déclarer le nouveau rôle dans l'objet `ROLES`, l'ajouter à `ROLE_AUTHORITY` et renseigner son libellé explicite en français dans `ROLE_LABELS`.
2.  **Schéma Prisma (Documentation) :**
    *   Fichier : [schema.prisma](file:///Users/bassoued/Documents/DEMANDE%20IT/mct-it-portal/backend/prisma/schema.prisma)
    *   Action : Ajouter le rôle dans le commentaire récapitulatif pour maintenir la documentation à jour.
3.  **Sécurité & Visibilité des requêtes :**
    *   Fichier : [request.controller.js](file:///Users/bassoued/Documents/DEMANDE%20IT/mct-it-portal/backend/src/controllers/request.controller.js)
    *   Action :
        *   Dans `listRequests` : Ajouter la clause de filtrage SQL (Prisma) spécifique pour ce rôle.
        *   Dans `getStats` : Adapter les compteurs statistiques selon le rôle pour afficher des chiffres pertinents.
4.  **Autorisations des Routes API (RBAC) :**
    *   Fichier : [requests.routes.js](file:///Users/bassoued/Documents/DEMANDE%20IT/mct-it-portal/backend/src/routes/requests.routes.js)
    *   Action : Mettre à jour les middlewares `requireRole('<NEW_ROLE>')` sur les routes de validation, d'exportation ou de suppression.
5.  **Seeding :**
    *   Fichier : [seed.js](file:///Users/bassoued/Documents/DEMANDE%20IT/mct-it-portal/backend/prisma/seed.js)
    *   Action : Importer `ROLES` et ajouter un utilisateur de test utilisant `ROLES.<NEW_ROLE>`.
6.  **Constantes & Types TypeScript (Frontend) :**
    *   Fichier : [roles.ts](file:///Users/bassoued/Documents/DEMANDE%20IT/mct-it-portal/frontend/src/constants/roles.ts)
    *   Action : Ajouter la chaîne du rôle à `ROLES`, `ROLE_AUTHORITY` et `ROLE_LABELS` (le type union `Role` est inféré automatiquement).
7.  **Barre de Navigation & Routage Frontend :**
    *   Fichier : [App.tsx](file:///Users/bassoued/Documents/DEMANDE%20IT/mct-it-portal/frontend/src/App.tsx)
    *   Action : Si le rôle requiert un tableau de bord exclusif, créer la page correspondante sous `frontend/src/pages/` et déclarer la route protégée avec la restriction appropriée.
8.  **Tableau de bord principal :**
    *   Fichier : [DashboardPage.tsx](file:///Users/bassoued/Documents/DEMANDE%20IT/mct-it-portal/frontend/src/pages/DashboardPage.tsx)
    *   Action : Adapter le rendu des onglets de demandes et la visibilité des statistiques selon le rôle connecté.

