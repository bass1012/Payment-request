# Critique & Recommandations — Projet ERP MCT IT

Analyse croisée de `erp_architecture.md`, `todo.md` et `lessons.md`.

---

## 1. Incohérences à clarifier en priorité

- **SQLite vs PostgreSQL** : `erp_architecture.md` décrit une base **SQLite** (`dev.db`), alors que la Phase 1 du `todo.md` indique explicitement "Config PostgreSQL". Soit la doc d'architecture est obsolète, soit le projet est revenu en arrière sur ce choix — dans les deux cas, un environnement de production sur SQLite est risqué (écritures concurrentes limitées, pas de vrai typage JSON, sauvegardes plus fragiles). **À clarifier et documenter la base réellement utilisée en prod.**
- **Adresses email de "production" douteuses** : plusieurs rôles critiques (DAF → `maintenance.smartsa@gmail.com`, Moyens Généraux → test sur `bassirou2010+new2@gmail.com`) utilisent des adresses Gmail personnelles plutôt que des adresses `@mct.ci`. Cela mélange données de test et de production et pose un risque de continuité (perte d'accès à un compte Gmail personnel = rupture du workflow métier).

---

## 2. Architecture & modèle de données

**Points forts** : séparation claire frontend/backend, workflow moteur centralisé, PDF signé automatiquement, audit trail via `Validation`/`EmailLog`.

**Faiblesses** :
- Le champ `formData` en JSON à plat dans `Request` est pragmatique mais fragile : plusieurs "leçons" documentent des bugs de mapping de clés (`itAssets`, `memoNumber`, etc.) qui n'auraient pas existé avec des colonnes typées ou un schéma JSON validé (ex. Zod) côté backend avant écriture en base.
- **Recommandation** : ajouter une validation de schéma (Zod/Yup) par type de demande *avant* la sérialisation JSON, avec des tests qui vérifient que les clés attendues par le PDF/le frontend existent réellement.
- Le workflow est truffé d'exceptions codées en dur (routage DG→DSC, insertion `director_dept` pour DFM, multi-validation flexible DGOF/DG). Cela fonctionne mais chaque nouveau département a nécessité une intervention manuelle dans le code plutôt qu'une simple entrée de configuration.
- **Recommandation** : faire évoluer `departments.config.js` vers une vraie DSL de workflow déclarative (liste ordonnée d'étapes avec conditions), pour que l'ajout d'un département/étape ne touche plus la logique métier.

---

## 3. Sécurité

- **JWT en `localStorage`** : expose le token à un vol via XSS (contrairement à un cookie `httpOnly`). Le projet a documenté sa robustesse CSRF (bon réflexe), mais le risque XSS reste entier tant que le token est accessible en JS.
  **Recommandation** : envisager un cookie `httpOnly` + `SameSite=Strict`, ou a minima une politique CSP stricte pour limiter la surface XSS.
- **Mots de passe seedés prévisibles** (`Moyens@MCT2026`, `MCT@2026`) partagés/documentés en clair dans les scripts de seed. Bon pour le dev, dangereux si ces mêmes mots de passe survivent en prod.
  **Recommandation** : forcer un changement de mot de passe à la première connexion, générer des mots de passe aléatoires en environnement de prod.
- **Path Traversal & format string** : corrigés en Phase 20, mais de façon réactive (suite à une alerte Semgrep), pas par conception initiale.
  **Recommandation** : intégrer Semgrep (ou équivalent) en pré-commit/CI dès le début d'un futur projet plutôt qu'en fin de cycle.
- **Aucune mention de limitation de débit (rate limiting)** sur les routes d'authentification ou de vérification par code à 6 chiffres — risque de brute-force.
  **Recommandation** : ajouter `express-rate-limit` sur `/auth/login` et `/auth/verify`.
- **Uploads de fichiers** : rien n'indique de contrôle de type MIME/taille sur les pièces jointes (bons de caisse, justificatifs, proformas).
  **Recommandation** : valider extension + MIME réel (pas seulement l'extension) et plafonner la taille.

---

## 4. Gestion de projet — `todo.md`

Le fichier fonctionne bien comme historique, mais après 21 phases quasi entièrement cochées, il devient difficile de voir ce qui reste réellement à faire (un seul item non coché : "README + instructions déploiement").

**Recommandations** :
- Scinder en deux fichiers : `CHANGELOG.md` (historique des phases terminées, tel quel) et `TODO.md` (uniquement le backlog restant). Cela redonne au `TODO.md` sa fonction première de guide d'action.
- Traiter en priorité le seul item non coché — l'absence de README/instructions de déploiement est un vrai risque de "bus factor" (dépendance à une seule personne qui connaît la procédure).
- Envisager de taguer chaque phase avec une version Git (`v1.5-tresorerie`, etc.) pour relier le changelog fonctionnel à l'historique de code.

---

## 5. `lessons.md` — excellente pratique, à faire évoluer

Le fichier est une vraie force du projet : discipline rare de documenter systématiquement les erreurs et leur correction. Deux limites cependant :

- **Répétition d'un même type d'erreur** : le pattern "ajout d'un rôle → il faut aussi mettre à jour `requireRole`, `listRequests`, `getStats`, le seed, le frontend" revient au moins 4-5 fois (DAF, DGOF, Moyens Généraux, DO, DFM...). Une leçon écrite ne suffit pas à éviter la récidive si elle n'est pas transformée en outil.
  **Recommandation** : convertir cette leçon récurrente en checklist automatisée (ex. un script `check-new-role.js` qui liste tous les endroits à modifier) ou en abstraction de code (une fonction unique `registerRole()` centralisant tous ces effets de bord), plutôt que de compter sur la mémoire humaine à chaque nouvelle direction ajoutée.
- Les leçons sont purement rétroactives (post-incident). **Recommandation** : ajouter une leçon "méta" en tête de fichier — un mini-guide des pièges connus à consulter *avant* toute nouvelle fonctionnalité touchant rôles/départements/workflow, pour transformer le journal en réflexe préventif.

---

## 6. Synthèse — priorités actionnables

1. Clarifier SQLite vs PostgreSQL et sécuriser les adresses email de rôles critiques.
2. Écrire le README de déploiement (seul item ouvert du todo).
3. Ajouter rate limiting sur l'auth + validation stricte des uploads.
4. Sortir le JWT du `localStorage` ou renforcer la CSP.
5. Refactorer la logique "ajout de rôle/département" en une fonction/checklist unique pour arrêter la récidive documentée dans `lessons.md`.
6. Scinder `todo.md` en `CHANGELOG.md` + backlog actif.
