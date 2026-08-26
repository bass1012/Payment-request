#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:?Usage: restore-production.sh <dossier-sauvegarde> [--verify-only]}"
MODE="${2:-}"
UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"

command -v pg_restore >/dev/null
command -v tar >/dev/null
command -v shasum >/dev/null
test -f "${BACKUP_DIR}/database.dump"
test -f "${BACKUP_DIR}/uploads.tar.gz"
test -f "${BACKUP_DIR}/SHA256SUMS"

(
  cd "${BACKUP_DIR}"
  shasum -a 256 -c SHA256SUMS
)
pg_restore --list "${BACKUP_DIR}/database.dump" >/dev/null
tar -tzf "${BACKUP_DIR}/uploads.tar.gz" >/dev/null

if [[ "${MODE}" == "--verify-only" ]]; then
  echo "Sauvegarde intègre et lisible."
  exit 0
fi

: "${DATABASE_URL:?DATABASE_URL doit cibler la base PostgreSQL à restaurer}"
if [[ "${CONFIRM_PRODUCTION_RESTORE:-}" != "RESTORE_MCT_DATA" ]]; then
  echo "Restauration refusée. Définir CONFIRM_PRODUCTION_RESTORE=RESTORE_MCT_DATA." >&2
  exit 2
fi

mkdir -p "${UPLOADS_DIR}"
pg_restore --clean --if-exists --no-owner --no-acl \
  --dbname="${DATABASE_URL}" "${BACKUP_DIR}/database.dump"
tar -C "${UPLOADS_DIR}" -xzf "${BACKUP_DIR}/uploads.tar.gz"

echo "Base et pièces jointes restaurées."
