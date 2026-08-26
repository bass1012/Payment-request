# Exploitation de production

## Journalisation

L’API écrit un événement JSON par ligne sur la sortie standard ou d’erreur. Chaque
requête reçoit un `correlationId`, repris depuis l’en-tête `x-request-id` lorsqu’il
est valide, sinon généré par l’API et renvoyé dans la réponse. Les événements métier
du workflow incluent aussi `requestId` et `requestReference`, mais jamais les
adresses des destinataires, jetons, mots de passe ou chemins de fichiers.

En production, le gestionnaire de processus doit collecter les deux sorties,
conserver le JSON sans le reformater et appliquer une durée de rétention conforme
à la politique interne.

## Stockage persistant

Le répertoire `backend/uploads` doit être monté sur un volume persistant, chiffré
et sauvegardé. La variable `UPLOADS_DIR` des scripts doit pointer vers ce même
volume. Un stockage objet privé est préférable à un disque local lorsque
l’infrastructure le permet. L’accès public direct est interdit : les fichiers
restent servis par les routes authentifiées de l’API.

PostgreSQL et les pièces jointes forment une seule unité de reprise. Une sauvegarde
de l’un sans l’autre ne constitue pas une sauvegarde exploitable du portail.

## Sauvegarde

Depuis `backend/`, avec les outils clients PostgreSQL installés :

```bash
export DATABASE_URL='postgresql://...'
export BACKUP_ROOT='/volume-sauvegardes/mct-it'
export UPLOADS_DIR='/volume-persistant/uploads'
npm run backup:check
npm run backup:production
```

Le script crée un dossier horodaté contenant `database.dump`,
`uploads.tar.gz` et leurs empreintes `SHA256SUMS`. Transférer ce dossier vers un
emplacement distinct, chiffré et à accès restreint. Ne jamais versionner ces
archives.

Politique minimale recommandée : sauvegarde quotidienne, rétention glissante de
30 jours, copie hors site et test de restauration mensuel.

## Vérification et restauration

La vérification ne modifie rien :

```bash
npm run restore:verify -- /volume-sauvegardes/mct-it/20260719T020000Z --verify-only
```

Elle contrôle les empreintes, la structure de l’archive PostgreSQL et la lisibilité
de l’archive des uploads.

Une restauration réelle doit d’abord être répétée dans un environnement isolé.
Après validation du propriétaire de service et arrêt des écritures :

```bash
export DATABASE_URL='postgresql://.../base_cible'
export UPLOADS_DIR='/volume-persistant/uploads'
export CONFIRM_PRODUCTION_RESTORE='RESTORE_MCT_DATA'
./scripts/restore-production.sh /chemin/vers/la/sauvegarde
```

Le script remplace le contenu de la base cible et restaure les fichiers. Après
l’opération, vérifier `GET /health`, ouvrir plusieurs dossiers avec pièces jointes,
contrôler les dernières validations et réactiver le trafic seulement après accord.

## Test périodique de reprise

Chaque test mensuel doit consigner :

1. l’identifiant de la sauvegarde testée ;
2. le résultat de `restore:verify` ;
3. la restauration dans une base et un volume temporaires ;
4. le résultat de la route de santé et d’un échantillon de dossiers ;
5. le temps de reprise observé et les anomalies corrigées.

Les scripts évitent toute restauration accidentelle grâce à une confirmation
explicite, mais l’opérateur reste responsable de vérifier la base cible.

## Migration SQLite → PostgreSQL

Le schéma de développement utilise SQLite (`prisma/schema.prisma`), le schéma de
production est PostgreSQL (`prisma/postgresql/schema.prisma`). Les deux sont
maintenus synchronisés manuellement — tout ajout de modèle ou de champ dans l'un
doit être reproduit dans l'autre.

### Procédure de migration

1. **Exporter les données SQLite** :
   ```bash
   cd backend
   sqlite3 prisma/dev.db ".mode csv" ".headers on" ".dump users" > /tmp/users.csv
   # Répéter pour chaque table : Request, Validation, Attachment, etc.
   ```

2. **Pousser le schéma PostgreSQL** :
   ```bash
   export DATABASE_URL='postgresql://user:pass@host:5432/mct_it'
   npx prisma migrate dev --schema=prisma/postgresql/schema.prisma --name init
   ```

3. **Importer les données** (via `psql` ou un script d'import CSV) :
   ```bash
   psql "$DATABASE_URL" -c "\copy users FROM '/tmp/users.csv' CSV HEADER"
   # Répéter pour chaque table, dans l'ordre des dépendances :
   # Department → User → Request → Validation/Attachment/EmailLog → etc.
   ```

4. **Vérifier** :
   - `GET /health` → `{ status: 'ok' }`
   - Compteur de dossiers cohérent avec SQLite
   - Aucune erreur de clé étrangère dans les logs

5. **Basculer l'environnement** : modifier `DATABASE_URL` dans `.env` pour
   pointer vers PostgreSQL, redémarrer l'API.

### Contraintes d'unicité

Le schéma PostgreSQL inclut `@@unique([requestId, step, revision])` sur le modèle
`Validation` pour empêcher les doubles validations. Cette contrainte est absente
en SQLite (qui ne supporte pas les uniques composites sur migration existante) —
le code applicatif applique cette règle via `decisionKey`.

## Politique de rétention des uploads

### Stockage

Les fichiers uploadés vivent dans `backend/uploads/` avec deux sous-dossiers :
- `uploads/requests/` — PDF principaux (fiches signées)
- `uploads/attachments/` — Pièces justificatives (devis, proformas, justificatifs)

Chaque fichier est nommé avec un UUID + horodatage pour éviter les collisions.
Les chemins sont stockés en relatif par rapport à `backend/` dans la base de données.

### Validation côté serveur

Depuis la Phase 43, les uploads utilisent **multer** avec :
- **Taille max** : 10 Mo par fichier
- **Types MIME autorisés** : PDF, JPEG, PNG, GIF, WebP, DOC, DOCX, XLS, XLSX
- **Maximum** : 20 pièces jointes + 1 PDF par requête
- **Noms** : caractères spéciaux remplacés par `_`, UUID préfixé

### Rétention

| Type | Rétention recommandée | Action |
|------|----------------------|--------|
| PDF signés | durée de vie de la demande | conserve tant que la demande existe |
| Pièces justificatives | durée de vie de la demande | supprimées avec la demande (`onDelete: Cascade`) |
| Orphelins (dossier supprimé) | nettoyage mensuel | script de garbage collection |
| Brouillons abandonnés | 30 jours sans activité | suppression automatique via SLA |

### Nettoyage des orphelins

Les fichiers orphelins (sur disque mais plus référencés en base) peuvent être
nettoyés périodiquement :

```bash
cd backend
# Lister les fichiers orphelins (dry run)
node -e "
  const fs = require('fs'), path = require('path');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  (async () => {
    const requests = await prisma.request.findMany({ select: { uploadedPdfPath: true } });
    const attachments = await prisma.attachment.findMany({ select: { path: true } });
    const dbPaths = new Set([...requests.map(r => r.uploadedPdfPath), ...attachments.map(a => a.path)].filter(Boolean));
    const diskFiles = [...fs.readdirSync('uploads/requests'), ...fs.readdirSync('uploads/attachments')];
    const orphans = diskFiles.filter(f => !Array.from(dbPaths).some(p => p.includes(f)));
    console.log('Orphelins:', orphans.length);
    orphans.forEach(f => console.log(' ', f));
    await prisma.\$disconnect();
  })();
"
```

### Sauvegarde

Les uploads doivent être inclus dans la sauvegarde PostgreSQL (voir section
"Sauvegarde" ci-dessus). Un backup de la base sans les fichiers ne constitue
pas une sauvegarde exploitable.
