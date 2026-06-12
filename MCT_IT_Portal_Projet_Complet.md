# MCT IT Portal — Cahier des Charges & Documentation Projet Complète

> **Projet :** Plateforme de gestion des demandes IT
> **Entreprise :** MCT (Maintenance Climatisation Technique)
> **Version :** 1.0
> **Date :** Mai 2026
> **Référence interne :** MCT-IT-PORTAL-2026
> **Système de Management Qualité :** Conforme aux formulaires ENR.SI.005 / ENR.SI.006 / ENR.SI.008

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Périmètre fonctionnel](#2-périmètre-fonctionnel)
3. [Workflow de validation](#3-workflow-de-validation)
4. [Formulaires officiels MCT](#4-formulaires-officiels-mct)
5. [Fonctionnalité d'impression des fiches](#5-fonctionnalité-dimpression-des-fiches)
6. [Structure organisationnelle MCT](#6-structure-organisationnelle-mct)
7. [Répertoire des responsables et emails](#7-répertoire-des-responsables-et-emails)
8. [Architecture technique recommandée](#8-architecture-technique-recommandée)
9. [Structure de la base de données](#9-structure-de-la-base-de-données)
10. [Système de notifications email](#10-système-de-notifications-email)
11. [Interfaces utilisateurs](#11-interfaces-utilisateurs)
12. [Matrice des rôles et permissions](#12-matrice-des-rôles-et-permissions)
13. [Plan de réalisation](#13-plan-de-réalisation)
14. [Exigences non fonctionnelles](#14-exigences-non-fonctionnelles)
15. [Glossaire](#15-glossaire)

---

## 1. Contexte et objectifs

### 1.1 Contexte

Actuellement, les demandes du personnel auprès du service informatique de MCT sont gérées de manière informelle (emails, appels téléphoniques, formulaires papier). Cette situation entraîne :

- Un manque de traçabilité des demandes
- Des pertes de demandes ou des délais de traitement non maîtrisés
- L'absence d'un historique centralisé et consultable
- Des circuits de validation hiérarchiques non formalisés numériquement
- Une rupture entre les formulaires papier officiels (SMQ) et leur suivi

### 1.2 Objectifs du projet

- Centraliser toutes les demandes IT sur une plateforme numérique unique
- Digitaliser les formulaires officiels MCT (ENR.SI.005, ENR.SI.006, ENR.SI.008)
- Automatiser les circuits de validation selon la hiérarchie MCT
- Assurer la traçabilité complète de chaque demande
- Notifier automatiquement chaque acteur par email à chaque étape
- Permettre l'impression des fiches officielles conformes au SMQ à tout moment
- Offrir un tableau de bord de suivi en temps réel

### 1.3 Bénéfices attendus

| Bénéfice | Description |
|---|---|
| **Traçabilité** | Historique complet et horodaté de chaque demande |
| **Rapidité** | Réduction des délais grâce aux notifications automatiques |
| **Transparence** | Chaque demandeur suit l'avancement de sa demande en temps réel |
| **Conformité SMQ** | Formulaires imprimables conformes aux références ENR officielles |
| **Zéro perte** | Aucune demande ne peut être perdue ou oubliée |
| **Reporting** | Statistiques et tableaux de bord disponibles pour la Direction |

---

## 2. Périmètre fonctionnel

### 2.1 Types de demandes

La plateforme prend en charge **4 catégories de demandes** :

| # | Type | Référence SMQ | Description |
|---|---|---|---|
| 1 | Demande d'actif informatique | **ENR.SI.008** | Matériel, licences, logiciels, accès réseau, privilèges |
| 2 | Création d'adresse électronique | **ENR.SI.005** | Nouvel utilisateur, changement de poste |
| 3 | Demande d'impression couleur | **ENR.SI.006** | Impressions A4/A3 couleur |
| 4 | Autre demande IT | — | Toute demande ne rentrant pas dans les catégories ci-dessus |

### 2.2 Fonctionnalités principales

- **Création de demande** via formulaire numérique en ligne
- **Envoi automatique d'emails** de validation à chaque niveau hiérarchique
- **Validation ou rejet** par les responsables directement depuis la plateforme
- **Suivi en temps réel** du statut de la demande avec indicateur d'étape
- **Impression de la fiche officielle** conforme au SMQ MCT à tout moment
- **Tableau de bord** pour les employés, valideurs et le service IT
- **Historique complet** et archivage des demandes
- **Génération de numéro de référence** unique par demande (ex : REF-2026-047)

---

## 3. Workflow de validation

### 3.1 Principe général

Chaque demande suit un circuit de validation multi-niveaux. Le passage d'un niveau au suivant déclenche automatiquement un email de notification au prochain valideur. Chaque validation est horodatée et associée au nom du valideur.

```
[Employé] Crée la demande sur la plateforme
     │
     ▼ Email automatique → Responsable N+1
[N+1 - Chef de Département / Service] Valide ou rejette
     │
     ▼ Email automatique → Responsable N+2
[N+2 - Directeur de Direction] Valide ou rejette
     │
     ▼ Email automatique → Service Informatique
[Service IT] Exécute la demande
     │
     ▼ Notification de clôture → Demandeur
[Demandeur] Informé de la réalisation
```

### 3.2 Workflows détaillés par type de demande

#### 3.2.1 Demande d'actif informatique (ENR.SI.008)

```
Étape 1 : Employé (Demandeur)
     │ → Email à : Chef de Département / Service concerné
     ▼
Étape 2 : Chef de Département / Service
     │ → Email à : Directeur de la Direction concernée (DO / DMBD / DRH / DAF)
     ▼
Étape 3 : DO / DMBD / DRH / DAF
     │ → Email à : Directeur Général
     ▼
Étape 4 : Directeur Général
     │ → Email à : Service Informatique
     ▼
Étape 5 : Service Informatique (Exécution)
     │ → Email de clôture au Demandeur
     ▼
[Clôture]
```

#### 3.2.2 Création d'adresse électronique (ENR.SI.005)

```
Étape 1 : Employé (Demandeur)
     │ → Email à : Superviseur de l'Utilisateur
     ▼
Étape 2 : Superviseur de l'Utilisateur
     │ → Email à : Direction des Ressources Humaines (DRH)
     ▼
Étape 3 : Ressources Humaines
     │ → Email à : Direction des Opérations (DO)
     ▼
Étape 4 : Directeur des Opérations
     │ → Email à : Direction Générale
     ▼
Étape 5 : Direction Générale
     │ → Email à : Service Informatique
     ▼
Étape 6 : Service Informatique (Exécution et création de l'adresse)
     │ → Email de clôture au Demandeur + Superviseur
     ▼
[Clôture]
```

#### 3.2.3 Demande d'impression couleur (ENR.SI.006)

```
Étape 1 : Employé (Demandeur)
     │ → Email à : Chef de Service / Département
     ▼
Étape 2 : Chef de Service
     │ → Email à : DAF (Direction Administrative et Financière)
     ▼
Étape 3 : DAF
     │ → Email à : Service Informatique
     ▼
Étape 4 : Service Informatique (Exécution impression)
     │ → Email de clôture au Demandeur
     ▼
[Clôture]
```

#### 3.2.4 Autre demande IT

```
Étape 1 : Employé (Demandeur)
     │ → Email à : Chef de Département concerné
     ▼
Étape 2 : Chef de Département
     │ → Email à : Direction concernée
     ▼
Étape 3 : Direction concernée
     │ → Email à : Service Informatique
     ▼
Étape 4 : Service Informatique (Traitement)
     │ → Email de clôture au Demandeur
     ▼
[Clôture]
```

### 3.3 Gestion des rejets

- Si une demande est **rejetée** à n'importe quel niveau, le demandeur est notifié par email immédiatement avec le motif de rejet.
- La demande passe au statut **"Rejetée"** et est archivée.
- Le demandeur peut **soumettre une nouvelle demande** corrigée.

### 3.4 Statuts possibles d'une demande

| Statut | Description | Couleur indicateur |
|---|---|---|
| `Brouillon` | Formulaire en cours de rédaction | Gris |
| `Soumise` | Envoyée, en attente de validation N+1 | Orange |
| `Validation N+1` | En cours de validation Chef Dept | Orange |
| `Validation N+2` | En cours de validation Direction | Orange |
| `Validation DG` | En cours de validation DG | Orange |
| `En cours IT` | Reçue par IT, en cours d'exécution | Bleu |
| `Clôturée` | Traitée et clôturée par IT | Vert |
| `Rejetée` | Rejetée par un valideur | Rouge |

---

## 4. Formulaires officiels MCT

### 4.1 Formulaire de création d'adresse électronique — ENR.SI.005

> **Référence :** ENR.SI.005 | **Version :** 01 du 16 mai 2019 | **Statut :** Applicable

#### Champs du formulaire

| Champ | Type | Obligatoire | Remarques |
|---|---|---|---|
| Matricule | Texte court | Non | Optionnel |
| Division | Sélectif (liste) | Oui | Liste des départements/services MCT |
| Nom & Prénoms | Texte | Oui | |
| Numéro Mémo | Texte | Non | Référence interne mémo |

#### Section validation (Date & Visa)

| Niveau | Valideur | Email cible |
|---|---|---|
| 1 | Superviseur de l'Utilisateur | Responsable direct du demandeur |
| 2 | Ressources Humaines | benedicte.djaman@mct.ci |
| 3 | Directeur des Opérations | patrick.yapi@mct.ci |
| 4 | Direction Générale | lamine.kone@mct.ci |

#### Fiche imprimable

La fiche imprimée doit reproduire fidèlement le format officiel :
- En-tête : Logo MCT à gauche, titre centré, logos MCT Électricité / Climatisation / Maintenance à droite
- Bandeau supérieur : "SYSTEME DE MANAGEMENT QUALITE" + référence ENR.SI.005
- Bandeau inférieur d'en-tête : Statut Applicable | Version 01 du 16 mai 2019 | Page 1 sur 1
- Tableau des informations demandeur (Matricule / Division / Nom & Prénoms)
- Ligne Numéro Mémo
- Tableau de validation avec 4 colonnes (Date & Visa)

---

### 4.2 Formulaire de demande d'impression couleur — ENR.SI.006

> **Référence :** ENR.SI.006 | **Version :** 01 du 27 mai 2019 | **Statut :** Applicable

#### Champs du formulaire

| Champ | Type | Obligatoire | Remarques |
|---|---|---|---|
| Objet | Texte long (4 lignes) | Oui | Description de la demande d'impression |
| Nombre de copies A4 | Nombre entier | Oui | Petit format |
| Nombre de copies A3 | Nombre entier | Oui | Grand format |
| Division | Sélectif (liste) | Oui | Département/service du demandeur |
| N° ID | Texte | Non | Champ "Ne pas renseigner" — rempli automatiquement par le système |
| Nom, Prénoms & Signature | Texte | Oui | |

#### Section validation (Date & Visa)

| Niveau | Valideur | Email cible |
|---|---|---|
| 1 | Chef de Service | Chef du service du demandeur |
| 2 | DAF | fatoumata.nguetta-mungai@mct.ci |

#### Fiche imprimable

La fiche imprimée doit reproduire fidèlement le format officiel :
- En-tête : Logo MCT à gauche, titre centré, logos MCT à droite
- Bandeau : "SYSTEME DE MANAGEMENT QUALITE" + référence ENR.SI.006
- Bandeau inférieur : Statut | Version 01 du 27 mai 2019 | Page 1 sur 1
- Zone Objet (grande zone texte sur 4 lignes)
- Tableau copies : A4 | A3
- Tableau Demandeur + Validation : Division | N° ID | Nom-Prénoms-Signature | Chef de Service | DAF
- **Note :** Le champ "N° ID (Ne pas renseigner)" est pré-rempli automatiquement avec le numéro de référence de la demande générée par la plateforme.

---

### 4.3 Demande des actifs informatiques — ENR.SI.008

> **Référence :** ENR.SI.008 | **Version :** 01 du 03 mai 2024 | **Statut :** Applicable

#### Champs du formulaire

**Bloc identité demandeur**

| Champ | Type | Obligatoire | Remarques |
|---|---|---|---|
| Matricule | Texte court | Non | Optionnel |
| Département / Service | Sélectif (liste) | Oui | Liste des départements/services MCT |
| Nom et Prénom | Texte | Oui | |
| Fonction | Texte | Oui | Titre du poste |

**Bloc demandes informatiques**

| Champ | Type | Obligatoire | Remarques |
|---|---|---|---|
| Demandes informatiques | Texte long | Non | Énumérer les matériels demandés |

**Bloc licences / applications / logiciels**

| Champ | Type | Obligatoire | Remarques |
|---|---|---|---|
| Licences - Applications - Logiciels | Texte long | Non | Énumérer les logiciels et applications à installer |

**Bloc accès et privilèges**

| Champ | Type | Obligatoire | Remarques |
|---|---|---|---|
| Accès et privilège utilisateur (ordinateur + réseau) | Texte long | Non | Imprimantes, lecteurs partagés, accès réseau à connecter |

**Bloc motif**

| Champ | Type | Obligatoire | Remarques |
|---|---|---|---|
| Motif de la demande | Texte long | Oui | Raisons justifiant la demande |

#### Section validation (Date et Signature)

| Niveau | Valideur | Email cible |
|---|---|---|
| 1 | Demandeur | L'employé lui-même (signature à la soumission) |
| 2 | Chef de département / Service | Chef du service du demandeur |
| 3 | DO / DMBD / DRH / DAF | Directeur de la direction concernée |
| 4 | Directeur Général | lamine.kone@mct.ci |

#### Fiche imprimable

La fiche imprimée doit reproduire fidèlement le format officiel :
- En-tête : Logo MCT | Titre "DEMANDE DES ACTIFS INFORMATIQUES" | Logos MCT à droite
- Bandeau : "SYSTEME DE MANAGEMENT QUALITE" + référence ENR.SI.008
- Bandeau inférieur : Statut | Version 01 du 03 mai 2024 | Page 1 sur 1
- Tableau identité : Matricule | Département/Service | Nom et Prénom | Fonction
- Bloc grisé "DEMANDES INFORMATIQUES" avec grande zone de texte
- Bloc grisé "LICENCES - APPLICATIONS - LOGICIELS" avec grande zone de texte
- Bloc grisé "ACCES ET PRIVILEGE DE L'UTILISATEUR SUR SON ORDINATEUR ET LE RESEAU" avec zone de texte
- Bloc grisé "MOTIF DE LA DEMANDE" avec zone de texte
- Tableau validation "DATE ET SIGNATURE" avec 4 colonnes : Demandeur | Chef de département/Service | DO/DMBD/DRH/DAF | Directeur Général

---

## 5. Fonctionnalité d'impression des fiches

### 5.1 Principe

À tout moment du cycle de vie d'une demande, l'utilisateur (demandeur, valideur, ou service IT) peut **générer et imprimer la fiche officielle** de la demande, au format conforme au Système de Management Qualité (SMQ) de MCT.

### 5.2 Comportement de la fiche imprimable

- La fiche est générée au format **PDF** directement depuis le navigateur (sans logiciel externe)
- Elle reproduit fidèlement la mise en page des formulaires papier MCT
- Les champs remplis sur la plateforme sont **pré-remplis automatiquement** dans la fiche
- Les cases de validation affichent :
  - Le **nom du valideur** ayant approuvé
  - La **date de validation** au format JJ/MM/AAAA
  - La mention **"Validé"** ou **"Rejeté"** selon le cas
  - Les niveaux non encore atteints restent **vides** (pour signature manuelle éventuelle)
- Le **numéro de référence** de la demande (ex : REF-2026-047) est inclus dans le bandeau

### 5.3 Éléments de l'en-tête commun à tous les formulaires

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo MCT]  │  SYSTEME DE MANAGEMENT QUALITE                      │
│              │  ENR.SI.XXX                                         │
│  M.C.T.      │  TITRE DU FORMULAIRE          │ [MCT] [MCT] [MCT]  │
│──────────────┼──────────────────────────────────────────────────── │
│ Statut: Applicable │ Version XX du JJ mois AAAA │ Page 1 sur 1    │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4 Déclencheurs d'impression

| Moment | Qui peut imprimer | État de la fiche |
|---|---|---|
| Après soumission | Demandeur | Cases validation vides |
| Après validation N+1 | Demandeur, Chef Dept | Case N+1 remplie |
| Après validation N+2 | Demandeur, Valideurs | Cases N+1 et N+2 remplies |
| Après validation DG | Tous | Cases N+1, N+2, DG remplies |
| Après traitement IT | Tous | Toutes cases remplies + mention "Clôturée" |

### 5.5 Technologies d'impression

- **Librairie recommandée :** `jsPDF` + `html2canvas` (côté client) ou `Puppeteer` (côté serveur)
- **Format de sortie :** PDF A4, orientation portrait
- **Résolution :** 150 DPI minimum pour qualité d'impression acceptable
- **Bouton d'accès :** "🖨️ Imprimer la fiche" disponible sur chaque page de détail d'une demande

---

## 6. Structure organisationnelle MCT

### 6.1 Directions et leurs départements / services

| Direction | Sigle | Départements / Services |
|---|---|---|
| Direction Générale | DG | Informatique, Secrétariat |
| Direction Administrative et Financière | DAF | Trésorerie, Comptabilité, Achat et Logistique, Recouvrement |
| Management Business Development | MBD | Showroom Faya, Showroom Vallon, Smart Maintenance |
| Direction des Opérations | DO | Fluide 1, Fluide 2, RLC 1, RLC 2, Électricité 1, Électricité 2, Facilitie Management |
| Direction des Ressources Humaines | DRH | DRH |
| Qualité Hygiène Sécurité Environnement | QHSE | QHSE |

### 6.2 Liste complète des départements / services (liste déroulante plateforme)

```
Direction Générale
  ├── Informatique
  └── Secrétariat

Direction Administrative et Financière (DAF)
  ├── Trésorerie
  ├── Comptabilité
  ├── Achat et Logistique
  └── Recouvrement

Management Business Development (MBD)
  ├── Showroom Faya
  ├── Showroom Vallon
  └── Smart Maintenance

Direction des Opérations (DO)
  ├── Fluide 1
  ├── Fluide 2
  ├── RLC 1
  ├── RLC 2
  ├── Électricité 1
  ├── Électricité 2
  └── Facilitie Management

DRH

QHSE
```

---

## 7. Répertoire des responsables et emails

### 7.1 Directeurs

| Direction | Nom | Email |
|---|---|---|
| Direction Générale (DG) | Lamine KONE | lamine.kone@mct.ci |
| Direction Administrative et Financière (DAF) | Fatoumata N'Guetta | fatoumata.nguetta-mungai@mct.ci |
| Management Business Development (MBD) | Yaya SOKOBA | yaya.sokoba@mct.ci |
| Direction des Opérations (DO) | Patrick YAPI | patrick.yapi@mct.ci |
| Direction des Ressources Humaines (DRH) | Bénédicte DJAMAN | benedicte.djaman@mct.ci |
| Qualité Hygiène Sécurité Environnement (QHSE) | Daniel BODJO | daniel.bodjo@mct.ci |

### 7.2 Chefs de département (Direction des Opérations)

| Département | Nom | Email |
|---|---|---|
| Fluide 1 | Cheick DIAWARA | cheick.diawara@mct.ci |
| Fluide 2 | Annie HOUPHOUET | annie.houphouet@mct.ci |
| RLC 1 | Bangaly BAMBA | bangaly.bamba@mct.ci |
| RLC 2 | Xavier MIEZAN | xavier.miezan@mct.ci |
| Électricité 1 | Drissa MARIKO | drissa.mariko@mct.ci |
| Électricité 2 | Aboubacar TOURE | aboubacar.toure@mct.ci |
| Facilitie Management | Roger ANDO | roger.ando@mct.ci |

### 7.3 Chefs de service

| Service | Nom | Email |
|---|---|---|
| Informatique | Thierry KONE | thierry.kone@mct.ci |
| Secrétariat | Marie-Candice AHUI | secretariat@mct.ci |
| Trésorerie | Lewis Prao KOUASSI | proa.kouassi@mct.ci |
| Comptabilité | Souleymane BALLO | souleymane.ballo@mct.ci |
| Achat et Logistique | Noel GAHIE | noel.gahie@mct.ci |
| Recouvrement | Aichata SOUMAHORO | aichata.soumahoro@mct.ci |
| Bureau d'étude | Marie-Françoise KONE | marie-francoise.kone@mct.ci |

### 7.4 Logique de routage des emails par département du demandeur

| Département du demandeur | Chef de service/dept | Directeur N+2 |
|---|---|---|
| Fluide 1 | cheick.diawara@mct.ci | patrick.yapi@mct.ci (DO) |
| Fluide 2 | annie.houphouet@mct.ci | patrick.yapi@mct.ci (DO) |
| RLC 1 | bangaly.bamba@mct.ci | patrick.yapi@mct.ci (DO) |
| RLC 2 | xavier.miezan@mct.ci | patrick.yapi@mct.ci (DO) |
| Électricité 1 | drissa.mariko@mct.ci | patrick.yapi@mct.ci (DO) |
| Électricité 2 | aboubacar.toure@mct.ci | patrick.yapi@mct.ci (DO) |
| Facilitie Management | roger.ando@mct.ci | patrick.yapi@mct.ci (DO) |
| Informatique | thierry.kone@mct.ci | lamine.kone@mct.ci (DG) |
| Secrétariat | secretariat@mct.ci | lamine.kone@mct.ci (DG) |
| Trésorerie | proa.kouassi@mct.ci | fatoumata.nguetta-mungai@mct.ci (DAF) |
| Comptabilité | souleymane.ballo@mct.ci | fatoumata.nguetta-mungai@mct.ci (DAF) |
| Achat et Logistique | noel.gahie@mct.ci | fatoumata.nguetta-mungai@mct.ci (DAF) |
| Recouvrement | aichata.soumahoro@mct.ci | fatoumata.nguetta-mungai@mct.ci (DAF) |
| Showroom Faya | — | yaya.sokoba@mct.ci (MBD) |
| Showroom Vallon | — | yaya.sokoba@mct.ci (MBD) |
| Smart Maintenance | — | yaya.sokoba@mct.ci (MBD) |
| DRH | benedicte.djaman@mct.ci | lamine.kone@mct.ci (DG) |
| QHSE | daniel.bodjo@mct.ci | lamine.kone@mct.ci (DG) |

---

## 8. Architecture technique recommandée

### 8.1 Stack technologique

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND                          │
│         React.js + TailwindCSS                      │
│   Formulaires | Tableau de bord | Fiche PDF         │
├─────────────────────────────────────────────────────┤
│                   BACKEND                           │
│         Node.js + Express.js                        │
│   API REST | Moteur de workflow | Email service      │
├─────────────────────────────────────────────────────┤
│                  BASE DE DONNÉES                    │
│              PostgreSQL                             │
│   Utilisateurs | Demandes | Validations | Logs       │
├─────────────────────────────────────────────────────┤
│               SERVICE EMAIL                         │
│         Nodemailer + SMTP MCT                       │
│   Notifications automatiques | Templates HTML       │
├─────────────────────────────────────────────────────┤
│             GÉNÉRATION PDF                          │
│         Puppeteer (serveur) ou jsPDF (client)       │
│   Fiches officielles MCT imprimables                │
└─────────────────────────────────────────────────────┘
```

### 8.2 Composants détaillés

| Composant | Technologie | Rôle |
|---|---|---|
| Frontend | React.js | Interface utilisateur, formulaires, tableau de bord |
| Style | TailwindCSS | Mise en page et composants visuels |
| Backend | Node.js / Express | API REST, logique métier, moteur workflow |
| Base de données | PostgreSQL | Stockage persistant de toutes les données |
| ORM | Prisma | Gestion de la base de données côté code |
| Authentification | JWT + bcrypt | Connexion sécurisée des utilisateurs |
| Emails | Nodemailer + SMTP | Envoi des notifications automatiques |
| PDF | Puppeteer | Génération des fiches officielles MCT |
| Hébergement | Serveur MCT / Cloud | Mise en production |

### 8.3 Architecture des dossiers (backend)

```
mct-it-portal/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── request.controller.js
│   │   │   ├── validation.controller.js
│   │   │   └── pdf.controller.js
│   │   ├── services/
│   │   │   ├── email.service.js
│   │   │   ├── workflow.service.js
│   │   │   └── pdf.service.js
│   │   ├── models/
│   │   │   ├── user.model.js
│   │   │   ├── request.model.js
│   │   │   └── validation.model.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── requests.routes.js
│   │   │   └── validations.routes.js
│   │   ├── templates/
│   │   │   ├── email/
│   │   │   │   ├── validation-request.html
│   │   │   │   └── closure-notification.html
│   │   │   └── pdf/
│   │   │       ├── ENR-SI-005.html   ← Fiche création email
│   │   │       ├── ENR-SI-006.html   ← Fiche impression couleur
│   │   │       └── ENR-SI-008.html   ← Fiche actifs informatiques
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── role.middleware.js
│   │   └── config/
│   │       ├── database.js
│   │       ├── email.js
│   │       └── departments.js        ← Hiérarchie MCT
│   └── prisma/
│       └── schema.prisma
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── public/
│       └── assets/
│           └── logo-mct.png
└── README.md
```

---

## 9. Structure de la base de données

### 9.1 Table `users` — Utilisateurs

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule     VARCHAR(20),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  fonction      VARCHAR(150),
  department_id UUID REFERENCES departments(id),
  role          VARCHAR(50) NOT NULL,  -- 'employee' | 'chef_dept' | 'directeur' | 'dg' | 'rh' | 'it'
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### 9.2 Table `departments` — Départements et services

```sql
CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom           VARCHAR(100) NOT NULL,
  direction     VARCHAR(10) NOT NULL,  -- 'DG' | 'DAF' | 'MBD' | 'DO' | 'DRH' | 'QHSE'
  chef_id       UUID REFERENCES users(id),
  directeur_id  UUID REFERENCES users(id)
);
```

### 9.3 Table `requests` — Demandes

```sql
CREATE TABLE requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       VARCHAR(20) UNIQUE NOT NULL,  -- ex: REF-2026-047
  type            VARCHAR(30) NOT NULL,          -- 'actif' | 'email' | 'impression' | 'autre'
  smq_reference   VARCHAR(20),                  -- ENR.SI.005 | ENR.SI.006 | ENR.SI.008
  status          VARCHAR(30) NOT NULL DEFAULT 'submitted',
  demandeur_id    UUID REFERENCES users(id),
  department_id   UUID REFERENCES departments(id),
  form_data       JSONB NOT NULL,               -- Données du formulaire sérialisées
  current_step    INTEGER DEFAULT 1,
  total_steps     INTEGER NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  closed_at       TIMESTAMP
);
```

### 9.4 Table `validations` — Étapes de validation

```sql
CREATE TABLE validations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID REFERENCES requests(id) ON DELETE CASCADE,
  step_number   INTEGER NOT NULL,
  step_label    VARCHAR(100) NOT NULL,         -- 'Chef Département' | 'DRH' | 'DG' etc.
  valideur_id   UUID REFERENCES users(id),
  valideur_email VARCHAR(150),
  status        VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  commentaire   TEXT,
  validated_at  TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### 9.5 Table `email_logs` — Historique des emails

```sql
CREATE TABLE email_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID REFERENCES requests(id),
  recipient     VARCHAR(150) NOT NULL,
  subject       VARCHAR(255) NOT NULL,
  type          VARCHAR(50) NOT NULL,           -- 'validation_request' | 'approval' | 'rejection' | 'closure'
  sent_at       TIMESTAMP DEFAULT NOW(),
  status        VARCHAR(20) DEFAULT 'sent'
);
```

---

## 10. Système de notifications email

### 10.1 Emails automatiques déclenchés

| Événement | Destinataire | Objet de l'email |
|---|---|---|
| Demande soumise | Valideur N+1 | `[MCT IT] Demande REF-XXXX en attente de votre validation` |
| Validation N+1 accordée | Valideur N+2 | `[MCT IT] Demande REF-XXXX en attente de votre validation` |
| Validation N+2 accordée | Valideur N+3 / IT | `[MCT IT] Demande REF-XXXX en attente de votre validation` |
| Demande rejetée | Demandeur | `[MCT IT] Votre demande REF-XXXX a été rejetée` |
| Demande clôturée | Demandeur | `[MCT IT] Votre demande REF-XXXX a été traitée` |

### 10.2 Contenu type d'un email de validation

```
Objet : [MCT IT] Demande REF-2026-047 en attente de votre validation

Bonjour [Nom du Valideur],

Une demande informatique nécessite votre validation.

────────────────────────────────────
DÉTAIL DE LA DEMANDE
────────────────────────────────────
Référence      : REF-2026-047
Type           : Demande d'actif informatique (ENR.SI.008)
Demandeur      : [Nom Prénom]
Département    : Fluide 1
Date de dépôt  : 06/05/2026
────────────────────────────────────

Pour valider ou rejeter cette demande, cliquez sur le lien ci-dessous :

👉 [ACCÉDER À LA DEMANDE] → https://itportal.mct.ci/requests/REF-2026-047

Cordialement,
Le Service Informatique MCT
thierry.kone@mct.ci
```

---

## 11. Interfaces utilisateurs

### 11.1 Interface Employé (Demandeur)

- **Tableau de bord personnel** : résumé de ses demandes (en cours, validées, rejetées)
- **Création de demande** : sélection du type + formulaire adapté
- **Suivi en temps réel** : indicateur visuel d'avancement (étapes cochées)
- **Impression de fiche** : bouton "Imprimer la fiche" sur chaque demande
- **Historique** : liste complète de toutes ses demandes passées

### 11.2 Interface Valideur (Chef Dept / Directeur / DG / DRH)

- **File d'attente** : liste des demandes en attente de sa validation
- **Détail de la demande** : vue complète du formulaire soumis
- **Actions** : Bouton "Valider" / "Rejeter" avec champ commentaire
- **Historique** : toutes les demandes qu'il a validées ou rejetées
- **Impression de fiche** : accès à la fiche officielle MCT

### 11.3 Interface Service Informatique

- **Toutes les demandes validées** : file d'attente pour traitement
- **Assignation** : possibilité d'assigner une demande à un technicien IT
- **Clôture** : marquage de la demande comme traitée + commentaire de clôture
- **Tableau de bord global** : statistiques de toutes les demandes
- **Impression** : génération de fiches officielles pour archivage

### 11.4 Interface Administration

- **Gestion des utilisateurs** : création, modification, désactivation
- **Gestion des départements** : mise à jour des responsables
- **Reporting** : export des données (CSV / Excel)
- **Paramétrage des workflows** : modification des circuits de validation

---

## 12. Matrice des rôles et permissions

| Action | Employé | Chef Dept | Directeur | DG | DRH | IT | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Créer une demande | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir ses propres demandes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir les demandes de son dept | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Valider une demande (N+1) | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Valider une demande (N+2) | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Valider en tant que DG | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Rejeter une demande | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Traiter / Clôturer | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Imprimer la fiche | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir toutes les demandes | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Gérer les utilisateurs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Exporter les données | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |

---

## 13. Plan de réalisation

### 13.1 Phases du projet

#### Phase 1 — Fondations (Semaines 1–4)

- [ ] Mise en place de l'environnement de développement
- [ ] Création de la base de données PostgreSQL
- [ ] Intégration de la hiérarchie MCT (départements, responsables, emails)
- [ ] Système d'authentification (JWT)
- [ ] API REST de base (CRUD utilisateurs, demandes)
- [ ] Moteur de workflow configurable par type de demande

#### Phase 2 — Formulaires et workflows (Semaines 5–8)

- [ ] Formulaire ENR.SI.008 — Actifs informatiques
- [ ] Formulaire ENR.SI.005 — Création adresse email
- [ ] Formulaire ENR.SI.006 — Impression couleur
- [ ] Formulaire libre — Autre demande IT
- [ ] Moteur d'envoi d'emails automatiques (Nodemailer + templates HTML)
- [ ] Routage automatique des emails selon le département du demandeur
- [ ] Gestion des rejets avec notification

#### Phase 3 — Génération PDF et impression (Semaines 9–10)

- [ ] Template HTML/CSS fidèle ENR.SI.005
- [ ] Template HTML/CSS fidèle ENR.SI.006
- [ ] Template HTML/CSS fidèle ENR.SI.008
- [ ] Service Puppeteer de génération PDF côté serveur
- [ ] Bouton "Imprimer la fiche" sur chaque demande
- [ ] Pré-remplissage automatique des champs de validation dans la fiche

#### Phase 4 — Interfaces et tableaux de bord (Semaines 11–13)

- [ ] Interface Employé (création + suivi + impression)
- [ ] Interface Valideur (file d'attente + actions)
- [ ] Interface Service IT (traitement + clôture)
- [ ] Interface Administration (gestion utilisateurs + reporting)
- [ ] Tableau de bord statistiques global

#### Phase 5 — Tests et déploiement (Semaines 14–16)

- [ ] Tests fonctionnels des 4 types de formulaires
- [ ] Tests des chaînes d'emails avec adresses MCT réelles
- [ ] Tests de génération PDF sur les 3 formulaires officiels
- [ ] Tests de charge et de sécurité
- [ ] Formation des utilisateurs clés (IT, Chefs Dept)
- [ ] Déploiement sur serveur MCT (ou cloud)
- [ ] Mise en production

### 13.2 Planning prévisionnel

| Phase | Durée | Livrable |
|---|---|---|
| Phase 1 — Fondations | 4 semaines | Base de données + API + Authentification |
| Phase 2 — Formulaires & Workflows | 4 semaines | 4 formulaires + emails automatiques |
| Phase 3 — PDF & Impression | 2 semaines | Fiches officielles MCT imprimables |
| Phase 4 — Interfaces | 3 semaines | Application complète et fonctionnelle |
| Phase 5 — Tests & Déploiement | 3 semaines | Plateforme en production |
| **Total** | **~16 semaines** | **MCT IT Portal v1.0** |

---

## 14. Exigences non fonctionnelles

### 14.1 Sécurité

- Authentification par email + mot de passe avec hachage `bcrypt`
- Tokens JWT avec expiration à 8 heures (durée d'une journée de travail)
- Accès aux demandes strictement limité par rôle et département
- Connexion HTTPS obligatoire en production
- Journalisation (logs) de toutes les actions sensibles

### 14.2 Performance

- Temps de chargement des pages < 2 secondes
- Génération du PDF < 5 secondes
- Envoi des emails < 30 secondes après validation

### 14.3 Disponibilité

- Disponibilité cible : 99% (hors maintenances planifiées)
- Sauvegardes automatiques de la base de données : quotidiennes
- Accès possible depuis le réseau MCT et en mobilité (responsive design)

### 14.4 Compatibilité

- Navigateurs supportés : Chrome, Firefox, Edge (versions récentes)
- Responsive : utilisable sur tablette et smartphone
- Impression PDF compatible avec les imprimantes réseau MCT

### 14.5 Conformité SMQ

- Toutes les fiches imprimables respectent les références ENR officielles MCT
- Les numéros de version et dates des formulaires sont maintenus à jour
- L'historique complet de chaque demande est conservé (archivage légal)

---

## 15. Glossaire

| Terme | Définition |
|---|---|
| **SMQ** | Système de Management Qualité — référentiel qualité de MCT |
| **ENR.SI** | Référence des enregistrements du Service Informatique dans le SMQ |
| **N+1** | Responsable hiérarchique direct du demandeur (Chef de Département/Service) |
| **N+2** | Responsable hiérarchique de niveau 2 (Directeur de Direction) |
| **DG** | Directeur Général |
| **DAF** | Direction Administrative et Financière |
| **DO** | Direction des Opérations |
| **MBD** | Management Business Development |
| **DRH** | Direction des Ressources Humaines |
| **QHSE** | Qualité Hygiène Sécurité Environnement |
| **JWT** | JSON Web Token — mécanisme d'authentification sécurisé |
| **API REST** | Interface de programmation permettant la communication entre le frontend et le backend |
| **PDF** | Format de document portable pour l'impression des fiches officielles |
| **Workflow** | Circuit de validation automatisé d'une demande |
| **REF** | Numéro de référence unique attribué à chaque demande (ex : REF-2026-047) |

---

> **Document rédigé pour MCT — Confidentiel**
> Toute reproduction ou diffusion hors MCT est interdite sans autorisation préalable.
> Contact projet : bassirou.ouedraogo@mct.ci
