#!/bin/bash

# =============================================================================
# Query Script - Consultas de SOLO LECTURA (Railway / Supabase)
# =============================================================================
# Lee DATABASE_URL desde backend/.env.<ambiente>, así que no hay credenciales
# escritas en este archivo.
#
# La sesión se abre con default_transaction_read_only=on: cualquier INSERT,
# UPDATE, DELETE, TRUNCATE o DDL falla en el motor, no por disciplina de quien
# escribe la consulta. Eso es lo que hace seguro apuntarlo a producción.
#
# Usage:
#   ./scripts/db-query.sh "SELECT count(*) FROM orders;"                  # producción
#   ./scripts/db-query.sh --env=development "SELECT count(*) FROM users;"
#   ./scripts/db-query.sh --csv "SELECT * FROM orders LIMIT 10;"
#   ./scripts/db-query.sh --file=consulta.sql
# =============================================================================

set -euo pipefail

# --- Config ------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
# Producción por defecto: es el ambiente con los datos reales del cliente y el
# único motivo para tener este script. Los demás se piden con --env.
ENVIRONMENT="production"
FORMAT="table"       # table | csv
SQL=""
SQL_FILE=""
# Una consulta de diagnóstico que tarda más de 60s casi siempre es un error de
# filtro. El límite evita dejar una query pesada corriendo contra producción.
TIMEOUT_MS=60000

# --- Parse args --------------------------------------------------------------

for arg in "$@"; do
  case $arg in
    --env=*)     ENVIRONMENT="${arg#*=}" ;;
    --file=*)    SQL_FILE="${arg#*=}"    ;;
    --timeout=*) TIMEOUT_MS="${arg#*=}"  ;;
    --csv)       FORMAT="csv"            ;;
    --help|-h)
      sed -n '6,18p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*)
      echo "Argumento desconocido: $arg  (usa --help para ver opciones)"
      exit 1
      ;;
    *)
      if [[ -n "$SQL" ]]; then
        echo "ERROR: pasa una sola consulta (entrecomíllala) o usa --file="
        exit 1
      fi
      SQL="$arg"
      ;;
  esac
done

if [[ -z "$SQL" && -z "$SQL_FILE" ]]; then
  echo "ERROR: falta la consulta.  Ejemplo:"
  echo "  ./scripts/db-query.sh \"SELECT count(*) FROM orders;\""
  exit 1
fi

if [[ -n "$SQL_FILE" && ! -f "$SQL_FILE" ]]; then
  echo "ERROR: no existe el archivo $SQL_FILE"
  exit 1
fi

# --- Resolve DATABASE_URL ----------------------------------------------------
# Misma prioridad y mismo parseo que backup-db.sh: variable de entorno
# DATABASE_URL > backend/.env.<ambiente>, quitando comillas y espacios sobrantes
# (.env.production usa comillas simples y deja un espacio al final).

if [[ -n "${DATABASE_URL:-}" ]]; then
  DB_URL="$DATABASE_URL"
  echo "Usando DATABASE_URL del entorno (no se lee .env.$ENVIRONMENT)." >&2
else
  ENV_FILE="$BACKEND_DIR/.env.$ENVIRONMENT"

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: no existe $ENV_FILE"
    exit 1
  fi

  DB_URL=$(grep -E '^DATABASE_URL[[:space:]]*=' "$ENV_FILE" | head -1 \
    | sed -E "s/^DATABASE_URL[[:space:]]*=[[:space:]]*//; s/^['\"]//; s/['\"][[:space:]]*\$//; s/[[:space:]]*\$//")

  if [[ -z "$DB_URL" ]]; then
    echo "ERROR: $ENV_FILE no define DATABASE_URL"
    exit 1
  fi
fi

if [[ "$DB_URL" == *"[password]"* || "$DB_URL" == *"@host:port"* || "$DB_URL" == *"<"* ]]; then
  echo "ERROR: DATABASE_URL en .env.$ENVIRONMENT tiene valores de plantilla, no credenciales reales."
  exit 1
fi

# --- Validate psql -----------------------------------------------------------

if ! command -v psql &>/dev/null; then
  echo "ERROR: psql no encontrado."
  echo "  macOS:  brew install libpq && brew link --force libpq"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

# --- Run ---------------------------------------------------------------------
# El candado real: la sesión entera es de solo lectura a nivel de motor. Un
# UPDATE aquí devuelve "cannot execute UPDATE in a read-only transaction".

export PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=${TIMEOUT_MS}"

PSQL_ARGS=(-P pager=off -v ON_ERROR_STOP=1)
[[ "$FORMAT" == "csv" ]] && PSQL_ARGS+=(--csv)

echo "→ Consultando [$ENVIRONMENT] en modo SOLO LECTURA" >&2

if [[ -n "$SQL_FILE" ]]; then
  exec psql "$DB_URL" "${PSQL_ARGS[@]}" -f "$SQL_FILE"
else
  exec psql "$DB_URL" "${PSQL_ARGS[@]}" -c "$SQL"
fi
