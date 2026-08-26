# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tous les employés de MCT (Maintenance Climatisation Technique), environ 50 à 100 personnes, répartis dans 6 directions (DG, DAF, MBD, DO, DRH, QHSE) et leurs départements/services. Ils utilisent le portail depuis leur poste de bureau pour soumettre des demandes IT, suivre leur avancement, et imprimer les fiches officielles. Les responsables hiérarchiques (chefs de service, chefs de département, directeurs, DG) valident ou rejettent les demandes depuis la même plateforme. Le service Informatique traite et clôture les demandes.

## Product Purpose

Le MCT IT Portal centralise et digitalise la gestion des demandes IT au sein de MCT. Il remplace les circuits informels (emails, appels, formulaires papier) par une plateforme unique qui assure :
- la traçabilité complète et horodatée de chaque demande,
- l'automatisation des circuits de validation multi-niveaux calqués sur la hiérarchie MCT,
- les notifications email automatiques à chaque étape du workflow,
- la génération et l'impression de fiches PDF conformes au Système de Management Qualité (SMQ).

Le succès se mesure à zéro demande perdue, des délais de traitement maîtrisés, et une conformité totale aux audits qualité.

## Positioning

Outil sur-mesure pour MCT, pas un ITSM générique. Deux éléments inimitables :
1. **Conformité SMQ intégrée** : les formulaires numériques reproduisent fidèlement les références officielles MCT (ENR.SI.005 pour la création d'adresse email, ENR.SI.006 pour l'impression couleur, ENR.SI.008 pour les actifs informatiques), avec génération PDF conforme pour les audits qualité.
2. **Workflows de validation calqués sur l'organigramme MCT** : chaque type de demande suit un circuit de validation spécifique (N+1 → N+2 → DG → IT) avec un routage automatique par département/direction basé sur la structure organisationnelle réelle de MCT.

## Operating Context

- **4 types de demandes** : actif informatique (ENR.SI.008), création d'adresse email (ENR.SI.005), impression couleur (ENR.SI.006), autre demande IT.
- **Workflow multi-niveaux** : l'employé soumet → chef de département/service valide (N+1) → directeur de direction valide (N+2) → DG valide → IT exécute → clôture. Le nombre d'étapes varie par type de demande (3 à 5 niveaux).
- **Notifications email automatiques** via SMTP MCT à chaque changement d'étape.
- **Statuts** : Brouillon → Soumise → Validation N+1 → Validation N+2 → Validation DG → En cours IT → Clôturée / Rejetée.
- **Référence unique** générée par demande (ex : REF-2026-047).
- **Système de délégation** pour les valideurs absents.
- **Vérification OTP** par email pour la signature électronique.
- **Centre de documents** et **tableau de bord** de suivi en temps réel.
- **Module reporting** avec statistiques pour la direction.
- **Module Moyens Généraux** et **Trésorerie** avec dashboards dédiés.

## Capabilities and Constraints

### Stack technique
- **Frontend** : React 18 + TypeScript + Vite + TailwindCSS
- **Backend** : Node.js + Express.js
- **Base de données** : PostgreSQL via Prisma ORM (SQLite en dev)
- **Emails** : Nodemailer + SMTP MCT
- **PDF** : pdf-lib (serveur) + Puppeteer-core
- **Auth** : JWT + bcryptjs

### Contraintes
- Les fiches PDF imprimables doivent reproduire fidèlement le format officiel des formulaires papier MCT pour les audits qualité SMQ.
- L'application doit fonctionner en français (langue de travail de MCT).
- Le routage de validation est codé en dur sur la structure organisationnelle MCT (6 directions, 20+ départements/services, responsables nommés avec emails).

## Brand Commitments

- **Nom** : MCT IT Portal / Portail IT MCT
- **Entreprise** : MCT — Maintenance Climatisation Technique (Côte d'Ivoire)
- **Logos** : Logo MCT principal + logos spécialisés (MCT Électricité, MCT Climatisation, MCT Maintenance) présents dans les en-têtes des fiches PDF.
- **Référence qualité** : conformité aux formulaires ENR.SI.005 / ENR.SI.006 / ENR.SI.008 du Système de Management Qualité MCT.
- **Langue** : Français exclusivement.

## Evidence on Hand

- Cahier des charges complet : [MCT_IT_Portal_Projet_Complet.md](MCT_IT_Portal_Projet_Complet.md)
- Application frontend fonctionnelle (13 pages React + composants)
- Backend API fonctionnel (Express + Prisma + PostgreSQL)
- Logos MCT dans `mct-it-portal/frontend/src/images/`
- Organigramme complet avec noms et emails de tous les responsables

Absences : pas de maquettes Figma, pas de design system documenté, pas de guide de marque formel au-delà des en-têtes des formulaires papier.

## Product Principles

1. **Conformité d'abord** — chaque sortie (fiche, workflow, statut) doit satisfaire un audit qualité SMQ sans retouche.
2. **Zéro demande perdue** — le système garantit que chaque demande soumise est traçable, notifiée et traitée.
3. **Hiérarchie fidèle** — les circuits de validation reproduisent exactement l'organigramme et les règles métier de MCT.
4. **Simplicité d'usage** — tous les employés, quel que soit leur niveau technique, doivent pouvoir soumettre et suivre une demande sans formation.
5. **Transparence totale** — chaque acteur voit l'état de la demande en temps réel, chaque action est horodatée et attribuée.
