#!/bin/bash

# =============================================================================
# Restore Script - Restaurar backup a una base de datos PostgreSQL
# =============================================================================
# Usage:
#   ./backend/scripts/restore-backup.sh                          # Interactivo
#   ./backend/scripts/restore-backup.sh --file <archivo.sql>     # Archivo directo
#   ./backend/scripts/restore-backup.sh --file <archivo.sql.gz>  # Comprimido
#   ./backend/scripts/restore-backup.sh --target staging         # DB destino
#   ./backend/scripts/restore-backup.sh --target production      # ¡Con confirmación!
#   ./backend/scripts/restore-backup.sh --target <URL_CUSTOM>    # URL directa
# =============================================================================

set -euo pipefail

# --- Colores -----------------------------------------------------------------

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# --- Targets conocidos -------------------------------------------------------

TARGET_STAGING="postgresql://postgres:gvKVvzcBIAbmRdGYfyvxZsvgjKKrRtjU@mainline.proxy.rlwy.net:55766/railway"
TARGET_PRODUCTION=""  # Completar si se necesita

BACKUP_DIR="$(dirname "$0")/../../backups/staging"

# --- Parse args --------------------------------------------------------------

BACKUP_FILE=""
TARGET_DB=""
TARGET_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --file|-f)
      BACKUP_FILE="$2"
      shift 2
      ;;
    --target|-t)
      case $2 in
        staging)
          TARGET_DB="$TARGET_STAGING"
          TARGET_NAME="staging"
          ;;
        production|prod)
          TARGET_DB="$TARGET_PRODUCTION"
          TARGET_NAME="production"
          ;;
        postgresql://*|postgres://*)
          TARGET_DB="$2"
          TARGET_NAME="custom"
          ;;
        *)
          echo -e "${RED}Target desconocido: $2${NC}"
          echo "  Opciones: staging | production | <postgresql://...>"
          exit 1
          ;;
      esac
      shift 2
      ;;
    --help|-h)
      sed -n '3,9p' "$0" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Argumento desconocido: $1${NC}  (usa --help)"
      exit 1
      ;;
  esac
done

# --- Validate psql -----------------------------------------------------------

if ! command -v psql &>/dev/null; then
  echo -e "${RED}ERROR: psql no encontrado.${NC}"
  echo "  macOS:  brew install libpq && brew link --force libpq"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

# --- Selección interactiva de archivo ----------------------------------------

if [[ -z "$BACKUP_FILE" ]]; then
  echo -e "${CYAN}${BOLD}Backups disponibles en $BACKUP_DIR:${NC}"
  echo ""

  # Lista archivos .sql y .sql.gz ordenados por fecha (más reciente primero)
  mapfile -t FILES < <(find "$BACKUP_DIR" -maxdepth 1 \( -name "*.sql" -o -name "*.sql.gz" \) | sort -r)

  if [[ ${#FILES[@]} -eq 0 ]]; then
    echo -e "${YELLOW}No se encontraron backups en $BACKUP_DIR${NC}"
    echo "Genera uno primero con: ./scripts/backup-staging.sh"
    exit 1
  fi

  for i in "${!FILES[@]}"; do
    FILE="${FILES[$i]}"
    SIZE=$(du -sh "$FILE" | cut -f1)
    MDATE=$(date -r "$FILE" '+%Y-%m-%d %H:%M:%S')
    printf "  [%d] %-50s  %6s  %s\n" "$((i+1))" "$(basename "$FILE")" "$SIZE" "$MDATE"
  done

  echo ""
  read -rp "Selecciona un backup [1-${#FILES[@]}]: " SELECTION

  if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || (( SELECTION < 1 || SELECTION > ${#FILES[@]} )); then
    echo -e "${RED}Selección inválida.${NC}"
    exit 1
  fi

  BACKUP_FILE="${FILES[$((SELECTION-1))]}"
fi

# --- Validar archivo ---------------------------------------------------------

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo -e "${RED}ERROR: Archivo no encontrado: $BACKUP_FILE${NC}"
  exit 1
fi

# --- Selección interactiva de target -----------------------------------------

if [[ -z "$TARGET_DB" ]]; then
  echo ""
  echo -e "${CYAN}${BOLD}¿A qué base de datos restaurar?${NC}"
  echo "  [1] Staging   (Railway)"
  echo "  [2] URL custom"
  echo ""
  read -rp "Selecciona destino [1-2]: " DB_CHOICE

  case $DB_CHOICE in
    1)
      TARGET_DB="$TARGET_STAGING"
      TARGET_NAME="staging"
      ;;
    2)
      read -rp "Ingresa la URL de PostgreSQL: " TARGET_DB
      TARGET_NAME="custom"
      ;;
    *)
      echo -e "${RED}Opción inválida.${NC}"
      exit 1
      ;;
  esac
fi

if [[ -z "$TARGET_DB" ]]; then
  echo -e "${RED}ERROR: No se configuró la URL del target '$TARGET_NAME'.${NC}"
  echo "  Edita este script y completa TARGET_PRODUCTION."
  exit 1
fi

# --- Confirmación de seguridad -----------------------------------------------

FILE_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)

echo ""
echo -e "${BOLD}=============================================="
echo -e "  Resumen de restauración"
echo -e "==============================================${NC}"
echo -e "  Archivo  : $(basename "$BACKUP_FILE")  ($FILE_SIZE)"
echo -e "  Destino  : ${BOLD}$TARGET_NAME${NC}"

if [[ "$TARGET_NAME" == "production" ]]; then
  echo ""
  echo -e "${RED}${BOLD}  ⚠  ATENCIÓN: Estás restaurando en PRODUCCIÓN  ⚠${NC}"
  echo -e "${RED}  Esta operación sobreescribirá todos los datos actuales.${NC}"
fi

echo ""
echo -e "${YELLOW}Esta operación SOBREESCRIBIRÁ los datos existentes.${NC}"
read -rp "¿Confirmas la restauración? Escribe 'si' para continuar: " CONFIRM

if [[ "$CONFIRM" != "si" ]]; then
  echo "Operación cancelada."
  exit 0
fi

# --- Restaurar ---------------------------------------------------------------

echo ""
echo -e "${CYAN}Iniciando restauración — $(date '+%Y-%m-%d %H:%M:%S')${NC}"

if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Descomprimiendo y restaurando..."
  gunzip -c "$BACKUP_FILE" | psql --no-password "$TARGET_DB"
else
  psql --no-password "$TARGET_DB" < "$BACKUP_FILE"
fi

# --- Resultado ---------------------------------------------------------------

echo ""
echo -e "${GREEN}${BOLD}Restauración completada exitosamente.${NC}"
echo -e "  Archivo  : $(basename "$BACKUP_FILE")"
echo -e "  Destino  : $TARGET_NAME"
echo -e "  Hora     : $(date '+%Y-%m-%d %H:%M:%S')"
