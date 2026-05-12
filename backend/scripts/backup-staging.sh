#!/bin/bash

# =============================================================================
# Backup Script - Staging Database (Railway)
# =============================================================================
# Usage:
#   ./scripts/backup-staging.sh              # Backup completo (schema + data)
#   ./scripts/backup-staging.sh --schema     # Solo schema
#   ./scripts/backup-staging.sh --data       # Solo data
#   ./scripts/backup-staging.sh --compress   # Backup comprimido (.gz)
# =============================================================================

set -euo pipefail

# --- Config ------------------------------------------------------------------

STAGING_DB_URL="postgresql://postgres:gvKVvzcBIAbmRdGYfyvxZsvgjKKrRtjU@mainline.proxy.rlwy.net:55766/railway"
BACKUP_DIR="$(dirname "$0")/../backups/staging"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_MODE="full"   # full | schema | data
COMPRESS=false

# --- Parse args --------------------------------------------------------------

for arg in "$@"; do
  case $arg in
    --schema)   BACKUP_MODE="schema" ;;
    --data)     BACKUP_MODE="data"   ;;
    --compress) COMPRESS=true        ;;
    --help|-h)
      sed -n '3,8p' "$0" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo "Argumento desconocido: $arg  (usa --help para ver opciones)"
      exit 1
      ;;
  esac
done

# --- Validate pg_dump --------------------------------------------------------

if ! command -v pg_dump &>/dev/null; then
  echo "ERROR: pg_dump no encontrado."
  echo "  macOS:  brew install libpq && brew link --force libpq"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

# --- Prepare output dir ------------------------------------------------------

mkdir -p "$BACKUP_DIR"

FILE_NAME="backup_staging_${BACKUP_MODE}_${TIMESTAMP}.sql"
FILE_PATH="$BACKUP_DIR/$FILE_NAME"

# --- Build pg_dump flags -----------------------------------------------------

PG_FLAGS=(
  --no-password
  --verbose
  --clean               # DROP antes de CREATE (facilita restore)
  --if-exists
  --no-owner            # No incluir sentencias OWNER TO
  --no-acl              # No incluir sentencias GRANT/REVOKE
)

case $BACKUP_MODE in
  schema) PG_FLAGS+=(--schema-only) ;;
  data)   PG_FLAGS+=(--data-only)   ;;
esac

# --- Run backup --------------------------------------------------------------

echo "=============================================="
echo "  Backup de Staging — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Modo   : $BACKUP_MODE"
echo "  Destino: $FILE_PATH"
echo "=============================================="

pg_dump "${PG_FLAGS[@]}" "$STAGING_DB_URL" > "$FILE_PATH"

# --- Compress if requested ---------------------------------------------------

if $COMPRESS; then
  echo "Comprimiendo backup..."
  gzip "$FILE_PATH"
  FILE_PATH="${FILE_PATH}.gz"
  FILE_NAME="${FILE_NAME}.gz"
fi

# --- Report ------------------------------------------------------------------

FILE_SIZE=$(du -sh "$FILE_PATH" | cut -f1)
echo ""
echo "Backup completado exitosamente."
echo "  Archivo : $FILE_NAME"
echo "  Tamaño  : $FILE_SIZE"
echo "  Ruta    : $FILE_PATH"
echo ""
echo "Para restaurar:"
if $COMPRESS; then
  echo "  gunzip -c $FILE_PATH | psql <TARGET_DB_URL>"
else
  echo "  psql <TARGET_DB_URL> < $FILE_PATH"
fi
