# Historique du Projet ERP MCT IT (Changelog)

Ce document répertorie l'historique complet des phases terminées et cochées du projet.

---

## Phase 1 — Fondations
- [x] Setup monorepo (backend/ + frontend/)
- [x] Prisma schema (users, departments, requests, validations, email_logs)
- [x] Config PostgreSQL + variables d'environnement
- [x] Auth routes (login, logout, me) — JWT + bcrypt
- [x] Middleware auth + role
- [x] API CRUD requests
- [x] API validations (approve/reject)
- [x] departments.config.js — hiérarchie MCT complète
- [x] workflow.service.js — moteur de workflow par type de demande

## Phase 2 — Formulaires & Emails
- [x] email.service.js (Nodemailer)
- [x] Templates email HTML (validation + clôture)
- [x] Routage email automatique par département demandeur
- [x] Routes API: ENR.SI.005, ENR.SI.006, ENR.SI.008, Autre IT

## Phase 3 — PDF
- [x] Template HTML ENR.SI.005 (fidèle au formulaire officiel)
- [x] Template HTML ENR.SI.006
- [x] Template HTML ENR.SI.008
- [x] pdf.service.js (Puppeteer)
- [x] Route GET /requests/:id/pdf

## Phase 4 — Frontend React
- [x] Setup React + TailwindCSS + React Router
- [x] Page Login
- [x] Dashboard Employé
- [x] Formulaires de création (4 types)
- [x] Suivi de demande (timeline)
- [x] Dashboard Valideur (file d'attente)
- [x] Dashboard Service IT
- [x] Dashboard Admin (gestion users)
- [x] Bouton "Imprimer la fiche" (PDF)

## Phase 5 — Gestion Trésorerie
- [x] Rôle `TREASURY` dans le schéma Prisma et la base de données
- [x] Script de Seed automatique pour générer tous les responsables et le Trésorier
- [x] Insertion de l'étape de Trésorerie dans les workflows ENR.SI.008, ENR.SI.006 et AUTRE
- [x] Formulaire de saisie du montant payé et référence de transaction dans le front-end
- [x] Encart récapitulatif de règlement violet sur la fiche détaillée
- [x] Tableau de bord Trésorerie complet (statistiques, listes filtrables)
- [x] Export de l'historique financier des paiements au format CSV

## Phase 6 — Intégration du Bon de Caisse (ENR.RF.002)
- [x] Backend : Mise à jour du schéma Prisma (champs `uploadedPdfPath` et `attachments` dans le modèle `Request`)
- [x] Backend : Synchronisation de la base de données locale (Prisma db push)
- [x] Backend : Création du service de signature `pdf-signer.service.js` (remplissage dynamique des cases de signature 1 à 6 et du pavé Trésorerie via `pdf-lib`)
- [x] Backend : Intégration du workflow de validation à 7 étapes (Demandeur ➔ Chef Service ➔ Directeur ➔ DAF ➔ DGOF ➔ DG ➔ Trésorerie)
- [x] Backend : Clôture directe de la demande et envoi automatique de l'email de confirmation de règlement par la Trésorerie (sans étape IT)
- [x] Frontend : Formulaire de demande Bon de Caisse (téléchargement du modèle vierge + upload obligatoire du PDF rempli et d'au moins 1 pièce justificative)
- [x] Frontend : Affichage de la liste des pièces justificatives jointes et téléchargement du PDF final signé sur la page détaillée

## Phase 7 — Tests & Déploiement
- [x] Tests endpoints API
- [x] Tests génération PDF

## Phase 8 — Ajustements & Corrections (Workflow Bon de Caisse)
- [x] Routage de l'étape Direction pour la division Direction Générale (Informatique/Secrétariat) vers la DSC (Mohamed KONE)
- [x] Remplacement de l'adresse email DAF par `maintenance.smartsa@gmail.com` et mise à jour de la base de données via seed
- [x] Résolution de l'affichage des détails de règlement (montant demandé, motif) et du fichier Bon de Caisse (ENR.RF.002) uploade sur la page détaillée du frontend
- [x] Intégration d'un circuit de validation visuel permanent (stepper de suivi) affichant tous les niveaux de validation et l'avancement en temps réel sur la fiche détaillée du frontend
- [x] Résolution du crash du serveur backend (PrismaClientValidationError lié à l'utilisation non supportée de 'omit') dans `auth.controller.js` et `admin.controller.js`
- [x] Ajout du département "Direction Générale" à la liste des départements (dans `departments.js` et en base de données)
- [x] Ajout du rôle DAF dans l'application et du département "DAF" dans les configurations
- [x] Ajout du rôle DGOF avec les mêmes règles de filtrage/statistiques que le Directeur
- [x] Ajout d'une fonctionnalité de prévisualisation directe des documents (PDF et images) sans téléchargement préalable
- [x] Alignement de type : Ajout de `currentStep` sur l'interface Request (frontend) et dans le formateur API (backend) pour corriger les erreurs de compilation du stepper
- [x] Possibilité pour l'administrateur de supprimer des demandes (avec suppression en cascade en base de données et nettoyage physique des fichiers PDF/justificatifs du disque)
- [x] Restriction de la visibilité des demandes et des statistiques sur le tableau de bord à l'utilisateur connecté (ses demandes, demandes à valider ou validées)
- [x] Personnalisation du statut d'une demande par un badge pulsant violet "Votre décision requise" lorsqu'elle est en attente d'approbation par l'utilisateur connecté
- [x] Remplacement des statuts de validation génériques ("Validation N+1", "Validation N+2") par le nom de l'étape et de la direction/fonction concernée (ex : "Validation : Direction des Opérations")
- [x] Ajout de la Direction des Opérations (DO) comme département autonome dans la configuration et la base de données (seeding)
- [x] Remplacement de l'appellation "Direction des Moyens et des Biens Durables" par "Management Business Development" dans le frontend (NewRequestPage.tsx), le backend (departments.js) et la base de données (seeding)
- [x] Modification du libellé des pièces justificatives dans le formulaire de création (ajout de la mention des mémos et autres justificatifs)
- [x] Résolution de la collision de clé unique (`reference`) lors de la création d'une demande après la suppression d'anciennes demandes en recherchant dynamiquement le numéro max de l'année
- [x] Restructuration complète du circuit de validation pour les Actifs Informatiques (ENR.SI.008) (6 étapes de validation, suppression de la Trésorerie, et routage DSC pour la DG)
- [x] Suppression de l'import obligatoire des proformas par l'IT lors de la génération du mémo (zone proforma retirée du formulaire frontend et de la validation backend)
- [x] Gestion de la multi-validation flexible DGOF / DG (n'importe lequel peut signer/valider pour compléter) et clôture automatique finale
- [x] Adaptation du template HTML/PDF d'actifs pour intégrer les 6 signatures officielles (Demandeur, Chef Service, Direction, DGOF, DG, IT)

## Phase 9 — Mémo d'attribution des Actifs Informatiques (Moyens Généraux)
- [x] Base de données : Ajout des colonnes de mémo dans Prisma (`memoMaterial`, `memoSpecs`, `memoScreenSize`, `memoAccessories`, `memoSentAt`) et synchronisation de la BDD
- [x] Backend : Configuration de l'email d'Adom Pierre (`smartmaintenance@mct.ci`) comme contact fixe pour les Moyens Généraux
- [x] Backend : Création du service d'envoi d'email pour le mémo d'attribution avec mise en forme moderne
- [x] Backend : Logique de validation et de persistance des informations du mémo lors de l'approbation de l'étape finale IT (sans proformas)
- [x] Backend : Déclenchement automatique de l'email de mémo et mise à jour de `memoSentAt` lors de la clôture de la demande
- [x] Frontend : Formulaire de saisie interactive des champs du mémo pour l'IT (modèle et caractéristiques requis, écran et accessoires optionnels, sans zone proforma)
- [x] Frontend : Encart récapitulatif du mémo d'attribution en lecture seule affiché sur les demandes d'actifs clôturées
- [x] Backend : Résolution de l'affichage des détails de demandes dans les exports PDF (ajout du parsing JSON sur `formData` et correction du mappage des clés : `itAssets`, `softwareLicenses`, `accessPrivileges`, `requestReason`, `memoNumber`, `printObject`)

## Phase 10 — Clôture Manuelle & Notifications aux Signataires
- [x] Backend : Passage de toutes les demandes IT (ENR.SI.008, ENR.SI.005, ENR.SI.006, AUTRE) au statut `PROCESSING` (En cours de traitement) après validation IT finale
- [x] Backend : Envoi automatique du mémo d'attribution aux Moyens Généraux (uniquement pour ENR.SI.008) tout en laissant la demande active
- [x] Backend : Logique de clôture manuelle (`closeRequest`) avec notification e-mail généralisée à tous les validateurs/signataires
- [x] Frontend : Affichage d'un formulaire et bouton "Clôturer la demande" pour les profils IT/ADMIN sur les demandes en cours de traitement, avec libellés et placeholders dynamiques
- [x] Frontend : Mise à jour des types de statut et traduction en français ("En cours de traitement")
- [x] Vérification : Scripts de test d'intégration de bout en bout validés pour les actifs et adresses e-mails

## Phase 11 — Espace Moyens Généraux
- [x] Backend : Ajout du rôle `MOYENS_GENERAUX` dans les commentaires du schéma et seeding de l'utilisateur `pierre.adom@mct.ci` avec le mot de passe `Moyens@MCT2026`
- [x] Backend : Restriction de `listRequests`, `getStats`, `getRequest` et `exportRequestsCSV` pour le rôle `MOYENS_GENERAUX` aux demandes validées (`PROCESSING` et `CLOSED`)
- [x] Frontend : Intégration du rôle `MOYENS_GENERAUX` dans les types globaux et l'administration des utilisateurs
- [x] Frontend : Création du tableau de bord Moyens Généraux `MoyensGenerauxDashboardPage.tsx` avec statistiques, filtres, recherche et export CSV
- [x] Frontend : Ajout du lien "Moyens Généraux" dans la barre de navigation latérale et protection de la route associée
- [x] Vérification : Test automatique `test_mg_access.js` validé et build frontend `npm run build` réussi

## Phase 12 — Refonte UI : Pages Login, Register & Dashboard
- [x] Frontend : Refonte de `LoginPage.tsx` — design split-screen premium avec panneau gauche sombre (gradients, glow animé, cartes glassmorphism, logo MCT), panneau droit avec formulaire épuré et spinner de chargement
- [x] Frontend : Refonte de `RegisterPage.tsx` — même système split-screen, indicateur de force du mot de passe en temps réel, validation visuelle live sur le champ de confirmation, organisation en grilles fluides
- [x] Frontend : Refonte de `DashboardPage.tsx` — en-tête avec salutation contextuelle (matin/après-midi/soir), cartes de statistiques colorées avec gradient et icônes, raccourcis de création par type de demande, tableau modernisé avec badges monospace, icônes par type et bouton "Voir" pill stylisé
- [x] Frontend : Résolution du type d'import des assets `.png` via `vite-env.d.ts` pour garantir la compilation TypeScript sans erreur

## Phase 13 — Validation par le Directeur de Département DFM
- [x] Backend : Intégration de la validation par le Directeur de Département DFM (`director_dept`) juste après le Chef de Service dans les circuits de validation DFM (modèles standard, 005, 006)
- [x] Backend : Seeding de l'utilisateur de substitution `director.dfm@mct.ci` avec le mot de passe standard `MCT@2026` et alignement des colonnes de signature sur la fiche PDF

## Phase 14 — Ajustement Impression couleur (ENR.SI.006)
- [x] Backend : Retrait de l'étape de Trésorerie du workflow `ENR_SI_006` dans `departments.js`
- [x] Backend : Conditionnement de l'envoi de l'e-mail de paiement à la Trésorerie uniquement si le workflow contient effectivement une étape de trésorerie (`hasTreasuryStep`)

## Phase 15 — Remplissage automatique des informations demandeur
- [x] Frontend : Ajout de l'auto-remplissage des champs du demandeur (`matricule`, `department`, `firstName`, `lastName`, `position`) dans `NewRequestPage.tsx` à partir de l'utilisateur connecté
- [x] Frontend : Mise à jour du type `User` pour inclure `matricule` et `fonction`

## Phase 16 — Configuration SMTP supportuser
- [x] Backend : Mise à jour des paramètres SMTP avec les identifiants `supportuser@mct.ci`

## Phase 17 — Rebranding des e-mails en ERP NATIF MCT
- [x] Backend : Remplacement du nom de marque `MCT IT Portal` par `ERP NATIF MCT` dans l'expéditeur global (`EMAIL_FROM`) et dans l'intégralité des templates de courriels (sujets, en-têtes et signatures)

## Phase 18 — Message NB de Délai (Actifs Informatiques)
- [x] Frontend : Ajout de l'encart d'avertissement bleu ("NB: Un délai de 5 jours...") sous les champs de création d'actifs informatiques dans `NewRequestPage.tsx`
- [x] Frontend : Ajout de l'encart d'avertissement bleu similaire dans la fiche détaillée de demande d'actifs dans `RequestDetailPage.tsx`
- [x] Backend : Ajout d'un bloc d'avertissement stylisé dans l'e-mail de demande de validation (`sendValidationRequestEmail`) uniquement pour les demandes de type `ENR_SI_008` (Actifs Informatiques)
- [x] Vérification : Build frontend réussi et mise à jour de lessons.md

## Phase 19 — Ajout du département DGOF
- [x] Backend : Ajout du département "DGOF" à la liste des départements (dans `departments.js` et en base de données via le script de seed)
- [x] Backend : Mise à jour de la configuration de l'utilisateur DGOF (`supportuser@mct.ci`) pour l'associer au nouveau département "DGOF" et renseigner correctement ses informations (Aziz KONE)

## Phase 20 — Résolution des alertes Semgrep (Sécurité)
- [x] Backend : Sécuriser les fonctions `path.resolve()` et `path.join()` contre les failles de Path Traversal (notamment dans `pdf.service.js` et les contrôleurs de fichiers) en utilisant `path.basename()` ou en vérifiant le préfixe du chemin autorisé
- [x] Backend : Corriger les alertes "Unsafe Format String" dans `email.service.js` et `workflow.service.js` en utilisant des paramètres de formatage explicites ou en séparant les variables dans `console.error`
- [x] Backend : Documenter et confirmer la robustesse contre le CSRF (puisque l'authentification se fait via Bearer Token JWT transmis par en-têtes HTTP) ou ajouter un middleware de protection CSRF

## Phase 21 — Fiche de demande d'approvisionnement (ENR.GA.003)
- [x] Backend : Configurer le circuit de validation à 3 étapes (Demandeur ➔ IT ➔ Moyens Généraux) et associer Pierre ADOM (`pierre.adom@mct.ci`) comme contact de validation final.
- [x] Backend : Adapter `request.controller.js`, `workflow.service.js` et `email.service.js` pour supporter le type de demande `ENR_GA_003`.
- [x] Backend : Créer le template HTML/PDF dans `pdf.service.js` pour imprimer la fiche d'approvisionnement (cases à cocher, tableau des articles, fournisseurs, signatures et liaison d'actifs).
- [x] Frontend : Ajouter les boutons de raccourci d'action rapide sur le Tableau de bord pour l'approvisionnement (ENR.GA.003) et le Bon de caisse (ENR.RF.002) dans un format responsive à 6 colonnes.
- [x] Frontend : Créer le formulaire de saisie dans `NewRequestPage.tsx` avec section d'imputation, tableau d'articles dynamique avec calcul automatique de montant, devis/proforma obligatoire et possibilité de rattacher plusieurs demandes d'actifs validées (cases à cocher).
- [x] Frontend : Afficher le récapitulatif complet dans `RequestDetailPage.tsx` avec rendu des articles sous forme de tableau et badges de liens cliquables vers les demandes d'actifs liées (liaison multiple).
- [x] Backend/Seeding : Configurer l'email de test de Pierre ADOM (`bassirou2010+new2@gmail.com`) et exécuter le script de seed.
- [x] Frontend : Corriger le bug de modification des entrées numériques lors de la saisie (conservation du type texte dans le state React et conversion différée au submit et au calcul total).
- [x] Backend & Frontend : Créer les endpoints `POST /requests/:id/cancel` et `PUT /requests/:id` pour permettre à l'auteur d'annuler ou modifier sa demande, et intégrer les boutons correspondants dans le frontend.
- [x] Backend : Compacter les styles du PDF (tailles des polices, paddings des tableaux et marges de page) et ramener la taille par défaut du tableau des articles à 4 lignes dans `pdf.service.js` pour s'assurer que le document exporté tienne sur une seule page.

## Phase 22 — Résolution des Recommandations Codex & Consolidation
- [x] Backend : Sécuriser la validation avec `POST /api/requests/:id/validate` en comparant l'email de l'utilisateur connecté avec l'email attendu à l'étape active.
- [x] Backend : Centraliser le matching d'emails à valeurs multiples et Display Names (`isValidatorEmailMatch`).
- [x] Backend : Sécuriser le dossier `/uploads` en interdisant le service statique public et en implémentant une route Express sécurisée avec contrôle RBAC (`serveUploadSecure`).
- [x] Backend : Optimiser Prisma avec le filtrage direct côté base de données pour la liste des demandes et les statistiques (pagination et comptage natifs).
- [x] Backend : Sécuriser les fiches PDF en appliquant le même filtre d'accès dans `pdf.controller.js` (`generatePdf`).
- [x] Frontend : Remplacer les liens physiques d'uploads statiques dans `RequestDetailPage.tsx` par des requêtes Axios blob authentifiées pour prévisualiser et télécharger les fichiers.
- [x] Backend & Frontend : Harmoniser la hiérarchie des rôles (`IT_ADMIN` et `SUPER_ADMIN`) dans le middleware `requireRole` et les routes de gardes React.
- [x] Backend : Limiter l'export global CSV des demandes au seul périmètre visible de l'utilisateur connecté.
- [x] Tests : Écrire et exécuter avec succès une suite de 23 tests unitaires et d'intégration HTTP Express (`test_integration.js`).

## Phase 23 — Vague 1 de sécurisation et gains rapides (19/07/2026)
- [x] Authentification : recharger l’utilisateur actif et son rôle depuis la base à chaque requête au lieu de faire confiance aux données d’autorité du JWT.
- [x] RBAC : séparer `IT` de l’administration des comptes, centraliser la liste blanche et la hiérarchie des rôles, puis bloquer les promotions non autorisées.
- [x] Configuration : refuser le démarrage avec un `JWT_SECRET` absent, trop court ou égal à une valeur d’exemple.
- [x] Workflow : rendre le contenu d’une demande immuable après soumission et masquer l’action de modification hors statut `DRAFT`.
- [x] Workflow : ajouter une clé de décision idempotente unique par demande et étape afin de refuser les doubles validations concurrentes avec une réponse `409`.
- [x] Tests : remplacer la suite destructive par une base SQLite éphémère strictement réservée à `NODE_ENV=test`, avec données uniques et nettoyage complet.
- [x] Tests : couvrir les comptes désactivés, les rôles JWT obsolètes, l’escalade de privilèges, l’immutabilité après soumission et deux validations concurrentes.
- [x] Frontend : corriger les raccourcis `ASSET`/`PRINT`, centraliser les six types et présélectionner le formulaire depuis un paramètre d’URL validé.
- [x] Vérification : tests auth/RBAC 5/5 réussis, suite d’intégration isolée réussie et build TypeScript/Vite de production réussi.

## Phase 24 — Vague 2 intégrité et exploitation (19/07/2026)
- [x] Sessions : ajout de `tokenVersion` aux utilisateurs et JWT, avec invalidation après changement de mot de passe, rôle ou activation.
- [x] Vérification email : jetons uniques valables 24 heures et consommation atomique à usage unique.
- [x] Workflow : ajout d’une version optimiste sur les demandes et transaction unique pour la décision, le changement de statut et l’avancement d’étape.
- [x] Fichiers : ajout du modèle relationnel `Attachment` avec nom, chemin unique, MIME, taille, type et relation exacte vers la demande.
- [x] Compatibilité : lecture maintenue pour les anciennes pièces jointes JSON avec comparaison stricte du chemin complet.
- [x] Sécurité fichiers : chemins fournis par le client ignorés et suppression de la recherche d’appartenance par sous-chaîne.
- [x] Exploitation : routes `/health` et `/api/health`, Chromium configurable, erreurs PDF explicites et commande PM2 corrigée.
- [x] Qualité : workflow CI ajouté pour Prisma, tests backend et build frontend.
- [x] Vérification : 10/10 tests auth/RBAC, 3 sous-tests helpers et 11 sous-tests HTTP réussis; schéma et base locale synchronisés; build frontend réussi.

## Phase 25 — Vague 3 références, confidentialité et boîte de travail (19/07/2026)
- [x] Références : ajout d’un compteur annuel atomique, initialisé depuis l’historique et résistant aux créations simultanées.
- [x] Confidentialité : route publique des départements limitée aux cinq champs descriptifs nécessaires aux formulaires.
- [x] Documentation : suppression des comptes nominatifs et mots de passe du README, remplacés par une procédure d’amorçage et de rotation.
- [x] Dashboard : section « À traiter par moi » avec compteur, ancienneté et accès direct aux dossiers.
- [x] Dashboard : onglets « Mes demandes », « À valider » et « Terminées », recherche, filtres type/statut et pagination.
- [x] API : scopes, recherche et tris validés côté serveur et systématiquement combinés avec les règles de visibilité.
- [x] Base de données : index ajoutés sur les utilisateurs, statuts, dates, demandeurs, départements, étapes et validateurs.
- [x] Vérification : 11/11 tests auth/RBAC, 3 sous-tests helpers et 13 sous-tests HTTP réussis; références concurrentes distinctes et séquentielles; base synchronisée; build frontend réussi.

## Phase 26 — Vague 4 production, révisions et mobile (19/07/2026)
- [x] Production : schéma Prisma PostgreSQL dédié, migration initiale versionnée et scripts séparés de validation, génération et déploiement.
- [x] Finance : montants de paiement stockés en `Decimal`, validés à deux décimales et exposés sans calcul flottant intermédiaire.
- [x] CI : service PostgreSQL 16 ajouté et migration de production appliquée à chaque changement.
- [x] Révisions : snapshot immuable de la version précédente, numéro de révision sur les validations et pièces jointes, puis rejeu du workflow sans effacer l’historique.
- [x] Concurrence : route de révision réservée au créateur, validation stricte et contrôle optimiste garantissant une seule révision gagnante.
- [x] Mobile/accessibilité : menu hamburger, suppression de la marge fixe, cartes mobiles, formulaires en une colonne, focus visible, ARIA, touche Échap et réduction des animations.
- [x] Exploitation : logger JSON avec corrélation, masquage des secrets, scripts de sauvegarde/restauration et guide d’exploitation.
- [x] Vérification : migration réellement appliquée sur PostgreSQL 15 éphémère (`RequestRevision` présent, `paymentAmount numeric(18,2)`), sauvegarde vérifiée puis restaurée dans une seconde base; 11 tests auth/RBAC, 3 helpers et 16 routes HTTP réussis; build frontend réussi.

## Phase 27 — Vague 5 saisie résiliente et délais (19/07/2026)
- [x] Brouillons : création privée sans workflow, reprise du dernier brouillon par type et mise à jour idempotente avec version optimiste.
- [x] Soumission : transition atomique du brouillon, validation unique du demandeur, stockage sécurisé des fichiers et refus des doubles soumissions.
- [x] Frontend : autosauvegarde temporisée avec file d’écriture, états visibles, reprise explicite et conservation des tableaux dynamiques.
- [x] Identité : informations du profil verrouillées par défaut et annulation d’une correction restaurant les valeurs serveur.
- [x] Fichiers : pièces existantes conservées, nouveaux fichiers cumulables et retirables, zone accessible avec formats, taille et erreurs contextualisées.
- [x] Délais : objectifs configurables en jours ouvrés, ancienneté du dossier, échéance, retard et étape bloquante affichés dans le dashboard et le détail.
- [x] Vérification : deux schémas Prisma valides, 11 tests auth/RBAC, 3 tests SLA, 3 helpers et 19 routes HTTP réussis; build TypeScript/Vite réussi avec 1 252 modules.

## Phase 28 — Vague 6 relances et pilotage SLA (19/07/2026)
- [x] Relances : détection planifiable des étapes en retard, première relance puis escalade selon des seuils configurables.
- [x] Idempotence : revendication persistée unique par demande, révision, étape et niveau avant tout appel SMTP, même en concurrence.
- [x] Confidentialité : destinataires stockés sous forme d’empreinte et erreurs SMTP ramenées à des codes génériques.
- [x] Reporting : API agrégée et sécurisée avec plage bornée, taux de rejet, conformité SLA, retards et durées moyennes par type et étape.
- [x] Frontend : écran « Reporting SLA » responsive avec filtres 7/30/90 jours, KPI, barres accessibles et tableaux détaillés.
- [x] Cohérence : constantes backend centralisées pour rôles, types, statuts et actions, avec validation stricte et tests de workflow.
- [x] Production : migration `20260719010000_sla_notifications` réellement appliquée sur PostgreSQL et table/index vérifiés.
- [x] Vérification : schémas Prisma valides, suite unitaire complète réussie, 3 helpers et 21 routes HTTP réussis; build frontend réussi avec 1 253 modules.

## Phase 29 — Vague 7 saisie guidée et maintenabilité frontend (19/07/2026)
- [x] Uploads : progression accessible pendant la lecture locale et l’envoi HTTP, contrôles désactivés pendant le transfert et protection synchrone contre les doubles soumissions.
- [x] Résilience : erreur persistante et action « Réessayer l’envoi » sans perte de la saisie ni des fichiers sélectionnés.
- [x] Formulaires : progression adaptée au type de demande — 3 étapes pour les formulaires simples, 4 pour le Bon de Caisse et 5 pour l’approvisionnement.
- [x] Validation : résumé contextualisé, compteur d’erreurs par section et accès direct au premier contrôle invalide, y compris les états dynamiques et les documents.
- [x] Maintenabilité création : configuration des sections, progression et utilitaires de fichiers extraits de la page principale.
- [x] Maintenabilité détail : cartes des documents et du workflow extraites dans deux composants dédiés et typés; `RequestDetailPage.tsx` ramenée de 1 187 à 991 lignes.
- [x] Vérification : contrôle TypeScript et build Vite réussis avec 1 258 modules; contrôle `git diff --check` réussi sur les fichiers de la vague.

## Phase 30 — Vague 8 découpage des modules principaux (19/07/2026)
- [x] Création : sélecteur de type, informations demandeur et champs métier autonomes extraits dans trois composants typés; `NewRequestPage.tsx` ramenée de 1 443 à 1 150 lignes.
- [x] Fiche détail : paiement, clôture, validation, mémo et fenêtres modales extraits dans quatre composants métier; `RequestDetailPage.tsx` ramenée de 991 à 649 lignes.
- [x] Backend : consultation, statistiques et export CSV déplacés vers `request-query.controller.js`, avec helpers communs dans `request.shared.js`.
- [x] Compatibilité : façade `request.controller.js` conservée avec les mêmes 16 exports publics et routes Express inchangées.
- [x] Tests : nouveau contrat automatisé vérifiant les 16 méthodes/chemins HTTP, la présence des handlers finaux et tous les exports du contrôleur.
- [x] Vérification : suite unitaire complète réussie, 3 tests de contrat réussis, 3 helpers et 21 scénarios HTTP réels réussis; build frontend réussi avec 1 265 modules et contrôle `git diff --check` réussi.

## Phase 31 — Vague 9 contrôleurs backend par domaine (19/07/2026)
- [x] Soumission : création, brouillons, reprise, mise à jour et soumission déplacés dans `request-submission.controller.js`.
- [x] Workflow : validation et clôture déplacées dans `request-validation.controller.js`, sans modifier l’ordre transaction → signature → workflow/emails.
- [x] Cycle de vie : suppression, annulation, modification, révision et accès sécurisé aux fichiers déplacés dans `request-lifecycle.controller.js`.
- [x] Consultation : listage, détail, statistiques et export restent isolés dans `request-query.controller.js`.
- [x] Façade : `request.controller.js` ramené de 1 315 à 43 lignes, avec exactement les 16 exports publics historiques.
- [x] Sécurité : confinement des chemins renforcé pour refuser aussi les dossiers frères partageant le préfixe du répertoire autorisé.
- [x] Contrats : 7 tests vérifient routes, exports fermés par domaine, propriétaire unique de chaque handler, identité stricte des réexports et confinement des chemins.
- [x] Vérification : syntaxe des six modules valide, suite unitaire complète réussie, 3 helpers et 21 scénarios HTTP réels réussis; build frontend réussi avec 1 265 modules et contrôle `git diff --check` réussi.

## Phase 32 — Organigramme et circuits 100 % déclaratifs (16/08/2026)
- [x] Config : création d’`organization.config.js`, source de vérité unique — `DIRECTIONS` (nom, directeur, libellé d’étape, comportement du pas direction : `enabled`/`routeTo`), `DEPARTMENTS` (avec `selectableInForms`), `CONTACTS`, `WORKFLOW_DEFINITIONS` (circuits ordonnés par type) et `ROLE_BY_EMAIL`.
- [x] Moteur : création de `workflow.engine.js`, résolution générique `(type, département) → étapes` reproduisant à l’identique les circuits précédents (comparaison exhaustive : 24 départements × 6 types, aucune divergence).
- [x] Façade : `departments.js` réduit à une réexportation de la config et du moteur, API historique `{ DEPARTMENTS, CONTACTS, getWorkflowSteps }` préservée.
- [x] Workflow : suppression des emails de fallback codés en dur dans `workflow.service.js` (Moyens Généraux, Trésorerie) au profit de `CONTACTS`.
- [x] Seed : exceptions de rôle déplacées dans `ROLE_BY_EMAIL` — l’ajout d’un département ne touche plus `seed.js`.
- [x] API : `/auth/departments` et `/admin/departments` exposent `selectable` dérivé de la config.
- [x] Frontend : suppression des listes de codes codées en dur (`RequesterInformationFields.tsx`, `RegisterPage.tsx`, `AdminPage.tsx`) au profit du flag `selectable` fourni par l’API.
- [x] Fiabilité : validation fail-fast de la config au chargement (directions référencées, types d’étapes connus, codes uniques, workflow par type).
- [x] Tests : `organization.config.test.js` (9 tests) — intégrité de la config, contiguïté des circuits pour tous les départements × types, routage DG→DSC, QHSE sans direction, DBUFM, retrait DAF quand chef = DAF, sélection des formulaires.
- [x] Vérification : suite unitaire complète réussie, 21 scénarios HTTP réels réussis, seed validé sur base temporaire (24 départements / 24 comptes, rôles métier corrects), contrôle TypeScript et build Vite réussis.

## Phase 33 — Rectificatif organigramme MCT (16/08/2026)
- [x] Organigramme rectifié selon l'énoncé utilisateur et l'analyse de l'organigramme général ENR.RH.016 v07 du 21/05/2026 (scan OCR) : 6 directions — DG (+ DGOF), DAF, DO, MBD, DFM, DSC.
- [x] DG : Informatique, Secrétariat, Service RH, DGOF, Département QHSE (rattaché au DG, règle « va directement au DGOF » conservée via surcharge `directorStep` au niveau département).
- [x] DO : ajout du Service Bureau d'études (BE) ; DAF : Recouvrement, Trésorerie, Comptabilité ; MBD : Showroom Faya, Showroom Vallon.
- [x] DFM : remplacement de Facilities Management par SAV (+ Smart Maintenance), directeur commun DFM ; DSC : Magasin, Logistique et Achat, Moyens Généraux (service DSC selon l'organigramme).
- [x] Renommage MBD en « Marketing & Business Development » (conforme à l'organigramme ENR.RH.016) et DFM en « Direction Facilities Management (DFM) ».
- [x] Nouveaux services sans responsable nommé (Bureau d'études, SAV, Magasin, Logistique et Achat) : `chefEmail: null`, étape N+1 sautée (précédent Secrétariat), contacts à renseigner dans la config.
- [x] Moteur : surcharge `directorStep` par département (QHSE) ; seed rattaché aux nouvelles clés (SAV, MOYENS_GENERAUX) ; libellé de secours PDF mis à jour.
- [x] Tests : `organization.config.test.js` (11 tests) et `request-constants.test.js` réécrits pour le nouvel organigramme ; suite unitaire, 21 scénarios HTTP, seed sur base temporaire (27 départements) et build frontend réussis.

## Phase 34 — Circuit du Service Informatique aligné sur l'organigramme SI (16/08/2026)
- [x] INFORMATIQUE : le RSI/RSSI valide en N+1 (chef de service), puis la demande passe directement au DGOF puis au DG — suppression du routage de l'étape direction vers la DSC (surcharge `directorStep: { enabled: false }` sur le département).
- [x] Tests : circuits ASSET/005 d'INFORMATIQUE figés (`[requester, chef_dept, dgof, dg, it]` et `[requester, chef_dept, rh, dgof, dg, it]`), liste du circuit 005 remplacée par RH pour couvrir le routage DG→DSC ; suite unitaire et 21 scénarios HTTP réussis.

## Phase 35 — Libellés de direction alignés sur l'organigramme (16/08/2026)
- [x] DFM renommé en « Facilities Management » dans `DIRECTIONS` (nom exact de l'organigramme ENR.RH.016) — `directionName` de SAV / Smart Maintenance, groupes `<optgroup>` du frontend et fonction « Directeur - Facilities Management » du seed dérivés automatiquement. MBD restait « Marketing & Business Development » (déjà conforme).
- [x] Libellé d'étape direction conservé selon la convention « Direction {name} ({code}) » (identique à MBD) ; libellés des circuits standard dérivés (`Direction (Facilities Management)`).
- [x] Tests figés mis à jour (`organization.config.test.js`, `request-constants.test.js`) ; vérification des fiches PDF : rendu HTML de `generatePdfHtml` contrôlé pour SAV / Smart Maintenance / Showrooms — noms de départements et libellés d'étape direction issus de la config, aucun libellé obsolète (Management Business, Business Unit Facilities, DMBD/DBUFM) résiduel. Suite unitaire et 21 scénarios HTTP réussis.

## Phase 36 — Responsables des nouveaux services : N+1 rétabli (16/08/2026)
- [x] SAV (DFM) : chef = Ando Roger (`roger.ando@mct.ci`) — ancien FM Manager de la direction DFM (l'ancien département « Facilities Management (FM) » correspond au nouveau SAV). Étape N+1 rétablie sur tous les circuits.
- [x] Logistique et Achat (DSC) : chef = Noel GAHIE (`noel.gahie@mct.ci`) — ancien « Achat et Logistique » (ACHAT_LOGISTIQUE) sous DSC. Étape N+1 rétablie sur tous les circuits.
- [x] Bureau d'études (BE) et Magasin : toujours `chefEmail: null` — aucun contact MCT disponible dans le projet (config historique, seeds, base dev, organigramme OCR) ; l'étape N+1 se rétablira par une entrée `chefEmail`/`chefName` dans la config + `db:seed`.
- [x] Seed validé sur base temporaire : comptes `noel.gahie@mct.ci` et `roger.ando@mct.ci` créés/rattachés (CHEF_DEPT, « Chef de service - Logistique et Achat » / « Chef de service - SAV »).
- [x] Tests : `organization.config.test.js` (12) et `request-constants.test.js` mis à jour — SAV et LOGISTIQUE_ACHAT figés avec leur N+1 (email + nom), seuls BUREAU_ETUDES et MAGASIN restent sans étape N+1. Suite unitaire complète verte.

## Phase 37 — Responsables de BE et Magasin fournis : N+1 complet (16/08/2026)
- [x] Bureau d'études (BE, DO) : chef = KONE Marie Françoise (`marie-francoise.kone@mct.ci`) — fourni par l'utilisateur.
- [x] Magasin (DSC) : chef = Alpha Camara (`alpha.camara@mct.ci`) — fourni par l'utilisateur.
- [x] Les 4 nouveaux services (BE, SAV, Magasin, Logistique et Achat) ont désormais tous leur étape N+1 ; seul le Secrétariat reste sans responsable nommé (étape N+1 sautée).
- [x] Seed validé sur base temporaire : comptes `marie-francoise.kone@mct.ci` et `alpha.camara@mct.ci` créés (CHEF_DEPT, « Chef de service - Bureau d'études (BE) » / « Chef de service - Magasin ») ; 1 seul département sans chef en base.
- [x] Tests : `organization.config.test.js` réécrit — « les 4 nouveaux services ont retrouvé leur étape N+1 » (emails/noms figés) et « le Secrétariat reste le seul service sans responsable » ; suite unitaire complète verte.

## Phase 38 — Schémas formData par type de demande (16/08/2026)
- [x] Création de `backend/src/config/formData.schemas.js` : source de vérité des clés par fiche MCT — `FORM_DATA_SCHEMAS` (6 types) avec clés autorisées, clés obligatoires et types (chaînes / nombres / listes), plus `COMMON_KEYS` (identité demandeur) et `LEGACY_KEYS` (clés héritées encore consommées par les PDF, tolérées sans être exigées).
- [x] `validateFormData(type, formData, { strict })` : en strict (soumission réelle) → clés inconnues refusées (message listant les clés autorisées, détecte les typos du type `itAsssets`), clés obligatoires exigées (non vides), types contrôlés (`paymentAmount`/`offersAmount`/`copiesA4`/`copiesA3` acceptent nombre ou chaîne numérique). En non strict (brouillons) → conteneur passe-partout préservé, clés inconnues seulement journalisées (`formData.unknown_keys`).
- [x] Intégration : validation stricte branchée sur `createRequest` (POST /requests), `submitDraft` (POST /requests/drafts/:id/submit) et `reviseRequest` (POST /requests/:id/revisions) ; avertissement non bloquant sur `createDraft`, `updateDraft` et `updateRequest`.
- [x] Tests : `test/formData.schemas.test.js` (9 tests — un schéma par type, clés obligatoires, typos, types, tolérance brouillon, clés héritées) ajouté à `test:unit` ; mises à jour de 2 scénarios d'intégration qui soumettaient des clés hors contrat (créations OTHER → `description`).
- [x] Vérification : suite unitaire complète verte (14 fichiers), 24 scénarios HTTP + 2 suites d'autorisation verts, aucun résidu `git diff --check`. Les brouillons conservent le contrat « données arbitraires préservées » (test d'intégration assetSpecs inchangé).

## Phase 39 — Contrat formData partagé backend ↔ frontend (16/08/2026)
- [x] Création de `mct-it-portal/shared/formData.contract.json` : source de vérité unique du contrat (clés par fiche, obligatoires, types, clés communes et héritées) consommée par les deux côtés — plus aucune duplication possible des données.
- [x] Backend : `formData.schemas.js` refactoré pour charger le JSON (fail-fast au chargement : type manquant, clé dupliquée, clé sans type déclaré → refus de démarrer) ; API `validateFormData` / `getUnknownFormDataKeys` inchangée, contrôleurs non modifiés.
- [x] Frontend : `src/types/formData.ts` — types dérivés du contrat (`FormDataFor<T>`, `FormDataByType`), port TS de `validateFormData` aux messages identiques au serveur, `getUnknownFormDataKeys`.
- [x] Contrôle avant envoi dans `NewRequestPage.onSubmit` : le formData est validé côté client (strict) avant toute soumission — erreurs bloquantes affichées (bannière + toast) avec les mêmes messages que l'API.
- [x] Vérifications : suite unitaire backend verte (14 fichiers), intégration HTTP verte, `tsc --noEmit` 0 erreur, build Vite OK (le JSON partagé est inliné par Vite), `git diff --check` propre.

## Phase 40 — Générateur + test anti-dérive du contrat formData (16/08/2026)
- [x] `backend/scripts/generate-formdata-types.js` : génère `frontend/src/types/formData.ts` depuis `shared/formData.contract.json` — le fichier devient un artefact (données inlinées, mention « FICHIER GÉNÉRÉ »), script npm `generate:formdata-types`.
- [x] `test/formData.contract-sync.test.js` (2 tests) ajouté à `test:unit` :
  1. Snapshot : régénère le fichier et le compare au committé — tout édit JSON ou main sans régénération fait échouer la suite avec l'ordre `npm run generate:formdata-types`.
  2. Parité d'exécution : transpile `formData.ts` (typescript du frontend, CommonJS) et l'exécute dans le process du test ; 26 payloads (valides, clés manquantes, typos, types invalides, non-objets, valeurs vides, brouillons) comparés mot pour mot avec le validateur backend — messages identiques.
- [x] Alignement : le défaut `strict` de `validateFormData` backend passe à `true` (identique au frontend) — aucun changement de comportement, les contrôleurs passaient déjà `strict: true` explicitement.
- [x] Preuve d'efficacité : une dérive volontaire du message (« nombre » → « numéro ») fait échouer les 2 tests ; restaurée, la suite redevient verte.
- [x] Vérifications : suite unitaire verte (15 fichiers), intégration HTTP verte, `tsc --noEmit` 0 erreur, build Vite OK, `git diff --check` propre.

## Phase 41 — Réconciliation de la base : l'organigramme à la création reflète la config (16/08/2026)
- [x] Cause : `/auth/departments` lit la base de données ; `dev.db` n'avait jamais été re-synchronisée après le rectificatif → le menu de création affichait l'ancien organigramme (DRH, DBUFM, Achat et Logistique, Management Business Development…). Amplifié par `isDepartmentSelectable` qui renvoyait `true` pour tout code inconnu.
- [x] `isDepartmentSelectable` : seul un département connu de la configuration est sélectionnable (code inconnu → `false`) — un enregistrement obsolète en base n'apparaît plus jamais dans les formulaires.
- [x] Seed : étape de réconciliation `reconcileLegacyDepartments` avant les upserts — renommages préservant les données (ACHAT_LOGISTIQUE → LOGISTIQUE_ACHAT, FACILITIE_MANAGEMENT → SAV) et absorption DRH → RH (requêtes et comptes transférés, département supprimé). Sans effet sur une base fraîche.
- [x] `dev.db` re-seedée : 27 départements conformes, 0 code obsolète ; **90 requêtes préservées** (3 → Logistique et Achat, 4 → SAV, 1 DRH → RH) et comptes re-rattachés (noel.gahie, roger.ando, benedicte.djaman…). Sauvegarde de la base dans /tmp avant application.
- [x] Vérifications : simulation de `/auth/departments` (22 services sélectionnables, groupes « Facilities Management », « Marketing & Business Development »…) ; suite unitaire verte (15 fichiers) et intégration HTTP verte.
- [x] Vérification visuelle (16/08/2026, serveurs dev 3000/3001) : menu de création de compte → les 22 services du nouvel organigramme groupés par direction (Facilities Management, Marketing & Business Development, DG, DAF, DO, DSC), plus aucun code obsolète ; page Admin (demandes + 41 utilisateurs) → départements conformes (SAV, Logistique et Achat, Bureau d'études, Magasin, Moyens Généraux…).
- [x] Contrôle workflow sur anciens départements : brouillon ASSET soumis depuis SAV (ex-FACILITIE_MANAGEMENT, id préservé) → VALIDATION_N1, N+1 = Ando Roger, direction « Facilities Management » ; brouillon ASSET soumis depuis Ressources Humaines (ex-DRH absorbé) → VALIDATION_N1, N+1 = Sanogo NAMINATA, circuit DG→DSC correct. Aucune rupture ; demandes de test supprimées après contrôle.

## Phase 42 — Circuit du Service Informatique : la surcharge `directorStep` s'applique aussi aux départements chargés depuis la base (17/08/2026)
- [x] Constat visuel (preview, demande REF-2026-094 sur Informatique) : le circuit affichait une étape **Direction Supply Chain (DSC)** alors que la config déclare `directorStep: { enabled: false }` pour INFORMATIQUE (organigramme SI v06 : RSI/RSSI → DGOF → DG → IT).
- [x] Cause racine : `resolveWorkflowSteps` lisait les surcharges (`directorStep`) sur l'objet département passé en entrée. Or à l'exécution, les consommateurs (detail, PDF, SLA, délégations, reporting…) passent le département **chargé depuis la base** (ligne Prisma) — qui n'a pas de colonne `directorStep`. La surcharge INFORMATIQUE/QHSE était donc perdue et la règle de direction DG (`routeTo: DSC`) s'appliquait par défaut. Les tests unitaires passaient car ils fournissaient les départements de la config.
- [x] Correctif (workflow.engine.js) : avant résolution, superposition de l'entrée déclarative de la config (`DEPARTMENTS`) sur l'enregistrement base — la configuration reste l'autorité quel que soit l'origine de l'objet. Corrige d'un coup tous les consommateurs (API detail, fiches PDF, SLA, délégations, reporting).
- [x] Tests : régression « département chargé depuis la base » (forme Prisma sans `directorStep`) pour INFORMATIQUE et QHSE ; mise à jour de pdf-signature.test.js (étapes DGOF=3/DG=4 dans le circuit corrigé ; la fiche ENR.SI.005 du Service Informatique n'affiche plus l'en-tête DSC mais le libellé générique « Direction concernée »).
- [x] Vérifications : suite unitaire **74/74**, intégration HTTP **verte** ; API live REF-2026-094 → `chef_dept (Thierry KONE) → dgof (KONE Aziz) → dg (Lamine KONE) → it (Bassirou OUEDRAOGO)`, plus aucune étape DSC ; vérification visuelle de la page détail en preview (panneau SLA « Étape bloquante : Chef de Service / Département (Informatique) » + carte CIRCUIT DE VALIDATION conforme).

## Revue Code — Phase 2 (25/08/2026)

> Plan d'action de recommandations issues d'une analyse globale du projet. 4 blocs, 26 actions, 18 suites de tests, 0 échec.

### L. Découpage frontend ✅
- [x] L.1 Extraire de `NewRequestPage.tsx` (1198 → 870 lignes, -27%) les composants métier : `RequestTypeSelector.tsx` (déjà extrait), `SubmissionProgress.tsx` (80 lignes, barre de progression + erreur), `SupplyItemsForm.tsx` (342 lignes, articles nature dépenses consultation), `FileUploadZone.tsx` (115 lignes, PDF CASH + pièces jointes).
- [x] L.2 Créer `ErrorBoundary.tsx` (72 lignes) avec UI de récupération (détails erreur, boutons Réessayer/Accueil) et l'intégrer autour des routes principales dans `App.tsx`.
- [x] L.3 Envelopper les routes dans `<Suspense fallback={<PageSkeleton />}>` avec `React.lazy()` — le build produit désormais 16 chunks (code splitting automatique) au lieu d'un seul bundle.

### M. Découpage backend PDF ✅
- [x] M.1 Extraire `pdf.service.js` (1124 → 40 lignes, facade dispatch) en `pdf-templates/` avec 6 fichiers par type : `005.js` (70 lignes, ENR.SI.005), `006.js` (68 lignes, ENR.SI.006), `008.js` (90 lignes, ENR.SI.008), `ga003.js` (191 lignes, ENR.GA.003), `rf002.js` (194 lignes, ENR.RF.002), `autre.js` (72 lignes, AUTRE).
- [x] M.2 Centraliser les styles CSS, le header MCT, le ref-band et les helpers (escapeHtml, formatDateWithTime, getStatusBadge, renderDocuSignHtmlStamp) dans `pdf-base-layout.js` (194 lignes) — fin de la duplication CSS ×6.

### N. Robustesse prod ✅
- [x] N.1 Logger les catches silencieux avec `logger.debug('catch.silent', { context, error })` : 2 dans `document-center.controller.js` (proformas + attachments JSON.parse), 1 dans `request-validation.controller.js` (PDF path), 1 dans `sla-notification.service.js` (sendNotification).
- [x] N.2 Rate limiter global écriture : `writeLimiter` (100 req/15min, keyGenerator userId/IP) appliqué aux 9 routes mutation de `requests.routes.js` (create, draft, submit, update, revise, cancel, validate, close, delete).
- [x] N.3 Logger migré vers `pino` (installé + importé) avec redaction automatique des clés sensibles (password, token, cookie, smtp), JSON structuré, correlation ID par requête.

### O. Cohérence React Query ✅
- [x] O.1 Hooks intégrés : `useUsers()` + `useQuery(departments)` dans AdminPage, `useRequests()` + `useStats()` dans DashboardPage, `useReporting()` (nouveau hook dédié `/reporting`) dans ReportingPage. Création de `hooks/useAdminRequests.ts`, `hooks/useStats.ts`, `hooks/useReporting.ts`.
- [x] O.2 `queryClient.invalidateQueries()` ajouté après chaque mutation : AdminPage (delete request + save user), NewRequestPage (submit/revision), RequestDetailPage (validate, payment, close, cancel, delete) — 5 pages couvertes.
- [x] O.3 13 tests intégration ajoutés dans `test/integration-enhancements.test.js` : multer config (accept/reject), refresh token service (5 fonctions), validation schemas (5 schémas), error classes (AppError/NotFoundError/ForbiddenError/ConflictError + mapper Prisma), PDF templates (6 templates importables + dispatch + base-layout helpers), workflow engine (6 types × 3 départements).

### I. Tests E2E Playwright ✅
- [x] Installer `@playwright/test` + chromium headless + `playwright.config.ts` (webServer auto-start backend:3001 + frontend:3000).
- [x] 5 scénarios, 26 tests E2E :
  - **01-login.spec.ts** (5 tests) : redirection, formulaire, identifiants invalides, login→dashboard, navigation
  - **02-create-request.spec.ts** (5 tests) : sélecteur type, formulaire EMAIL, soumission complète, progression, anti-double-soumission
  - **03-validation-workflow.spec.ts** (4 tests) : détail demande, boutons action, tampon PDF, historique validations
  - **04-admin.spec.ts** (6 tests) : accès RBAC, onglets, liste users, modal création, filtres demandes, navigation onglets
  - **05-navigation-export.spec.ts** (6 tests) : sidebar, pagination, reporting, déconnexion, responsive mobile, raccourcis dashboard
- [x] Scripts npm : `test:e2e`, `test:e2e:ui` (mode interactif), `test:e2e:report` (rapport HTML).

### Impact global
- **Fichiers créés** : 21 fichiers (13 backend + 8 frontend)
- **Lignes réduites** : `NewRequestPage.tsx` -27%, `pdf.service.js` -96%
- **Tests** : 18 suites backend (0 fail) + 26 tests E2E + tsc 0 erreur + build OK
- **Sécurité** : rate limiting 3 niveaux (global 200, auth 15, écriture 100), refresh tokens httpOnly, RBAC frontend (ProtectedRoute)
- **Performance** : React Query (cache + invalidation), code splitting (16 chunks), debounce filtres
- **Maintenabilité** : templates PDF modulaires, ErrorBoundary, Suspense, hooks réutilisables
