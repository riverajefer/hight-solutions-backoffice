#!/bin/bash

# =============================================================================
# Backup Script - Base de datos (Railway)
# =============================================================================
# Lee DATABASE_URL desde backend/.env.<ambiente>, así que no hay credenciales
# escritas en este archivo.
#
# Usage:
#   ./scripts/backup-db.sh                          # staging, completo
#   ./scripts/backup-db.sh --env=production         # producción, completo
#   ./scripts/backup-db.sh --env=production --compress
#   ./scripts/backup-db.sh --schema                 # solo schema
#   ./scripts/backup-db.sh --data                   # solo data
# =============================================================================

set -euo pipefail

# --- Config ------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ENVIRONMENT="staging"
BACKUP_MODE="full"   # full | schema | data
COMPRESS=false

# --- Parse args --------------------------------------------------------------

for arg in "$@"; do
  case $arg in
    --env=*)    ENVIRONMENT="${arg#*=}" ;;
    --schema)   BACKUP_MODE="schema"    ;;
    --data)     BACKUP_MODE="data"      ;;
    --compress) COMPRESS=true           ;;
    --help|-h)
      sed -n '6,15p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Argumento desconocido: $arg  (usa --help para ver opciones)"
      exit 1
      ;;
  esac
done

# --- Resolve DATABASE_URL ----------------------------------------------------
# Prioridad: variable de entorno DATABASE_URL > backend/.env.<ambiente>.
# La variable de entorno permite respaldar producción sin dejar la contraseña
# escrita en disco:
#   DATABASE_URL='postgresql://...' ./scripts/backup-db.sh --env=production

if [[ -n "${DATABASE_URL:-}" ]]; then
  DB_URL="$DATABASE_URL"
  echo "Usando DATABASE_URL del entorno (no se lee .env.$ENVIRONMENT)."
else
  ENV_FILE="$BACKEND_DIR/.env.$ENVIRONMENT"

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: no existe $ENV_FILE"
    exit 1
  fi

  DB_URL=$(grep -E '^DATABASE_URL[[:space:]]*=' "$ENV_FILE" | head -1 | sed -E 's/^DATABASE_URL[[:space:]]*=[[:space:]]*"?([^"]*)"?[[:space:]]*$/\1/')

  if [[ -z "$DB_URL" ]]; then
    echo "ERROR: $ENV_FILE no define DATABASE_URL"
    exit 1
  fi
fi

# Detecta placeholders (p.ej. "postgresql://postgres:[password]@host:port/db")
if [[ "$DB_URL" == *"[password]"* || "$DB_URL" == *"@host:port"* || "$DB_URL" == *"<"* ]]; then
  echo "ERROR: DATABASE_URL en $ENV_FILE tiene valores de plantilla, no credenciales reales."
  echo "  Cópiala del dashboard de Railway (servicio Postgres → Variables → DATABASE_PUBLIC_URL)"
  echo "  o con:  railway login && railway link && railway variables"
  exit 1
fi

# --- Validate pg_dump --------------------------------------------------------

if ! command -v pg_dump &>/dev/null; then
  echo "ERROR: pg_dump no encontrado."
  echo "  macOS:  brew install libpq && brew link --force libpq"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

# --- Prepare output dir ------------------------------------------------------

BACKUP_DIR="$BACKEND_DIR/backups/$ENVIRONMENT"
mkdir -p "$BACKUP_DIR"

FILE_NAME="backup_${ENVIRONMENT}_${BACKUP_MODE}_${TIMESTAMP}.sql"
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

SAFE_HOST=$(echo "$DB_URL" | sed -E 's#^(.*://[^:]+):[^@]+@#\1:***@#')

echo "=============================================="
echo "  Backup — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Ambiente: $ENVIRONMENT"
echo "  Origen  : $SAFE_HOST"
echo "  Modo    : $BACKUP_MODE"
echo "  Destino : $FILE_PATH"
echo "=============================================="

pg_dump "${PG_FLAGS[@]}" "$DB_URL" > "$FILE_PATH"

# Un dump vacío es un backup inútil: falla ruidosamente en vez de dar falsa seguridad.
if [[ ! -s "$FILE_PATH" ]]; then
  echo ""
  echo "ERROR: el backup quedó vacío. Se elimina el archivo."
  rm -f "$FILE_PATH"
  exit 1
fi

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
