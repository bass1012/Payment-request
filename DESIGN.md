---
name: MCT IT Portal
description: Portail interne de gestion des demandes IT pour MCT
colors:
  mct-blue: "#003087"
  mct-red: "#C8102E"
  mct-gray: "#6B7280"
  surface-primary: "#F8FAFC"
  surface-card: "#FFFFFF"
  surface-dark: "#020617"
  surface-dark-mid: "#172554"
  accent-blue: "#2563EB"
  accent-indigo: "#4338CA"
  text-primary: "#0F172A"
  text-secondary: "#64748B"
  text-muted: "#94A3B8"
  border-default: "#E2E8F0"
  border-subtle: "#F1F5F9"
  status-submitted: "#F97316"
  status-submitted-bg: "#FFF7ED"
  status-pending: "#EAB308"
  status-pending-bg: "#FEFCE8"
  status-in-progress: "#3B82F6"
  status-in-progress-bg: "#EFF6FF"
  status-closed: "#22C55E"
  status-closed-bg: "#F0FDF4"
  status-rejected: "#EF4444"
  status-rejected-bg: "#FEF2F2"
  status-draft: "#6B7280"
  status-draft-bg: "#F9FAFB"
  status-payment: "#A855F7"
  status-payment-bg: "#FAF5FF"
  status-decision: "#6366F1"
  status-decision-bg: "#EEF2FF"
typography:
  display:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  title:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "linear-gradient(to right, {colors.accent-blue}, {colors.accent-indigo})"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "linear-gradient(to right, #1D4ED8, #3730A3)"
  button-secondary:
    backgroundColor: "{colors.surface-primary}"
    textColor: "{colors.mct-gray}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.status-rejected}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  card-default:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "20px 24px"
  input-default:
    backgroundColor: "#F8FAFC80"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  badge-status:
    rounded: "{rounded.full}"
    padding: "2px 10px"
  nav-sidebar:
    backgroundColor: "{colors.mct-blue}"
    textColor: "#FFFFFF"
    padding: "10px 12px"
    rounded: "{rounded.sm}"
---

# Design System: MCT IT Portal

## Overview

**Creative North Star: "Le Bureau Numérique"**

Le MCT IT Portal est un espace de travail administratif digitalisé qui incarne l'autorité institutionnelle de MCT tout en offrant une expérience fluide et contemporaine. Le système visuel repose sur un fond clair et neutre (slate-50) structuré par une navigation latérale bleu institutionnel, des cartes blanches à bords généreux, et des dégradés bleu-indigo ciblés sur les éléments d'action. L'ambiance est professionnelle et sérieuse — l'outil doit inspirer confiance, pas séduire.

La densité est moyenne : suffisamment aérée pour que chaque information respire dans les vues de détail, mais compacte dans les tableaux et listes pour permettre un balayage rapide. Le mode sombre est réservé aux zones d'alerte haute priorité (section "À traiter par moi" du dashboard), créant un contraste fonctionnel, pas décoratif.

**Key Characteristics:**
- Fond clair slate-50 avec cartes blanches à ombres légères
- Navigation latérale fixe en bleu institutionnel MCT (#003087)
- Dégradés bleu→indigo réservés aux CTAs primaires
- Bords arrondis généreux (12-24px) sur cartes et boutons
- Badges colorés par statut pour une lecture immédiate du workflow
- Section prioritaire en fond sombre pour rupture visuelle contrôlée

## Colors

Une palette construite sur l'identité corporate MCT (bleu #003087 + rouge #C8102E), étendue par les couleurs fonctionnelles Tailwind slate pour les surfaces et des couleurs sémantiques pour le système de statuts.

### Primary
- **Bleu Institutionnel MCT** (#003087): Couleur de marque principale. Utilisée exclusivement pour la sidebar de navigation, la barre mobile, et les éléments qui portent l'identité MCT. Jamais en fond de page.
- **Dégradé Action** (from-blue-600 to-indigo-700, soit #2563EB → #4338CA): Réservé aux boutons d'action primaire (CTA), aux titres accentués, et au panneau de connexion. Le dégradé signale "agissez ici".

### Secondary
- **Rouge Alerte MCT** (#C8102E): Couleur secondaire de marque MCT. Utilisée uniquement pour les actions destructives et les états d'erreur. Jamais décoratif.

### Neutral
- **Ardoise Claire** (#F8FAFC / slate-50): Surface de fond principale de toute l'application.
- **Blanc Pur** (#FFFFFF): Surface des cartes, modales, et zones de contenu.
- **Encre Profonde** (#0F172A / slate-900): Texte principal, titres, et noms.
- **Ardoise Moyenne** (#64748B / slate-500): Texte secondaire, descriptions, horodatages.
- **Ardoise Pâle** (#94A3B8 / slate-400): Texte muet, hints, placeholders.
- **Fil d'Ardoise** (#E2E8F0 / slate-200): Bordures par défaut, séparateurs.
- **Nuit Profonde** (#020617 / slate-950): Fond de la section dark du dashboard et du panneau login.

### Named Rules
**The Status Spectrum Rule.** Chaque statut de workflow a une paire couleur fixe (texte + fond) qui ne sert qu'à ce statut. Orange = soumis, jaune = en attente, bleu = en cours, vert = clôturé, rouge = rejeté, gris = brouillon, violet = paiement, indigo = décision. Ne jamais réutiliser une couleur de statut pour un autre usage.

## Typography

**Display Font:** System UI stack (system-ui, -apple-system, sans-serif)
**Body Font:** System UI stack (identique)
**Mono Font:** Tailwind `font-mono` pour les références de demandes (REF-2026-047)

**Character:** Sobre et fonctionnel. Le stack système garantit la lisibilité native sur tous les postes MCT. La hiérarchie s'exprime par le poids (400 → 800) et la taille, jamais par le changement de famille typographique.

### Hierarchy
- **Display** (extrabold/800, clamp 1.875-2.25rem, line-height 1.2, tracking -0.025em): Titre d'accueil du dashboard uniquement ("Bonjour, [Prénom]").
- **Headline** (bold/700, 1.125rem, line-height 1.4): Titres de sections, en-têtes de cartes.
- **Title** (semibold/600, 0.875rem, line-height 1.5): Labels de formulaire, sous-titres, noms dans les tableaux.
- **Body** (regular/400, 0.875rem, line-height 1.6): Texte courant, descriptions, contenu de cellules.
- **Label** (semibold/600, 0.75rem, tracking 0.05em, uppercase): Labels de champs de formulaire sur la page login, kickers de version ("MCT Portal v2.0").

### Named Rules
**The Weight-Not-Font Rule.** La hiérarchie typographique se construit exclusivement par le poids (400-800) et la taille. Pas de changement de famille typographique entre niveaux. Le monospace (`font-mono`) est réservé aux références de demandes et aux identifiants techniques.

## Layout

L'application utilise un layout sidebar fixe + zone de contenu scrollable :

- **Sidebar** : fixe, 256px de large (`w-64`), pleine hauteur, en bleu MCT #003087. Cachée sur mobile, remplacée par un header fixe 64px + menu hamburger.
- **Zone de contenu** : marge gauche 256px sur desktop, padding interne 32px (`p-8`), réduit à 16px (`p-4`) sur mobile.
- **Grille de statistiques** : 4 colonnes sur desktop (`md:grid-cols-4`), 2 colonnes sur mobile (`grid-cols-2`), gap 16px.
- **Grille d'actions prioritaires** : 5 colonnes sur XL (`xl:grid-cols-5`), 2 sur tablette (`md:grid-cols-2`), gap 1px avec fond semi-transparent comme séparateur.
- **Grille de types de demandes** : 6 colonnes sur desktop (`lg:grid-cols-6`), 3 sur tablette (`sm:grid-cols-3`), 2 sur mobile (`grid-cols-2`).
- **Tableaux** : pleine largeur, scroll horizontal sur mobile, headers en slate-50.
- **Espacement vertical** : `space-y-8` (32px) entre sections principales, `space-y-4` (16px) au sein d'une section.

## Elevation & Depth

Système d'élévation hybride : tonal (fond coloré) pour la majorité des surfaces, ombres légères pour les cartes flottantes et les modales.

La plupart des surfaces sont plates par défaut (cartes sur fond blanc avec bordure slate-200). Les ombres apparaissent en réponse à l'importance :
- `shadow-sm` : cartes de contenu standard
- `shadow-md` : sidebar mobile, header
- `shadow-lg` : boutons CTA primaires (via `shadow-lg shadow-blue-500/10`)
- `shadow-xl` : formulaire de connexion, section prioritaire

La section "À traiter par moi" utilise la profondeur tonale (fond slate-900/blue-950) plutôt qu'une ombre pour créer la rupture visuelle.

### Named Rules
**The Tonal-Before-Shadow Rule.** Préférer un changement de fond (blanc → sombre, blanc → teinté) à un ajout d'ombre pour signifier l'importance. Les ombres sont des finitions, pas des marqueurs de hiérarchie.

## Shapes

Le système de formes utilise des coins arrondis généreux et cohérents :

- **Cartes et conteneurs** : coins largement arrondis (16-24px / `rounded-2xl` à `rounded-3xl`). Les cartes principales du dashboard et le formulaire de connexion utilisent `rounded-3xl` (24px).
- **Boutons** : arrondis moyens à grands (12-16px / `rounded-xl` à `rounded-2xl`).
- **Inputs** : arrondis moyens (12px / `rounded-xl`).
- **Badges de statut** : pleinement arrondis (`rounded-full` / 9999px) — forme pilule.
- **Éléments de sidebar** : arrondis modérés (8px / `rounded-lg`).
- **Glassmorphism** : utilisé sur la page de connexion pour les cards de fonctionnalités (backdrop-blur-md + bg-white/5 + border-white/10). Réservé aux éléments décoratifs sur fond sombre, jamais sur les surfaces de travail.

Les bordures sont fines (1px) en slate-200 par défaut, semi-transparentes (white/10) sur fonds sombres.

## Components

### Buttons
- **Shape:** Généreusement arrondi (12-16px)
- **Primary:** Dégradé bleu-indigo (`from-blue-600 to-indigo-700`), texte blanc, padding 12px 24px, shadow-lg légère bleutée. Active scale 98%. Transition-all.
- **Hover / Focus:** Dégradé plus foncé (`from-blue-700 to-indigo-800`), ombre bleue plus visible. Focus : `ring-2 ring-blue-600 ring-offset-2`.
- **Secondary:** Fond slate-100, texte slate-700, hover fond slate-200. Pas d'ombre.
- **Danger:** Fond red-600, texte blanc, hover red-700.
- **Disabled:** opacity-50, cursor-not-allowed sur tous les variants.

### Cards / Containers
- **Corner Style:** Largement arrondi (16-24px / `rounded-2xl` à `rounded-3xl`)
- **Background:** Blanc (#FFFFFF) par défaut. Fond sombre (slate-900 → blue-950) pour la section prioritaire.
- **Shadow Strategy:** shadow-sm par défaut avec bordure slate-200. shadow-xl pour les formulaires modaux.
- **Border:** 1px slate-200 standard. white/10 sur fond sombre.
- **Internal Padding:** 20-24px (`p-5` à `p-6`)

### Stat Cards
- **Style:** Fond teinté par couleur sémantique (blue-50, amber-50, sky-50, green-50), bord blanc, shadow-sm.
- **Accent:** Barre de dégradé de 2px en bas de chaque card, couleur spécifique au type.
- **Value:** Texte 3xl extrabold en couleur sémantique (blue-700, amber-700, etc.)

### Inputs / Fields
- **Style:** Fond légèrement teinté (`slate-50/50`), bordure 1px slate-200, coins arrondis 12px.
- **Focus:** Fond passe à blanc pur, ring-2 blue-500, bordure transparente, transition 200ms.
- **Labels:** uppercase, tracking-wider, texte xs semibold slate-500.

### Badges de Statut
- **Style:** Forme pilule (rounded-full), fond teinté léger, texte xs medium dans la couleur foncée correspondante.
- **Variants:** soumis (orange-100/orange-800), en attente (yellow-100/yellow-800), en cours (blue-100/blue-800), clôturé (green-100/green-800), rejeté (red-100/red-800), brouillon (gray-100/gray-700), paiement (purple-100/purple-800), décision (indigo-100/indigo-800 + bordure + pulse).

### Navigation (Sidebar)
- **Style:** Fond plein bleu MCT #003087, texte blanc/blue-200.
- **Items:** Icône 20px + label 14px semibold, padding 10px 12px, gap 12px, rounded-lg.
- **Active:** bg-white/20, texte blanc.
- **Hover:** bg-white/10, texte blanc.
- **Mobile:** Header fixe 64px + menu hamburger, sidebar en overlay avec backdrop slate-950/50.

### Glassmorphism Cards (Login only)
- **Style:** bg-white/5, backdrop-blur-md, border white/10, rounded-2xl. Exclusivement sur le panneau décoratif de la page de connexion.

## Do's and Don'ts

### Do:
- **Do** utiliser le dégradé bleu→indigo uniquement sur les boutons d'action primaire et les titres accentués. Le dégradé signale "ceci attend votre action".
- **Do** maintenir la paire couleur-statut fixe pour chaque état du workflow. Un badge vert signifie toujours "clôturé", jamais "succès" d'un autre contexte.
- **Do** utiliser `rounded-2xl` à `rounded-3xl` pour les cartes et conteneurs, `rounded-xl` pour les boutons et inputs, `rounded-full` pour les badges.
- **Do** réserver le fond sombre (slate-900/blue-950) aux zones d'action prioritaire et au panneau décoratif de connexion. Le reste de l'application reste sur fond clair.
- **Do** respecter la règle `prefers-reduced-motion` — le CSS de base désactive animations et transitions quand l'utilisateur le demande.

### Don't:
- **Don't** utiliser le glassmorphism (backdrop-blur, bg semi-transparent) en dehors de la page de connexion. Les surfaces de travail restent opaques et lisibles.
- **Don't** mélanger les couleurs de statut : orange n'est pas "avertissement", c'est "soumis". Rouge n'est pas "important", c'est "rejeté".
- **Don't** utiliser d'ombre supérieure à shadow-xl. Le système est sobre et tonal, pas flottant.
- **Don't** introduire de nouvelles familles typographiques. Le stack système est un choix délibéré pour la performance et la cohérence sur tous les postes MCT.
- **Don't** réduire les rayons d'arrondi en dessous de 8px (`rounded-lg`) sur les éléments interactifs. La douceur des formes est une caractéristique identitaire.
