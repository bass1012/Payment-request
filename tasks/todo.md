# MCT IT Portal — Todo

## État : Démarrage

---

## Phase 1 — Fondations
- [ ] Setup monorepo (backend/ + frontend/)
- [ ] Prisma schema (users, departments, requests, validations, email_logs)
- [ ] Config PostgreSQL + variables d'environnement
- [ ] Auth routes (login, logout, me) — JWT + bcrypt
- [ ] Middleware auth + role
- [ ] API CRUD requests
- [ ] API validations (approve/reject)
- [ ] departments.config.js — hiérarchie MCT complète
- [ ] workflow.service.js — moteur de workflow par type de demande

## Phase 2 — Formulaires & Emails
- [ ] email.service.js (Nodemailer)
- [ ] Templates email HTML (validation + clôture)
- [ ] Routage email automatique par département demandeur
- [ ] Routes API: ENR.SI.005, ENR.SI.006, ENR.SI.008, Autre IT

## Phase 3 — PDF
- [ ] Template HTML ENR.SI.005 (fidèle au formulaire officiel)
- [ ] Template HTML ENR.SI.006
- [ ] Template HTML ENR.SI.008
- [ ] pdf.service.js (Puppeteer)
- [ ] Route GET /requests/:id/pdf

## Phase 4 — Frontend React
- [ ] Setup React + TailwindCSS + React Router
- [ ] Page Login
- [ ] Dashboard Employé
- [ ] Formulaires de création (4 types)
- [ ] Suivi de demande (timeline)
- [ ] Dashboard Valideur (file d'attente)
- [ ] Dashboard Service IT
- [ ] Dashboard Admin (gestion users)
- [ ] Bouton "Imprimer la fiche" (PDF)

## Phase 5 — Tests & Déploiement
- [ ] Tests endpoints API
- [ ] Tests génération PDF
- [ ] README + instructions déploiement
