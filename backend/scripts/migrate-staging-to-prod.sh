#!/usr/bin/env bash
# =============================================================================
# migrate-staging-to-prod.sh
# Copia todos los datos de la BD de Staging a la BD de Producción.
# El esquema (migraciones) NO se toca — solo se reemplazan los datos.
#
# Uso:
#   STAGING_DB_URL="postgresql://..." PROD_DB_URL="postgresql://..." ./scripts/migrate-staging-to-prod.sh
#
# O edita las variables directamente aquí (NO commitear con credenciales).
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# 1. Configuración — pasa las URLs como env vars o edítalas aquí
# ---------------------------------------------------------------------------
STAGING_DB_URL="${STAGING_DB_URL:-}"
PROD_DB_URL="${PROD_DB_URL:-}"

DUMP_FILE="/tmp/staging_data_dump_$(date +%Y%m%d_%H%M%S).sql"

# ---------------------------------------------------------------------------
# 2. Colores para la consola
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# 3. Validaciones previas
# ---------------------------------------------------------------------------
if [[ -z "$STAGING_DB_URL" ]]; then
  error "STAGING_DB_URL no está definida."
  echo "  Ejemplo: STAGING_DB_URL='postgresql://user:pass@host:port/db' ./scripts/migrate-staging-to-prod.sh"
  exit 1
fi

if [[ -z "$PROD_DB_URL" ]]; then
  error "PROD_DB_URL no está definida."
  echo "  Ejemplo: PROD_DB_URL='postgresql://user:pass@host:port/db' ./scripts/migrate-staging-to-prod.sh"
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  error "pg_dump no encontrado. Instala postgresql-client."
  exit 1
fi

if ! command -v psql &>/dev/null; then
  error "psql no encontrado. Instala postgresql-client."
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Advertencia y confirmación
# ---------------------------------------------------------------------------
echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         ⚠️  ADVERTENCIA — ACCIÓN DESTRUCTIVA ⚠️               ║${NC}"
echo -e "${RED}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${RED}║  Todos los datos de PRODUCCIÓN serán ELIMINADOS y           ║${NC}"
echo -e "${RED}║  reemplazados con los datos de STAGING.                     ║${NC}"
echo -e "${RED}║                                                              ║${NC}"
echo -e "${RED}║  Esta acción es IRREVERSIBLE si no tienes un backup previo. ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
warn "Staging:    $STAGING_DB_URL"
warn "Producción: $PROD_DB_URL"
echo ""
read -rp "Escribe exactamente 'yes, migrate' para continuar: " CONFIRM

if [[ "$CONFIRM" != "yes, migrate" ]]; then
  info "Operación cancelada."
  exit 0
fi

echo ""

# ---------------------------------------------------------------------------
# 5. Obtener lista de tablas desde staging (excluyendo _prisma_migrations)
# ---------------------------------------------------------------------------
info "Obteniendo lista de tablas desde staging..."

TABLES=$(psql "$STAGING_DB_URL" -t -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations' ORDER BY tablename;" \
  | tr -d ' ' | grep -v '^$')

TABLE_COUNT=$(echo "$TABLES" | wc -l | tr -d ' ')
info "Se encontraron $TABLE_COUNT tablas para migrar."

# ---------------------------------------------------------------------------
# 6. Dump de datos desde staging (solo INSERT, sin schema)
# ---------------------------------------------------------------------------
info "Generando dump de datos desde staging → $DUMP_FILE"

# Construir lista de exclusiones para pg_dump
EXCLUDE_ARGS="--exclude-table=_prisma_migrations"

pg_dump \
  "$STAGING_DB_URL" \
  --data-only \
  --no-acl \
  --no-owner \
  --disable-triggers \
  $EXCLUDE_ARGS \
  --file="$DUMP_FILE"

DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
success "Dump completado. Tamaño: $DUMP_SIZE"

# ---------------------------------------------------------------------------
# 7. Limpiar TODAS las tablas en producción (CASCADE respeta FK)
# ---------------------------------------------------------------------------
info "Limpiando datos de producción con TRUNCATE CASCADE..."

# Construir la lista de tablas entre comillas para el TRUNCATE
TRUNCATE_LIST=$(echo "$TABLES" | awk '{printf "\"%s\", ", $0}' | sed 's/, $//')

psql "$PROD_DB_URL" -c "TRUNCATE TABLE $TRUNCATE_LIST RESTART IDENTITY CASCADE;" 2>&1 \
  || { error "Falló el TRUNCATE en producción. Abortando antes de restaurar."; rm -f "$DUMP_FILE"; exit 1; }

success "Tablas de producción limpiadas."

# ---------------------------------------------------------------------------
# 8. Restaurar datos en producción
# ---------------------------------------------------------------------------
info "Restaurando datos en producción..."

psql "$PROD_DB_URL" \
  --set ON_ERROR_STOP=on \
  --single-transaction \
  --file="$DUMP_FILE" 2>&1

success "Datos restaurados correctamente en producción."

# ---------------------------------------------------------------------------
# 9. Limpieza del archivo temporal
# ---------------------------------------------------------------------------
rm -f "$DUMP_FILE"
info "Archivo temporal eliminado."

# ---------------------------------------------------------------------------
# 10. Verificación rápida de conteos
# ---------------------------------------------------------------------------
echo ""
info "Verificación de conteos (staging vs producción):"
printf "%-40s %12s %12s\n" "Tabla" "Staging" "Producción"
printf "%-40s %12s %12s\n" "-----" "-------" "----------"

while IFS= read -r TABLE; do
  [[ -z "$TABLE" ]] && continue
  COUNT_S=$(psql "$STAGING_DB_URL" -t -c "SELECT COUNT(*) FROM \"$TABLE\";" 2>/dev/null | tr -d ' ')
  COUNT_P=$(psql "$PROD_DB_URL"    -t -c "SELECT COUNT(*) FROM \"$TABLE\";" 2>/dev/null | tr -d ' ')
  if [[ "$COUNT_S" == "$COUNT_P" ]]; then
    printf "%-40s %12s %12s ✓\n" "$TABLE" "$COUNT_S" "$COUNT_P"
  else
    printf "${RED}%-40s %12s %12s ✗ DIFERENTE${NC}\n" "$TABLE" "$COUNT_S" "$COUNT_P"
  fi
done <<< "$TABLES"

echo ""
success "=== Migración de base de datos completada ==="

# ---------------------------------------------------------------------------
# 11. Instrucciones para migrar el bucket de archivos
# ---------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║             📁 SIGUIENTE PASO: BUCKET DE ARCHIVOS           ║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  Los archivos subidos (imágenes, PDFs, etc.) viven en el    ║${NC}"
echo -e "${YELLOW}║  bucket S3 de Railway (roomy-toolchest). Staging tiene      ║${NC}"
echo -e "${YELLOW}║  141.2 MB y Producción está vacío.                          ║${NC}"
echo -e "${YELLOW}║                                                              ║${NC}"
echo -e "${YELLOW}║  Si los buckets son INSTANCIAS SEPARADAS en Railway,        ║${NC}"
echo -e "${YELLOW}║  los archivos no serán accesibles desde producción hasta    ║${NC}"
echo -e "${YELLOW}║  que los copies. Usa este comando (requiere rclone o awscli):║${NC}"
echo -e "${YELLOW}║                                                              ║${NC}"
echo -e "${YELLOW}║  Con AWS CLI:                                                ║${NC}"
echo -e "${YELLOW}║    aws s3 sync s3://<BUCKET_STAGING>/ s3://<BUCKET_PROD>/  ║${NC}"
echo -e "${YELLOW}║    --source-region auto                                      ║${NC}"
echo -e "${YELLOW}║    --endpoint-url <ENDPOINT_STAGING>                         ║${NC}"
echo -e "${YELLOW}║                                                              ║${NC}"
echo -e "${YELLOW}║  Credenciales necesarias (Railway Dashboard → Variables):   ║${NC}"
echo -e "${YELLOW}║    AWS_ENDPOINT_URL, AWS_ACCESS_KEY_ID,                     ║${NC}"
echo -e "${YELLOW}║    AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME                ║${NC}"
echo -e "${YELLOW}║    (una de cada ambiente)                                    ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""