Déploiement via GitHub Actions (SSH)
===================================

Ce fichier explique comment activer le déploiement automatique sur un serveur via SSH.

1) Secrets GitHub requis (repo Settings → Secrets):
- `SSH_HOST` — adresse IP ou nom d'hôte
- `SSH_USER` — utilisateur SSH
- `SSH_PRIVATE_KEY` — clé privée (format PEM) pour `SSH_USER`
- `SSH_PORT` — (optionnel) port SSH, par défaut `22`
- `REMOTE_DIR` — répertoire cible sur le serveur (ex: `/var/www/mct-it-portal`)

En option (pour notifications et rollback automatisé):
- `SLACK_WEBHOOK` — webhook Slack pour envoyer des notifications (format URL)
- `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` — paramètres SMTP pour envoi d'emails
- `EMAIL_TO`, `EMAIL_FROM` — destinataire et expéditeur des emails de notification

DB / migrations (optionnel mais recommandé):
- `DATABASE_URL` — URL de connexion à la base de données (format PostgreSQL) utilisée par Prisma. Exemple : `postgresql://user:pass@host:5432/dbname?schema=public`

Si `DATABASE_URL` est configuré dans les Secrets GitHub, le workflow exécutera `npm run db:migrate:production` (ou `npx prisma migrate deploy`) sur le serveur distant avant d'installer les dépendances et de redémarrer l'application.

2) Comment ça marche
- Le workflow `.github/workflows/deploy.yml` se déclenche sur `push` branch `main`.
- Il construit le backend et le frontend, puis copie `mct-it-portal/backend` et `mct-it-portal/frontend/dist` vers `REMOTE_DIR` via SCP.
- Ensuite, il exécute des commandes SSH pour installer les dépendances backend (`npm install --production`) et redémarrer l'application avec `pm2` si présent.

3) Préparer le serveur
- Assurez-vous que `SSH_USER` a les droits nécessaires sur `REMOTE_DIR`.
- Installer `node` et `pm2` sur le serveur si vous utilisez `pm2` pour la gestion des processus.
- Exemple de commandes à exécuter sur le serveur pour préparer le dossier:

```bash
# Créer le répertoire et fixer les permissions
sudo mkdir -p /var/www/mct-it-portal
sudo chown -R $(id -u):$(id -g) /var/www/mct-it-portal

# Installer pm2 (optionnel)
npm install -g pm2
```

4) Rollback automatique
- Le workflow crée une sauvegarde tar.gz de `REMOTE_DIR` avant la copie des nouveaux artefacts, stockée dans `REMOTE_DIR/backups/releases/`.
- Si le job de déploiement échoue, un job `rollback` s'exécute pour restaurer la dernière archive disponible et tenter un redémarrage via `pm2`.

5) Notifications
- Le workflow envoie une notification Slack (via `SLACK_WEBHOOK`) et des emails (via SMTP) sur succès, échec + rollback, et statut final.

6) Remarques de sécurité
- Assurez-vous que `SSH_USER` peut lire/écrire `REMOTE_DIR` et créer `backups/releases`.
- Testez le script de rollback manuellement avant d'activer le workflow en production.

4) Sécurité
- Ne commitez jamais de clés privées dans le repo.
- Utilisez les Secrets GitHub pour stocker les informations sensibles.

5) Personnalisation
- Adaptez `deploy.yml` pour copier seulement les fichiers nécessaires, exécuter des migrations Prisma (`prisma migrate deploy`), ou lancer des scripts d'initialisation.
