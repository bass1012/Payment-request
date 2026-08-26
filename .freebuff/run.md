# Run doc — MCT IT Portal (démo/preview)

Reproduit l'environnement de développement local : backend Express (port 3001)
+ frontend Vite/React (port 3000). La base est SQLite (`backend/prisma/dev.db`).

## Reproduire les artefacts

1. `cd mct-it-portal/backend` — copier le fichier d'environnement depuis le
   checkout principal s'il manque :
   `cp ../<main-checkout>/mct-it-portal/backend/.env .env`
   (contient `DATABASE_URL="file:./dev.db"`, `PORT=3001`, `JWT_SECRET`, SMTP… —
   ne jamais committer ce fichier).
2. Installer les dépendances (déjà présentes en général) :
   `npm install` dans `mct-it-portal/backend` puis `mct-it-portal/frontend`.
3. Préparer la base si elle manque ou est obsolète :
   - `cd mct-it-portal/backend && npx prisma db push` (crée le schéma SQLite)
   - `npm run db:seed` — réconcilie l'organigramme (renommages/absorptions des
     anciens codes) et crée les comptes (admin@mct.ci / Admin@MCT2026,
     test.employe@mct.ci / Test@MCT2026, comptes des chefs/directeurs MCT@2026).

## Lancer les serveurs

- Backend (API) : `cd mct-it-portal/backend && npm run dev` (nodemon, port 3001)
- Frontend (UI) : `cd mct-it-portal/frontend && npm run dev` (Vite, port 3000,
  proxy `/api` et `/uploads` vers 127.0.0.1:3001)

En mode détaché (macOS) — les pids `nohup` sont récupérés par le runner de
commandes, utiliser plutôt `launchctl` (serveurs lancés avec le chemin absolu
de node, car le PATH de launchd est minimal). Note : après un redémarrage de
Freebuff, launchd ne peut plus écrire sous `~/Documents` (TCC) — diriger les
logs vers `/tmp` (ex: `/tmp/mct-backend-preview.log`) ; le backend doit aussi
recevoir `PORT=3001` explicitement si l'environnement du shell porte `PORT=0`
(dotenv ne surcharge pas une variable déjà exportée) :

```sh
NODE=/Users/bassoued/.nvm/versions/node/v18.14.2/bin/node
launchctl remove mct-backend-preview 2>/dev/null
launchctl remove mct-frontend-preview 2>/dev/null
launchctl submit -l mct-backend-preview -- /bin/sh -c "cd '$PWD/mct-it-portal/backend' && exec $NODE src/server.js > '$PWD/.freebuff/preview-backend.log' 2>&1"
launchctl submit -l mct-frontend-preview -- /bin/sh -c "cd '$PWD/mct-it-portal/frontend' && exec $NODE node_modules/vite/bin/vite.js > '$PWD/.freebuff/preview-frontend.log' 2>&1"
```

Vérifier que les deux répondent avant d'ouvrir la preview :
`curl -s http://localhost:3001/api/health` (ou toute route) et
`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`.
Arrêt : `launchctl remove mct-backend-preview mct-frontend-preview`.
