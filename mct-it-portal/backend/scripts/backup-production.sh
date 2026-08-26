#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL doit contenir la connexion PostgreSQL}"

BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DESTINATION="${BACKUP_ROOT}/${STAMP}"

command -v pg_dump >/dev/null
command -v tar >/dev/null
command -v shasum >/dev/null
test -d "${UPLOADS_DIR}"

if [[ "${1:-}" == "--check" ]]; then
  echo "Prérequis de sauvegarde disponibles."
  exit 0
fi

umask 077
mkdir -p "${DESTINATION}"
pg_dump --format=custom --no-owner --no-acl \
  --file="${DESTINATION}/database.dump" "${DATABASE_URL}"
tar -C "${UPLOADS_DIR}" -czf "${DESTINATION}/uploads.tar.gz" .
(
  cd "${DESTINATION}"
  shasum -a 256 database.dump uploads.tar.gz > SHA256SUMS
)

echo "Sauvegarde créée dans ${DESTINATION}"
