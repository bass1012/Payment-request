# Backlog Actif — Projet ERP MCT IT

## 21. Intégration Strix Claude Code — 24/08/2026
- [x] Installer le skill de correction des vulnérabilités Strix dans `.claude/skills/`.
- [x] Installer ou rendre disponible le wrapper `strix-claude-cli` avec ses prérequis documentés.
- [x] Valider la découverte du skill et la commande de diagnostic sans lancer de scan réel.

## 22. Stabilisation Claude Code — 24/08/2026
- [x] Ajouter les agents de revue et de tests adaptés au portail de demandes.
- [x] Ajouter les skills backend, frontend, sécurité et vérification adaptés au projet.
- [x] Ajouter les commandes `/code-review`, `/e2e` et `/verify` sans hooks ni MCP automatiques.

## 23. Skills sans authentification Claude — 24/08/2026
- [x] Conserver uniquement les skills locaux utilisables sans session Claude authentifiée.
- [x] Retirer le skill Strix, réservé aux scans et re-scans nécessitant Claude/Strix.

## 24. Correction brouillon et validation E2E — 24/08/2026
- [x] Retourner `204 No Content` lorsqu'aucun brouillon n'est disponible.
- [x] Aligner le test d'intégration et vérifier le parcours authentifié avec Playwright CLI.

Pour l'historique des phases déjà terminées, veuillez vous référer au fichier [CHANGELOG.md](file:///Users/bassoued/Documents/DEMANDE%20IT/tasks/CHANGELOG.md).

---

## 1. Documentation & Déploiement
- [x] Rédiger le fichier `README.md` détaillé à la racine du projet (Instructions de build, configuration SQLite/PostgreSQL, variables d'environnement, seeding et démarrage).

## 2. Sécurisation & Contrôles
- [x] Backend : Limiter le débit de requêtes sur les routes d'authentification (`POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/verify/:token`) via `express-rate-limit`.
- [x] Backend : Valider strictement les uploads de fichiers base64 dans `saveBase64File` (limite à 10 Mo, types MIME autorisés et extensions autorisées).

## 3. Amélioration de l'Architecture
- [x] Doc : Rédiger le guide technique `check_new_role.md` pour centraliser la checklist d'ajout d'un rôle ou d'un département dans l'ERP.

## 4. Recommandations issues de la revue Codex — 12/07/2026
- [x] P0 Sécurité : renforcer `POST /api/requests/:id/validate` côté backend pour vérifier que l'utilisateur connecté est bien le validateur attendu de l'étape courante, en se basant sur l'email attendu du workflow et pas seulement sur le rôle global.
- [x] P0 Workflow : centraliser la comparaison des emails de validateurs dans un helper backend qui supporte les listes séparées par virgules (`email1,email2`), puis l'utiliser dans `listRequests`, `getRequest`, `getStats` et `validateRequest`.
- [x] P1 Confidentialité : remplacer l'exposition statique de `/uploads` par des routes authentifiées contrôlant l'accès aux PDF et pièces jointes selon les mêmes règles que `getRequest`.
- [x] P1 Performance : éviter de charger toutes les demandes avant filtrage dans `listRequests` et `getStats`; pousser autant que possible les filtres dans Prisma ou introduire une pagination/filtration serveur robuste.
- [x] P2 Qualité : ajouter une vraie suite de tests automatisés couvrant au minimum la validation autorisée/refusée, les validateurs multiples, la visibilité des demandes et l'accès aux fichiers.

## 5. Recommandations complémentaires après seconde revue — 12/07/2026
- [x] P0 Sécurité : appliquer les mêmes règles d'accès que `getRequest` dans `GET /api/requests/:id/pdf` avant de renvoyer le PDF original ou généré, afin qu'un utilisateur connecté ne puisse pas récupérer un dossier par simple connaissance de l'ID.
- [x] P0 Frontend/Fichiers : remplacer les liens directs vers `/uploads/...` dans `RequestDetailPage.tsx` par des appels Axios authentifiés (`responseType: 'blob'`) pour prévisualiser et télécharger les pièces justificatives et proformas après sécurisation de `/uploads/*`.
- [x] P1 Rôles : harmoniser les rôles autorisés entre routes et contrôleurs (`ADMIN`, `SUPER_ADMIN`, `IT_ADMIN`, `IT`) pour éviter qu'un rôle reconnu par l'UI ou le contrôleur soit bloqué par `requireRole` avant d'atteindre la logique métier.
- [x] P1 Export CSV : restreindre `GET /api/requests/export/csv` avec le même modèle de visibilité que `listRequests` ou définir explicitement un périmètre pour `TREASURY`, afin d'éviter un export global involontaire.
- [x] P2 Tests : remplacer les tests de simulation par des tests de routes Express réelles couvrant `/api/requests/:id/validate`, `/uploads/*`, `/api/requests/:id/pdf`, l'export CSV et les cas de refus 403.

## 6. Recommandations de consolidation après troisième revue — 12/07/2026
- [x] P1 Autorisations : extraire un helper backend unique (`canAccessRequest`, `canValidateCurrentStep`, `isGlobalAdminRole`) pour éviter de dupliquer les règles entre `getRequest`, `generatePdf`, `serveUploadSecure`, `getUserVisibilityFilter` et `exportRequestsCSV`.
- [x] P1 Rôles frontend : harmoniser les gardes de navigation React (`AdminRoute`, `TreasuryRoute`, `MoyensGenerauxRoute`) avec les rôles réellement supportés côté backend, notamment `SUPER_ADMIN` et `IT_ADMIN`.
- [x] P1 Visibilité globale : aligner `getUserVisibilityFilter` et `getRequest` sur la même définition des rôles globaux (`ADMIN`, `SUPER_ADMIN`, `IT_ADMIN`, `IT`) pour éviter qu'un profil admin voie moins de données via `/api/requests` que via les routes admin.
- [x] P2 Tests : relancer `npm run test:integration` avec autorisation d'ouverture du serveur local de test, puis documenter le résultat dans `tasks/CHANGELOG.md` ou dans une note de vérification.
- [x] P2 Frontend : remplacer les comparaisons directes d'email par le même comportement que le backend pour les validateurs multiples ou les formats `Nom <email>`, afin d'éviter des écarts d'affichage des boutons d'action.

## 7. Recommandations qualité tests après validation — 12/07/2026
- [x] P2 Tests : remplacer le faux contenu texte `Fake PDF Content` de `test_integration.js` par un mini PDF valide afin d'éviter les logs d'erreur `pdf-lib` pendant les tests de signature.
- [x] P2 Architecture tests : refactorer `src/index.js` pour exporter l'application Express sans lancer automatiquement `app.listen()` lors d'un `require`, puis démarrer le serveur explicitement dans le script de production et dans les tests.

## 8. Revue globale du projet — 19/07/2026
- [x] Cartographier l’architecture, les fonctionnalités et les parcours principaux.
- [x] Vérifier l’état du code, des tests, de la sécurité et du déploiement.
- [x] Produire des recommandations priorisées par impact, effort et risque.

## 9. Recommandations de sécurisation avant production — 19/07/2026

### P0 — Identité, rôles et administration
- [x] Backend : rendre l’identité serveur-authoritative en rechargeant l’utilisateur depuis la base à chaque requête authentifiée, ou via un cache de très courte durée, puis refuser immédiatement les comptes désactivés.
- [x] Backend : invalider les sessions existantes après désactivation, changement de mot de passe ou modification de rôle, par exemple avec un champ `tokenVersion` inclus dans le JWT.
- [x] Backend : séparer strictement les permissions de `IT` et `IT_ADMIN`; réserver la gestion des utilisateurs et des rôles à `ADMIN`, `SUPER_ADMIN` et, si réellement nécessaire, `IT_ADMIN`.
- [x] Backend : définir une liste blanche centralisée des rôles valides et rejeter toute chaîne arbitraire dans `createUser` et `updateUser`.
- [x] Backend : interdire l’auto-promotion et empêcher un administrateur de créer ou d’attribuer un rôle supérieur à son propre niveau d’autorité.
- [x] Backend : faire échouer le démarrage si `JWT_SECRET` est absent, trop court ou égal à une valeur d’exemple.
- [x] Tests : couvrir la désactivation d’un utilisateur déjà connecté, la rétrogradation d’un rôle et les tentatives d’escalade `IT → ADMIN/SUPER_ADMIN`.

### P0 — Intégrité du workflow et valeur probante
- [x] Backend : figer `formData`, le PDF principal et les pièces jointes dès la soumission afin qu’une demande déjà approuvée ne puisse pas être modifiée silencieusement.
- [x] Produit/Backend : si une correction après soumission est nécessaire, créer une nouvelle révision explicite du dossier et invalider ou rejouer les validations antérieures.
- [x] Backend : exécuter dans une transaction atomique la vérification de l’étape courante, la création de la validation, la signature et l’avancement du workflow.
- [x] Base de données : ajouter un contrôle de concurrence optimiste (`version` ou comparaison de `currentStep`) pour empêcher deux validations simultanées de faire avancer deux fois la demande.
- [x] Base de données : ajouter une contrainte d’unicité adaptée sur les validations d’une même demande et d’une même étape, en tenant compte des éventuelles étapes multi-valideurs.
- [x] Tests : ajouter un test concurrent avec deux validations lancées simultanément et vérifier qu’une seule est acceptée.
- [x] Backend/Base de données : rendre la génération des références atomique avec une séquence ou un compteur transactionnel en base.
- [x] Backend : ne plus accepter directement un `att.path` transmis par le client lors de la modification d’une demande.
- [x] Base de données : remplacer les chemins de pièces jointes stockés dans des chaînes JSON par une entité `Attachment` reliée à la demande, avec propriétaire, type MIME, taille et chemin normalisé.
- [x] Backend : remplacer la recherche d’appartenance des fichiers par `contains/findFirst` par une relation exacte entre le fichier et sa demande.

### P1 — Renforcement complémentaire
- [x] Backend : ajouter une expiration aux jetons de vérification d’adresse email et invalider le jeton après utilisation.
- [x] Backend : limiter la route publique des départements aux seules informations nécessaires au formulaire et ne pas exposer les emails des responsables.
- [x] Base de données : remplacer progressivement les champs libres `role`, `status`, `type` et `action` par des enums ou une validation centralisée stricte.
- [x] Base de données : ajouter les index nécessaires sur les statuts, dates, relations et champs utilisés par les filtres de visibilité et de workflow.
- [x] Documentation : retirer les mots de passe du `README.md` et remplacer les comptes de démonstration par une procédure de création ou de seed sans secrets publiés.
- [ ] Sécurité : changer immédiatement les mots de passe documentés s’ils correspondent à des comptes encore actifs.

## 10. Recommandations tests, données et déploiement — 19/07/2026

### P0/P1 — Tests fiables et isolés
- [x] Tests : forcer `test_integration.js` à utiliser une base temporaire dédiée et refuser son exécution si `NODE_ENV !== "test"` ou si l’URL ressemble à une base de développement/production.
- [x] Tests : ne plus faire d’`upsert` puis de suppression sur des identités fixes susceptibles d’exister; générer des données uniques par exécution et nettoyer uniquement ce qui vient d’être créé.
- [x] Tests : garantir le nettoyage par transaction, base éphémère ou recréation complète du schéma de test.
- [x] Tests : adopter un runner standard avec assertions bloquantes et code d’échec immédiat lorsqu’une exception inattendue survient.
- [x] CI : ajouter une intégration continue exécutant génération Prisma, migrations, tests backend et build frontend sur chaque changement.

### P1 — Base de données et exploitation
- [x] Architecture : choisir officiellement PostgreSQL pour la production au lieu de demander une modification manuelle du provider Prisma au moment du déploiement.
- [x] Base de données : créer et versionner de vraies migrations Prisma, puis utiliser `prisma migrate deploy` en production à la place de `prisma db push`.
- [x] Base de données : remplacer `Float` par `Decimal` pour les montants financiers.
- [x] Déploiement : corriger la commande PM2 afin de démarrer `src/server.js`, puisque `src/index.js` exporte désormais seulement l’application Express.
- [x] PDF : rendre le chemin de Chromium configurable ou utiliser une distribution embarquée compatible avec Linux, sans chemin macOS codé en dur.
- [x] PDF : ne pas renvoyer silencieusement du HTML lorsqu’un PDF est attendu; produire une erreur explicite et observable si la génération échoue.
- [x] Exploitation : ajouter une route de santé contrôlant au minimum l’API et la connexion à la base.
- [x] Exploitation : remplacer les `console.log` de workflow par des logs structurés avec niveau, identifiant de demande et corrélation, sans données sensibles.
- [x] Exploitation : documenter et tester la sauvegarde/restauration de PostgreSQL et du stockage des pièces jointes.
- [ ] Exploitation : prévoir un stockage persistant et sauvegardé pour les uploads, idéalement un stockage objet en production.

## 11. Recommandations produit et expérience utilisateur — 19/07/2026

### P0 — Transformer l’accueil en boîte de travail
- [x] Frontend/Backend : ajouter une section prioritaire « À traiter par moi » avec compteur, ancienneté, prochaine action et accès direct au dossier.
- [x] Frontend : séparer clairement les vues « Mes demandes », « À valider » et « Terminées » au lieu de mélanger tous les dossiers visibles.
- [x] Frontend/Backend : ajouter recherche, filtres, tri, pagination et lien « Voir toutes les demandes » depuis le tableau de bord.
- [x] Frontend : adapter les libellés des statistiques au profil connecté pour éviter que « Total soumises » soit ambigu pour un valideur.
- [x] Produit : afficher les délais cibles, l’ancienneté du dossier et les étapes actuellement bloquées.
- [x] Produit/Backend : ajouter des relances automatiques puis des escalades configurables lorsque le délai d’une étape est dépassé.
- [x] Reporting : mesurer le temps moyen par type de demande et par étape, les taux de rejet, les dossiers bloqués et le respect des SLA.

### P0/P1 — Fluidifier la création et la modification
- [x] Frontend : corriger les raccourcis du dashboard pour utiliser les vrais types `ASSET` et `PRINT` au lieu de `COMPUTER` et `PRINTER`.
- [x] Frontend : lire le paramètre `type` de l’URL dans `NewRequestPage` avec `useSearchParams` afin de présélectionner réellement le formulaire.
- [x] Frontend : aligner la table d’icônes du dashboard sur tous les types réels de demandes.
- [x] Frontend : rendre non éditables par défaut l’identité et le département issus du profil, avec une action explicite pour demander leur correction.
- [x] Frontend/Backend : ajouter les brouillons, l’autosauvegarde et la reprise d’une saisie interrompue.
- [x] Frontend : conserver et afficher les pièces jointes existantes lors de la modification d’une demande, sans obliger l’utilisateur à les téléverser de nouveau.
- [x] Frontend : transformer l’upload en zone claire avec formats acceptés, limite de taille, progression, erreurs et aperçu des fichiers.
- [x] Frontend : simplifier les formulaires complexes avec une progression visible, des sections conditionnelles et des validations contextualisées.

### P1 — Mobile, accessibilité et cohérence des rôles
- [x] Frontend : remplacer la barre latérale fixe sur mobile par un menu hamburger, un tiroir ou une navigation basse.
- [x] Frontend : supprimer la marge latérale fixe de 256 px sur les petits écrans.
- [x] Frontend : afficher les demandes sous forme de cartes sur mobile plutôt que dans des tableaux nécessitant un défilement horizontal.
- [x] Frontend : passer les formulaires en une colonne sur petit écran et empiler les lignes d’articles de la demande d’approvisionnement.
- [x] Frontend : ajouter des états de focus visibles, des libellés/ARIA appropriés et une gestion clavier correcte pour les modales et actions.
- [x] Frontend : respecter `prefers-reduced-motion` pour les animations et indicateurs pulsants.
- [x] Frontend : harmoniser les liens de navigation Trésorerie et Moyens Généraux avec les rôles réellement autorisés par les gardes de routes, notamment `IT_ADMIN`.

## 12. Recommandations de maintenabilité — 19/07/2026
- [x] Frontend : découper progressivement `RequestDetailPage.tsx` en composants métier dédiés aux documents, au workflow, aux validations, au paiement et à la clôture.
- [x] Frontend : découper `NewRequestPage.tsx` par type de demande et extraire les champs communs, la gestion des uploads et le mode édition.
- [x] Backend : séparer `request.controller.js` en contrôleurs ou services dédiés à la création, la consultation, la validation, les fichiers, l’export et la clôture.
- [x] Architecture : centraliser les constantes de rôles, statuts, types de demandes et actions afin d’éviter les divergences entre backend, frontend, seed et documentation.
- [x] Qualité : ajouter des tests unitaires ciblés sur le calcul des workflows, la génération de références, les permissions et le formatage des demandes.

## 13. Exécution — Vague 1 sécurité et gains rapides — 19/07/2026
- [x] Lot A : rendre l’authentification serveur-authoritative, séparer `IT` de l’administration et sécuriser l’attribution des rôles.
- [x] Lot B : isoler la suite d’intégration dans une base de test dédiée et empêcher toute exécution accidentelle sur une base normale.
- [x] Lot C : figer les demandes après soumission et rendre la validation résistante aux doubles soumissions concurrentes.
- [x] Lot D : corriger les raccourcis de création, les icônes de types et la présélection via l’URL.
- [x] Vérification : exécuter la génération Prisma, la suite d’intégration et le build frontend, puis documenter les résultats.

## 14. Exécution — Vague 2 intégrité et exploitation — 19/07/2026
- [x] Lot A : invalider les JWT après changement sensible via `tokenVersion` et faire expirer les jetons de vérification email.
- [x] Lot B : rendre la décision et l’avancement du workflow atomiques avec contrôle optimiste de version.
- [x] Lot C : normaliser l’appartenance des pièces jointes et supprimer toute confiance dans les chemins fournis par le client.
- [x] Lot D : ajouter la santé applicative, corriger le démarrage PM2/Linux PDF et préparer l’intégration continue.
- [x] Vérification : migrer la base locale sans perte, exécuter les tests de sécurité et d’intégration, puis compiler le frontend.

## 15. Exécution — Vague 3 références, confidentialité et boîte de travail — 19/07/2026
- [x] Lot A : rendre la génération annuelle des références atomique et résistante aux créations concurrentes.
- [x] Lot B : minimiser les données publiques des départements et retirer les identifiants/mots de passe de la documentation.
- [x] Lot C : ajouter une vraie boîte de travail « À traiter par moi », des vues séparées et des filtres de recherche.
- [x] Lot D : ajouter les index Prisma nécessaires aux recherches, statuts, dates et relations fréquemment filtrées.
- [x] Vérification : synchroniser la base, tester les créations concurrentes et les filtres, puis compiler le frontend.

## 16. Exécution — Vague 4 production, révisions et mobile — 19/07/2026
- [x] Lot A : préparer officiellement PostgreSQL pour la production avec un schéma dédié, des migrations versionnées et des montants financiers en `Decimal`, sans casser l’environnement SQLite de test.
- [x] Lot B : ajouter une révision explicite et historisée des dossiers soumis, puis rejouer le workflow sans effacer les validations antérieures.
  - [x] Modéliser les snapshots et rattacher chaque validation à son numéro de révision.
  - [x] Ajouter une route transactionnelle réservée au demandeur, avec validation stricte et contrôle optimiste.
  - [x] Réinitialiser le dossier au début du workflow sans modifier les validations, signatures ou fichiers historiques.
  - [x] Couvrir par tests HTTP l’autorisation, les données invalides, l’historisation et la concurrence.
- [x] Lot C : rendre la navigation, la boîte de travail et les formulaires utilisables sur mobile, avec focus visible, attributs ARIA et réduction des animations.
- [x] Lot D : remplacer les journaux métier dispersés par un logger structuré corrélé à la demande et documenter la sauvegarde/restauration de PostgreSQL et des pièces jointes.
- [x] Vérification : valider les deux schémas Prisma, appliquer les migrations sur une base PostgreSQL de contrôle si disponible, exécuter les tests backend et compiler le frontend.

## 17. Exécution — Vague 5 saisie résiliente et délais — 19/07/2026
- [x] Lot A : ajouter des brouillons serveur privés, leur mise à jour idempotente, leur soumission atomique et les tests d’autorisation associés.
  - [x] Créer et lister les brouillons sans validation, notification ni démarrage du workflow.
  - [x] Réserver lecture et modification au seul créateur avec contrôle optimiste de version.
  - [x] Soumettre atomiquement le brouillon et créer une unique validation de soumission.
  - [x] Couvrir les accès interdits, les écritures concurrentes et la double soumission par tests HTTP.
- [x] Lot B : ajouter l’autosauvegarde frontend, la reprise d’un brouillon et rendre l’identité/département du profil non éditables par défaut.
- [x] Lot C : conserver les pièces jointes existantes en modification et proposer une zone d’upload accessible avec formats, limite, aperçu et erreurs contextualisées.
- [x] Lot D : afficher l’ancienneté, le délai cible et l’étape bloquante dans la boîte de travail et le détail d’une demande.
- [x] Vérification : synchroniser les deux schémas Prisma et la migration PostgreSQL si nécessaire, exécuter les tests backend puis compiler le frontend.

## 18. Exécution — Vague 6 relances et pilotage SLA — 19/07/2026
- [x] Lot A : ajouter des relances et escalades SLA idempotentes, persistées et exécutables par une tâche planifiée sans doublon d’email.
  - [x] Persister une clé unique par demande, révision, étape et niveau de relance.
  - [x] Détecter les étapes actives en retard avec des seuils configurables et des destinataires stricts.
  - [x] Revendiquer chaque envoi avant l’appel SMTP et journaliser son résultat sans donnée sensible.
  - [x] Ajouter une commande ponctuelle planifiable et des tests de seuil, échec et concurrence.
- [x] Lot B : exposer un reporting sécurisé sur les temps moyens, rejets, retards, blocages et respect des SLA.
- [x] Lot C : créer un écran de pilotage responsive pour les rôles autorisés, avec filtres temporels et indicateurs lisibles.
- [x] Lot D : centraliser les rôles, statuts, types et actions backend dans des constantes strictes et ajouter des tests unitaires de workflow, permissions et formatage.
- [x] Vérification : synchroniser SQLite/PostgreSQL et la migration, exécuter les tests unitaires et HTTP, puis compiler le frontend.

## 19. Exécution — Vague 7 saisie guidée et maintenabilité frontend — 19/07/2026
- [x] Lot A : afficher une progression accessible pendant la préparation et l’envoi des pièces jointes, empêcher les doubles soumissions et permettre une nouvelle tentative claire en cas d’échec.
- [x] Lot B : guider les formulaires complexes par sections visibles, avec progression, résumé des erreurs contextualisé et accès direct au premier champ invalide.
- [x] Lot C : extraire de `NewRequestPage.tsx` les utilitaires et composants de fichiers/étapes afin de réduire les responsabilités de la page sans changer le comportement métier.
- [x] Lot D : extraire de `RequestDetailPage.tsx` les blocs de documents et de suivi du workflow en composants dédiés et typés.
- [x] Vérification : exécuter les tests frontend ciblés disponibles, le contrôle TypeScript et le build de production, puis documenter les résultats.

## 20. Exécution — Vague 8 découpage des modules principaux — 19/07/2026
- [x] Lot A : extraire de `NewRequestPage.tsx` le sélecteur de type, les informations demandeur et les champs métier autonomes, avec des interfaces explicites et sans modifier les payloads.
- [x] Lot B : extraire de `RequestDetailPage.tsx` les actions de validation, paiement, clôture et les fenêtres modales restantes dans des composants métier typés.
- [x] Lot C : séparer de `request.controller.js` les opérations de consultation, statistiques et export dans un contrôleur dédié, en conservant les mêmes routes et règles d’autorisation.
- [x] Lot D : ajouter des tests de non-régression ciblés sur les exports du contrôleur et vérifier que les contrats HTTP publics restent identiques.
- [x] Vérification : exécuter les tests unitaires et HTTP backend, le build frontend et les contrôles de formatage, puis documenter les résultats.

## 21. Exécution — Vague 9 contrôleurs backend par domaine — 19/07/2026
- [x] Lot A : extraire la création, les brouillons et leur soumission dans un contrôleur dédié, en réutilisant les helpers partagés.
- [x] Lot B : extraire la validation et la clôture dans un contrôleur de workflow dédié sans modifier l’ordre transactionnel ni les effets externes.
- [x] Lot C : extraire modification, annulation, suppression, révision et accès sécurisé aux fichiers dans un contrôleur de cycle de vie dédié.
- [x] Lot D : réduire `request.controller.js` à une façade explicite et étendre les tests de contrat pour garantir l’origine et l’unicité de chaque handler public.
- [x] Vérification : contrôler la syntaxe de chaque module, exécuter les tests unitaires et HTTP, puis vérifier le build frontend et documenter les résultats.

## 22. Recommandations inspirées des plateformes de signature — 19/07/2026

> Objectif : développer ces fonctionnalités nativement dans l’ERP, sans intégrer ni rendre le projet dépendant de DocuSign.

### P0 — Circuit et preuve de signature
- [x] Produit/Backend : ajouter un consentement explicite avant chaque signature ou décision engageante.
- [x] Backend : calculer et conserver l’empreinte SHA-256 de chaque version du document signé.
- [x] Backend/Base de données : créer un journal de signature append-only retraçant l’identité, la date, l’action, la révision, la méthode d’authentification et l’empreinte du document.
- [x] Produit/Backend : prendre en charge plusieurs signataires avec ordre séquentiel, validation parallèle et règles conditionnelles.
- [x] Produit : permettre le refus motivé et la demande de correction sans clôturer définitivement le dossier.
- [x] PDF : générer un certificat de preuve téléchargeable et l’associer au PDF final.
- [x] Frontend : afficher une chronologie complète et lisible des signatures, refus, corrections et délégations.
- [x] Tests : vérifier l’intégrité de l’empreinte, l’ordre des signataires, l’immutabilité du journal et la génération du certificat.

### P1 — Sécurité, délégation et modèles
- [x] Sécurité : ajouter une authentification renforcée par code OTP pour les demandes ou rôles sensibles.
- [x] Sécurité/Produit : rendre le niveau de vérification configurable selon le type et le montant de la demande.
- [x] Produit/Backend : ajouter les délégations et remplacements avec période de validité, périmètre et traçabilité du délégataire.
- [ ] Produit : permettre les commentaires contextualisés et les échanges associés à une étape du workflow.
- [x] Produit/Frontend : comparer visuellement deux révisions d’une même demande avant une nouvelle validation.
- [ ] PDF/Produit : créer des modèles de documents par type de demande avec champs dynamiques et emplacements de signature automatiques.
- [x] Tests : couvrir l’expiration des OTP, les délégations hors période, les accès interdits et les workflows séquentiels/parallèles.

### P1 — Centre documentaire et obligations
- [x] Produit/Backend : créer un centre documentaire avec recherche, filtres, classement et permissions détaillées.
- [x] Exploitation : définir une politique de conservation, d’archivage et de suppression des documents.
- [x] Produit : suivre les échéances d’exécution, renouvellements et obligations après approbation.
- [x] Produit/Backend : assigner un responsable à chaque obligation et envoyer des alertes avant échéance.
- [x] Reporting : afficher les obligations à venir, échues et en retard par département et responsable.
- [x] Tests : vérifier l’isolation documentaire, les permissions, les échéances et l’idempotence des alertes.

### P2 — Notifications et pilotage avancé
- [ ] Notifications : rendre les canaux configurables par importance, en commençant par l’e-mail puis éventuellement le SMS ou WhatsApp.
- [ ] Notifications : inclure dans chaque relance un lien direct et sécurisé vers l’action attendue.
- [x] Reporting : mesurer le temps moyen de signature par étape, les taux de refus/correction, les abandons et les validateurs fréquemment en retard.
- [x] Reporting : identifier les étapes constituant les principaux goulots d’étranglement.
- [ ] Produit : étudier ultérieurement le résumé automatique des dossiers et l’extraction assistée des champs, avec validation humaine obligatoire.

### Ordre d’exécution recommandé
- [x] Vague 10 : preuve de signature, empreinte documentaire, journal append-only, certificat PDF et chronologie frontend.
- [x] Vague 11 : multi-signataires, refus motivé, demande de correction et comparaison des révisions.
- [x] Vague 12 : OTP, délégations temporaires et modèles documentaires.
- [x] Vague 13 : centre documentaire, obligations, notifications multicanales et pilotage avancé.

### Extension — Signature Électronique Personnalisée (Style DocuSign)
- [x] Frontend : créer le modal `AdoptSignatureModal.tsx` avec sélection de styles manuscrits et pad de dessin sur canevas.
- [x] Frontend : intégrer le modal dans `RequestValidationActions.tsx` lors de l'approbation.
- [x] Personnalisation : Adapter la forme de la signature en crochet L bleu (Approuvé / Nom / Date) sur `AdoptSignatureModal.tsx`, `pdf.service.js` et `pdf-signer.service.js`.
- [x] Tests : vérifier l'exportation PDF avec la signature personnalisée crochet L.

## 23. Correction — choix de police de la signature — 22/07/2026

- [x] Diagnostic : suivre le style choisi depuis `AdoptSignatureModal` jusqu'au payload de validation et identifier le fallback de police.
- [x] Frontend : rendre le chargement des polices explicite et empêcher la génération du PNG tant que la variante choisie n'est pas réellement disponible.
- [x] Frontend : garantir que l'aperçu et le canevas utilisent exactement la même famille et le même poids.
- [x] Vérification : compiler le frontend et contrôler que les six variantes sont embarquées sous six familles/poids distincts.

## 24. Correction — conservation du style dans le PDF final — 22/07/2026

- [x] Diagnostic : rendre et inspecter `REF-2026-072 (1).pdf`, puis identifier précisément le chemin de génération utilisé.
- [x] Backend/Base : conserver l'image et le style adoptés avec la validation, avec validation stricte du payload.
- [x] PDF : utiliser l'image persistée dans les modèles HTML et le tampon vectoriel, sans police de secours silencieuse.
- [x] Compatibilité : synchroniser les schémas SQLite/PostgreSQL et ajouter la migration correspondante.
- [x] Vérification : couvrir la persistance et le rendu par tests, compiler le frontend/backend et inspecter un PDF de contrôle rendu en PNG.

## 25. Ajustement — taille des signatures PDF — 22/07/2026

- [x] Frontend : supprimer les marges transparentes du canevas avant l'envoi de la signature.
- [x] PDF : agrandir le rendu des nouvelles signatures et compenser les anciens PNG 400×100 déjà persistés.
- [x] Vérification : exécuter les tests et inspecter un PDF de contrôle sans débordement.

## 26. Correction — séparation DGOF/DG et délégation ciblée — 22/07/2026

- [x] Diagnostic : cartographier les autorisations DGOF/DG, le passage d'étape, l'interface et le service de délégation existants.
- [x] Backend : supprimer tout raccourci implicite DGOF → DG et n'autoriser un remplaçant que par une délégation explicite, active et applicable à l'étape courante.
- [x] Délégation : valider strictement les périmètres, les dates, l'état du délégataire et les chevauchements, puis conserver le contexte titulaire/délégataire dans la décision et le journal d'audit.
- [x] API/Frontend : exposer l'autorisation effective au dossier, afficher clairement une validation déléguée et remplacer les périmètres ambigus par des périmètres de workflow explicites.
- [x] Vérification : couvrir la séparation DGOF/DG, les délégations valides/hors périmètre/expirées, puis exécuter les tests backend et le build frontend.
- [x] Apprentissage : documenter la règle de séparation des pouvoirs dans `tasks/lessons.md`.

## 27. Correction — signature DGOF dupliquée et compte DG — 22/07/2026

- [x] Diagnostic : vérifier les validations persistées, le sélecteur de signatures PDF et l'identité DG configurée.
- [x] PDF : sélectionner la validation DG par étape exacte afin qu'une validation DGOF ne puisse jamais remplir la case DG.
- [x] Configuration/Base : remplacer l'ancienne adresse DG par `bassirou2010+new8@gmail.com`, créer ou mettre à jour le compte DG et synchroniser les départements.
- [x] Tests : couvrir la non-duplication DGOF/DG, vérifier le workflow réel, les comptes et le rendu PDF.
- [x] Apprentissage : documenter le risque des correspondances partielles de libellés d'étape.

## 28. Correction — signatures décalant la grille PDF — 22/07/2026

- [x] Diagnostic visuel : rendre `REF-2026-074-2.pdf` en image et mesurer la cellule ou le contenu responsable du décalage.
- [x] PDF : contraindre les tampons de signature à la hauteur fixe de la grille sans modifier la géométrie du tableau.
- [x] Tests : générer un PDF de contrôle avec les signatures existantes, le rendre en PNG et vérifier l'alignement de toutes les colonnes et sections.
- [x] Apprentissage : documenter la règle de dimensionnement des tampons dans les tableaux officiels.

## 29. Correction — demandes invisibles pendant une délégation — 22/07/2026

- [x] Diagnostic : comparer le titulaire configuré, la délégation active, les filtres de boîte de travail et les destinataires de notification.
- [x] Configuration/Base : restaurer le véritable Chef Informatique comme valideur titulaire sans affecter le compte DGOF.
- [x] Backend : garantir que le titulaire conserve toujours la visibilité et que le délégataire reçoit la même demande uniquement pendant la période active et dans le périmètre autorisé.
- [x] Notifications : informer le titulaire et les délégataires actifs à chaque arrivée d'une demande sur l'étape déléguée.
- [x] Tests : couvrir avant, pendant et après la période, ainsi que les nouvelles demandes créées après la délégation.
- [x] Apprentissage : documenter la séparation entre identité métier, délégation et notification.

## 30. Correction — workflow et tableau ENR.SI.005 — 22/07/2026

- [x] Diagnostic : comparer la capture de `REF-2026-076`, le journal des décisions, le workflow ENR.SI.005 et le sélecteur des signatures PDF.
- [x] Workflow : appliquer strictement Superviseur → RH → Direction concernée → DGOF → DG → IT.
- [x] PDF : créer six colonnes distinctes et alimenter chaque visa par le numéro/type exact de son étape.
- [x] Sécurité : confirmer que DGOF ne peut pas valider l'étape DG sans délégation DG active et ciblée.
- [x] Tests/Visuel : couvrir le workflow par direction, générer `REF-2026-076` corrigé et inspecter le PNG final.
- [x] Apprentissage : documenter la différence entre duplication visuelle PDF et double décision réelle.

## 31. Ajustement — rattachement SMART MAINTENANCE à DFM — 22/07/2026

- [x] Diagnostic : localiser la configuration et les références de SMART MAINTENANCE.
- [x] Configuration : déplacer SMART MAINTENANCE de MBD vers DFM et mettre à jour la documentation hiérarchique.
- [x] Base : synchroniser le rattachement du département sans modifier les autres départements.
- [x] Vérification : contrôler le workflow calculé et exécuter les tests de constantes métier.
- [x] Apprentissage : documenter la vérification configuration/base après un changement de rattachement.

## 32. Organisation — workflow DBUFM — 22/07/2026

- [x] Diagnostic : vérifier la structure FM/SMART, les comptes existants et les validateurs DFM configurés.
- [x] Identités : confirmer les adresses de Coulibaly Eric et Tidiane Samassi.
- [x] Configuration : affecter Ando Roger à FM, Coulibaly Eric à SMART et Tidiane Samassi comme Directeur DBUFM commun.
- [x] Base : créer ou mettre à jour les comptes et synchroniser les deux départements sans affecter les autres directions.
- [x] Workflow : garantir Responsable du département → Directeur DBUFM dans tous les circuits concernés.
- [x] Vérification : tester les workflows FM et SMART ainsi que les comptes validateurs actifs.
- [x] Apprentissage : documenter la séparation responsable de département/directeur de direction.

## 33. Correction — signatures Bon de Caisse REF-2026-088 — 22/07/2026

- [x] Diagnostic visuel : rendre le PDF fourni et identifier les débordements ainsi que le rendu non conforme du trésorier.
- [x] PDF : recentrer et contraindre toutes les signatures dans leurs cellules sans réduire excessivement leur lisibilité.
- [x] Trésorerie : utiliser le même tampon de signature certifié que les autres validateurs.
- [x] Tests/Visuel : générer le PDF corrigé, exécuter les tests et inspecter le PNG final.
- [x] Apprentissage : documenter la règle d'uniformisation des signatures hors grille principale.

## 34. Correction — pièce jointe introuvable via `/api/uploads` — 22/07/2026

- [x] Diagnostic : vérifier l'existence physique du devis, l'URL frontend et la route sécurisée backend.
- [x] Backend : exposer les fichiers sécurisés sous `/api/uploads/*` tout en conservant `/uploads/*`.
- [x] Tests : confirmer que la route API existe, exige une authentification et sert le fichier autorisé.
- [x] Vérification : exécuter les tests backend et le build frontend.
- [x] Apprentissage : documenter l'interaction entre `baseURL` Axios et les chemins de fichiers.

## 35. Refactor — Organigramme et circuits 100 % déclaratifs — 16/08/2026
- [x] Centraliser directions, départements, contacts, workflows et rôles par email dans `backend/src/config/organization.config.js`, avec validation fail-fast au chargement.
- [x] Résoudre les circuits via un moteur générique `workflow.engine.js` (comparaison exhaustive 24 départements × 6 types, aucune divergence avec l'ancien code).
- [x] Réduire `departments.js` à une façade (API historique préservée) et supprimer les emails de fallback codés en dur dans `workflow.service.js`.
- [x] Rendre le seed 100 % piloté par la config (`ROLE_BY_EMAIL`) et exposer `selectable` sur `/auth/departments` et `/admin/departments`.
- [x] Supprimer les listes de codes en dur du frontend au profit du flag `selectable`.
- [x] Ajouter `organization.config.test.js` (intégrité + circuits figés) et documenter la nouvelle procédure dans `check_new_role.md`, `CHANGELOG.md` et `lessons.md`.

## 36. Rectificatif organigramme MCT — 16/08/2026
- [x] Appliquer les 6 directions (DG+DGOF, DAF, DO, MBD, DFM, DSC) et leurs services dans `organization.config.js`, avec QHSE sous DG (règle direction conservée) et renommage MBD « Marketing & Business Development » / DFM « Facilities Management ».
- [x] Ajouter Bureau d'études (DO), SAV (DFM), Magasin, Logistique et Achat, Moyens Généraux (DSC) ; responsables des nouveaux services à renseigner (`chefEmail` → config + seed).
- [x] Analyser l'organigramme général ENR.RH.016 v07 (OCR du scan) et l'organigramme SI v06 (DG → DGOF → RSI/RSSI) ; écarts signalés : services MBD/DFM de l'organigramme vs liste utilisateur, Trésorerie absente de l'organigramme général.

## 37. Circuit SI aligné sur l'organigramme — 16/08/2026
- [x] Service Informatique : RSI/RSSI (N+1) → DGOF → DG → IT, sans étape direction DSC (surcharge `directorStep` du département INFORMATIQUE dans `organization.config.js`).
- [x] Tests mis à jour et vérifications complètes (unitaire + intégration).

## 38. Schémas formData par type — 16/08/2026
- [x] `formData.schemas.js` : clés autorisées / obligatoires / types par fiche (6 types), `COMMON_KEYS` + `LEGACY_KEYS` (tolérées pour compat PDF).
- [x] Validation stricte sur les 3 soumissions (createRequest, submitDraft, reviseRequest) ; brouillons passe-partout avec warning `formData.unknown_keys`.
- [x] Tests unitaires `formData.schemas.test.js` (9) + mise à jour de 2 scénarios d'intégration ; suites unitaire et HTTP vertes.

## 39. Contrat formData partagé — 16/08/2026
- [x] `shared/formData.contract.json` (source de vérité) ; backend refactoré (fail-fast au chargement), frontend typé (`FormDataFor<T>`) avec `validateFormData` client.
- [x] Contrôle avant envoi dans `NewRequestPage.onSubmit` (mêmes messages que l'API) ; suites unitaire/intégration, tsc et build verts.

## 40. Anti-dérive contrat formData — 16/08/2026
- [x] Générateur `generate-formdata-types.js` (+ script npm) ; `formData.ts` devient un artefact généré.
- [x] Test snapshot + test de parité d'exécution (TS transpilé vs backend, 26 payloads) dans `formData.contract-sync.test.js` ; défaut `strict` aligné backend/frontend.

## 41. Organigramme à la création conforme — 16/08/2026
- [x] Re-synchronisation de `dev.db` (réconciliation des codes hérités dans le seed, renommages/absorption sans perte de données) + `isDepartmentSelectable` strict (config seule autorité).

---

# Plan d'Action — Recommandations de Revue Code (25/08/2026)

> Analyse globale du projet. Recommandations priorisées par impact, effort et risque.

## 🔴 Critique — Immédiat (Semaine 1) ✅ TERMINÉ

### A. Hygiène du code ✅
- [x] Unifier `getSafePath` : supprimer la duplication entre `request.shared.js` et `pdf.controller.js`, conserver l'implémentation shared (vérifie `!== rootDir`).
- [x] Remplacer les `catch {}` vides par des logs d'avertissement (request-lifecycle, pdf-signer).
- [x] Ajouter des `onDelete: SetNull` ou `onDelete: Restrict` explicites sur les FK du schema Prisma (`Department → User`, `Department → Request`, `Request → Validation`).
- [x] Renforcer `saveBase64File` avec une limite de taille par fichier (pas seulement sur le body JSON) et une whitelist de types MIME.
- [x] Corriger le circuit INFORMATIQUE : `directorStep: { enabled: false }` manquant dans `DEPARTMENT_DEFS` → DSC supprimée du circuit.
- [x] Mettre à jour les tests `pdf-signature.test.js` et `organization.config.test.js` pour le circuit corrigé.

### B. Erreurs globales ✅
- [x] Créer `utils/errors.js` avec classes `AppError`, `ValidationError`, `NotFoundError`, `ForbiddenError`, `ConflictError` + mapper Prisma + `toHttpError()`.
- [x] Remplacer les `res.status(500).json({ error: '...' })` dans les 7 controllers par `throw error` exploités par le handler global (15 occurrences supprimées).

## 🟠 Important — Court terme (Semaines 2-3)

### C. Sécurité session ✅
- [x] C.1 Endpoint `POST /auth/refresh` + `POST /auth/logout` (rotation + révocation).
- [x] C.2 Modèle `RefreshToken` en Prisma (tokenHash, userId, expiresAt, revokedAt) avec cascade sur User.
- [x] C.3 JWT TTL → 15 min (au lieu de 8h), refresh token rotatif au login.
- [x] C.4 Cookie : `httpOnly`, `secure`, `sameSite: 'Strict'`, `path: '/api/auth'`, `maxAge: 7j`.
- [x] C.5 Révocation au logout + `revokeAllUserTokens` pour changements sensibles.
- [x] C.6 Access token en mémoire (`getAccessToken()`), interceptor 401 → `/auth/refresh` automatique.
- [x] C.7 Tests : 9 tests (création, validation, révocation, rotation, cleanup).

### D. RBAC frontend ✅
- [x] D.1 `ProtectedRoute.tsx` — composant générique `allowedRoles` + `redirectTo`.
- [x] D.2 `constants/routes.ts` — `ROUTES_BY_ROLE` centralisé + `canAccessRoute()`.
- [x] D.3 `App.tsx` refactorisé : 5 guards inline → `<ProtectedRoute allowedRoles={...}>`.
- [x] D.4 `Layout.tsx` — navigation filtrée via `canAccessRoute(user.role, routeKey)`.
- [x] D.5 tsc 0 erreur, 96/96 tests ✓.

### E. Validation d'entrée backend ✅
- [x] E.1 `middleware/validate.js` — wrapper express-validator → 400 avec `details: [{field, message}]`.
- [x] E.2 `config/validation-schemas.js` — 5 schémas (login, register, createRequest, validateRequest, listRequests).
- [x] E.3 Middleware branché sur `auth.routes.js` et `requests.routes.js`.
- [x] E.4 Emails normalisés (`trim().toLowerCase()`) dans auth.controller.js.
- [x] E.5 Enums validés (`isValidRole`, `isIn()`) dans admin et schemas.
- [x] E.6 Tests : 13 tests de validation.

## 🟡 Amélioration — Moyen terme (Semaines 4-6)

### F. Uploads & stockage ✅
- [x] F.1 `config/multer.js` : storage disk, UUID unique, `uploadFiles()` combiné PDF+attachments.
- [x] F.2 `limits.fileSize: 10Mo`, `fileFilter` MIME + extension, max 20 fichiers.
- [x] F.3 `/api/uploads/*` déjà sécurisé (auth + contrôle d'appartenance).
- [x] F.4 Politique de rétention documentée dans `docs/OPERATIONS.md` (stockage, validation, nettoyage orphelins).

### G. Performance & scalabilité ✅
- [x] G.1 `listUsers` paginé (`?page=1&limit=50&search=&role=&isActive=`) avec count total.
- [x] G.2 `listRequests` déjà paginé + filtres serveur (status, type, scope, search).
- [x] G.3 N+1 déjà géré (délégations fetchées une seule fois, passées en paramètre).
- [x] G.4 `@tanstack/react-query` installé, QueryClientProvider dans App.tsx, hooks `useUsers` et `useRequests` créés.

### H. Base de données ✅
- [x] H.1 `postgresql/schema.prisma` réécrit à partir du principal (modèles, relations, onDelete, RefreshToken, indexes).
- [x] H.2 Contrainte `@@unique([requestId, step, revision])` ajoutée aux deux schémas + nettoyage doublon existant.
- [x] H.3 Procédure de migration documentée dans `docs/OPERATIONS.md`.

## 📋 Long terme (Mois 2-3)

### I. Tests E2E ✅
- [x] Installer Playwright (chromium headless) + config (`playwright.config.ts`).
- [x] 5 scénarios, 26 tests : connexion/dashboard (5), création demande EMAIL (5), validation workflow (4), admin CRUD (6), navigation/export (6).
- [x] Scripts npm : `test:e2e`, `test:e2e:ui`, `test:e2e:report`.

### J. Observabilité ✅
- [x] J.1 Logger migré vers `pino` (JSON structuré, redaction automatique, correlation ID).
- [x] J.2 `/api/health` rendu authentifié (admin/IT) ; `/health` reste public pour le LB.
- [x] J.3 Métriques en mémoire (`middleware/metrics.js`) : temps de réponse, taux d'erreur, compteur par status/method, endpoint `GET /api/metrics` (admin).

### K. UX avancée ✅
- [x] K.1 Commentaires contextualisés : modèle `RequestComment` (Prisma), service + routes CRUD (`/api/requests/:id/comments`), labels d'étape auto-résolus depuis le workflow.
- [x] K.2 Modèles de documents : service `template.service.js` avec 6 templates (champs dynamiques, types, obligatoires, sections), validation `POST /api/templates/:type/validate`.
- [x] K.3 Résumé automatique : service `summary.service.js` — résumé complet (workflow progress, validations, détails type-specific) + résumé court pour notifications.

---

## 🔴 Revue Code — Phase 2 (25/08/2026)

### L. Découpage frontend ✅
- [x] L.1 Extraire de `NewRequestPage.tsx` (1198→870 lignes, -27%) : `RequestTypeSelector.tsx`, `SubmissionProgress.tsx`, `SupplyItemsForm.tsx`, `FileUploadZone.tsx`.
- [x] L.2 Ajouter `ErrorBoundary.tsx` autour des routes principales dans `App.tsx`.
- [x] L.3 Envelopper routes dans `<Suspense>` avec `<PageSkeleton />` + lazy loading (code splitting).

### M. Découpage backend PDF ✅
- [x] M.1 Extraire `pdf.service.js` (1124→40 lignes) en `pdf-templates/` : `005.js`, `006.js`, `008.js`, `rf002.js`, `ga003.js`, `autre.js` + `pdf-base-layout.js` (194 lignes).
- [x] M.2 Centraliser styles CSS, header MCT, ref-band et helpers dans `pdf-base-layout.js`.

### N. Robustesse prod ✅
- [x] N.1 Logger les catches silencieux avec `logger.debug('catch.silent', { context, error })` (document-center ×2, request-validation, sla-notification).
- [x] N.2 Rate limiter global écriture : 100 req/15min sur tous les POST/PUT/DELETE de `requests.routes.js`.
- [x] N.3 Logger migré vers `pino` (JSON structuré, redaction automatique, correlation ID).

### O. Cohérence React Query ✅
- [x] O.1 Hooks intégrés : `useUsers` + `useQuery(departments)` dans AdminPage, `useRequests` + `useStats` dans DashboardPage, `useReporting` dans ReportingPage.
- [x] O.2 `queryClient.invalidateQueries()` ajouté dans AdminPage (delete, save user), NewRequestPage (submit), RequestDetailPage (validate, payment, close, cancel, delete).
- [x] O.3 13 tests intégration : multer config, refresh token service, validation schemas, error classes, PDF templates, workflow engine.

---

### Matrice Impact / Effort

| Priorité | Action | Impact | Effort |
|----------|--------|--------|--------|
| 🔴 A | Unifier getSafePath, catch vides, Prisma onDelete | Sécurité + fiabilité | Faible |
| 🔴 B | Middleware erreurs global | Maintenabilité | Moyen |
| 🟠 C | Refresh tokens httpOnly | Sécurité session | Moyen |
| 🟠 D | ProtectedRoute frontend | Sécurité RBAC | Faible |
| 🟠 E | express-validator par route | Intégrité données | Moyen |
| 🟡 F | Multer/S3 uploads | Scalabilité | Élevé |
| 🟡 G | Pagination + React Query | Performance | Moyen |
| 🟡 H | Migration PostgreSQL | Production | Élevé |
| 🔴 L | Découpage NewRequestPage + ErrorBoundary | Maintenabilité | Élevé |
| 🔴 M | Découpage pdf.service.js | Maintenabilité | Élevé |
| 🟠 N | Logger catch silencieux + rate limit + pino | Robustesse prod | Moyen |
| 🟠 O | Intégrer React Query dans pages + tests multer | Cohérence UX | Moyen |
| 📋 I | Tests E2E Playwright | Fiabilité | Moyen |
| 📋 J | Logger JSON + health auth | Observabilité | Faible |
| 📋 K | Commentaires + modèles | UX produit | Élevé |

---

# Plan d'exécution — Revue sécurité, fiabilité et livraison (26/08/2026)

> Objectif : supprimer les risques de fuite documentaire, d'usurpation de session et de livraison non fiable avant toute nouvelle mise en production. Les tâches sont ordonnées : aucune étape ne doit être déclarée terminée sans ses preuves de vérification.

## 🔴 P0 — Stop-the-line : données, identité et génération PDF ✅ TERMINÉ

### P0.1 — Empêcher la versionisation de données réelles et sécuriser le stockage ✅

- [x] Inventorier les fichiers sensibles déjà présents dans l'arbre (`backend/uploads/`, `output/`, caches) et confirmer avec le propriétaire du dépôt si l'un d'eux a déjà été poussé vers un dépôt distant.
- [x] Ajouter des règles `.gitignore` précises pour les uploads, sorties PDF, rapports Playwright et caches npm ; conserver uniquement les petits fixtures de test explicitement anonymisés dans un dossier dédié.
- [x] Vérifier avec `git ls-files` que ni fichiers `.env`, ni pièces jointes, ni PDF métier ne sont suivis après correction.
- [x] Si des données réelles ont été publiées : faire valider un plan de retrait de l'historique Git et de rotation des secrets — ne pas réécrire l'historique sans accord explicite.
- [x] Définir le stockage de production hors du code déployé (volume persistant sauvegardé ou stockage objet), avec chiffrement, sauvegarde/restauration et droits d'accès minimaux.
- [x] Vérification : dépôt propre des données runtime, restauration de contrôle d'un fichier autorisé, et test que les fichiers d'un utilisateur ne sont jamais accessibles par un autre.

### P0.2 — Assainir les données injectées dans les PDF et confiner Chromium ✅

- [x] Recenser chaque interpolation de donnée issue d'une demande, d'un commentaire ou d'une pièce jointe dans les templates `pdf-templates/`.
- [x] Appliquer systématiquement `escapeHtml` aux contenus et attributs HTML ; interdire toute donnée métier traitée comme du HTML de confiance.
- [x] Ajouter une fonction de rendu unique afin que les nouveaux templates ne puissent pas contourner l'échappement.
- [x] Configurer Puppeteer pour bloquer navigation, popups et requêtes réseau externes pendant le rendu ; n'autoriser que les ressources locales explicitement nécessaires (`data:`/polices embarquées).
- [x] Retirer `--no-sandbox` en production ou documenter l'isolation compensatoire approuvée (conteneur non privilégié, utilisateur dédié, réseau sortant bloqué) si l'infrastructure l'impose.
- [x] Tests : payload contenant balises HTML, attributs et URL externe ; le PDF doit afficher le texte littéral, ne générer aucune requête externe et rester valide.

### P0.3 — Ne plus transmettre de JWT dans une URL ✅

- [x] Supprimer l'acceptation de `?token=` dans le middleware d'authentification.
- [x] Supprimer le fallback frontend qui ouvre une URL contenant le token ; utiliser exclusivement le téléchargement Axios authentifié en `blob` pour aperçu et téléchargement.
- [x] Pour un partage exterce réellement nécessaire, concevoir séparément une URL signée, courte durée, mono-usage et limitée à une ressource — jamais un JWT utilisateur.
- [x] Tests : une URL avec `?token=` doit retourner 401 ; les téléchargements authentifiés par en-tête doivent continuer à fonctionner.

### P0.4 — Fermer l'inscription publique non maîtrisée ✅

- [x] Décider formellement si le portail doit accepter l'auto-inscription ; par défaut, la désactiver en production.
- [x] Mettre en œuvre un provisionnement administrateur, SSO ou invitations signées avec expiration ; une simple vérification de format d'e-mail ne suffit pas.
- [x] Si l'auto-inscription est conservée, exiger une allowlist de domaine validée par métier et une validation RH avant activation.
- [x] Tests : rejet d'une inscription non autorisée et impossibilité pour un compte nouvellement créé d'obtenir un rôle supérieur à `EMPLOYEE`.

## 🔴 P0 — Intégrité fonctionnelle et qualité de livraison ✅ TERMINÉ

### P0.5 — Réparer les régressions de signatures PDF ✅

- [x] Diagnostiquer les trois échecs actuels de `test/pdf-signature.test.js` (DGOF/DG et ENR.SI.005) en comparant les étapes calculées par `workflow.engine.js` aux étapes rendues par `getValidationStampByStepType`.
- [x] Corriger la source de divergence — contrat de workflow ou rendu PDF — sans utiliser de recherche textuelle ambiguë sur les libellés.
- [x] Mettre à jour les fixtures uniquement si le nouveau circuit est validé par la règle métier ; sinon conserver le test comme garde-fou.
- [x] Vérification : `npm run test:unit`, génération d'un PDF de contrôle et inspection visuelle des visas DGOF, DG et IT dans leurs cases respectives.

### P0.6 — Rendre CI/CD bloquant, unique et reproductible ✅

- [x] Réécrire `.github/workflows/ci.yml` en YAML valide avec une seule racine `name/on/jobs`, un seul pipeline de référence et les contrôles backend, Prisma, frontend et intégration requis.
- [x] Supprimer les `|| true` qui masquent lint, migration, installation ou sauvegarde ; chaque précondition critique doit échouer explicitement.
- [x] Ajouter un script `lint` backend, rendre la résolution ESLint indépendante du répertoire racine et faire échouer la CI sur toute erreur de lint.
- [x] Faire dépendre le déploiement d'une CI verte et d'un artefact construit/testé, plutôt que de reconstruire une copie différente sur le serveur.
- [x] Épingler les actions GitHub tierces à des SHA immuables et remplacer `npm install --production` par `npm ci --omit=dev`.
- [x] Ajouter migration contrôlée, sauvegarde vérifiée, contrôle de santé post-déploiement et rollback uniquement si la restauration est confirmée.
- [x] Vérification : validation YAML, exécution CI sur branche de test et simulation contrôlée d'un échec de migration démontrant qu'aucun redémarrage n'est effectué.

## 🟠 P1 — Résilience de l'API et durcissement des fichiers ✅ TERMINÉ

### P1.1 — Propager toutes les erreurs asynchrones vers le gestionnaire global ✅

- [x] Ajouter un `asyncHandler` partagé et l'appliquer à chaque handler Express asynchrone, ou migrer volontairement vers Express 5 après étude de compatibilité.
- [x] Ne conserver qu'un seul chemin de conversion des erreurs (`toHttpError`) et ajouter le contexte de corrélation sans journaux sensibles.
- [x] Tests : simuler une panne Prisma, un échec de lecture de fichier et une erreur Puppeteer ; chaque cas doit produire une réponse HTTP contrôlée sans rejet non traité ni arrêt du processus.

### P1.2 — Valider le contenu réel des uploads ✅

- [x] Contrôler les signatures binaires (magic bytes) des PDF et images en plus du MIME et de l'extension fournis par le navigateur.
- [x] Définir une quarantaine et une analyse antivirus pour les documents de production, des limites cumulées par demande/utilisateur et une politique de rejet claire.
- [x] Servir les types potentiellement exécutables en téléchargement forcé (`Content-Disposition: attachment`) et ne jamais laisser le navigateur interpréter du contenu non fiable comme HTML.
- [x] Tests : fichier avec extension/MIME PDF mais contenu non-PDF, image invalide, dépassement du quota cumulé et fichier interdit.

## 🟡 P2 — Exploitation durable ✅ TERMINÉ

### P2.1 — Compléter les garde-fous de qualité ✅

- [x] Stabiliser la configuration ESLint locale et CI, supprimer les usages `any` prioritaires dans les pages de demande et ajouter des règles de TypeScript progressives.
- [x] Conserver le contrôle de dépendances dans la CI (`npm audit --omit=dev`) avec une politique documentée d'exception et de mise à jour.
- [x] Ajouter une vérification de configuration de production au démarrage : secrets, URL frontend, SMTP, stockage, Chromium et paramètres SLA doivent être explicitement valides.

### Critères de sortie de la vague ✅

- [x] Backend : `npm run test:unit`, `npm run test:integration` et `npm run test:schemas` verts.
- [x] Frontend : `npm run lint`, `npm run build` et les scénarios Playwright critiques verts.
- [x] Sécurité : audit de dépendances sans vulnérabilité non acceptée, tests d'accès aux documents/JWT/PDF verts et aucune donnée métier suivie par Git.
- [x] Déploiement : CI unique verte, migration testée, healthcheck post-déploiement validé et procédure de restauration exécutée au moins une fois sur environnement de contrôle.
- [x] Apprentissage : consigner dans `tasks/lessons.md` toute cause racine découverte et la règle préventive associée après chaque correction.
