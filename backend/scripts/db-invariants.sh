#!/bin/bash

# =============================================================================
# Invariantes — verifica que los datos sigan siendo coherentes
# =============================================================================
# Corre `scripts/sql/invariants.sql` contra la base y reporta cada afirmación
# que debería ser siempre verdad. Es de SOLO LECTURA: se apoya en db-query.sh,
# que abre la sesión con default_transaction_read_only=on.
#
# Por qué existe: los tests unitarios del backend mockean Prisma, así que nada
# de lo que vive en la base —consecutivos, restricciones, zonas horarias,
# decimales, la relación entre tablas que escriben dos módulos distintos— está
# cubierto. Este script cierra ese hueco desde el otro lado: no prueba el
# código, revisa el resultado.
#
# Usage:
#   ./scripts/db-invariants.sh                     # producción
#   ./scripts/db-invariants.sh --env=development
#   ./scripts/db-invariants.sh --all               # falla también por deuda histórica
#
# Códigos de salida (pensados para cron/CI):
#   0  todo en orden
#   1  hay violaciones nuevas (últimos 30 días)  ← lo que hay que mirar hoy
#   2  error de ejecución
#
# Por defecto solo falla por violaciones RECIENTES. La deuda histórica se
# muestra pero no rompe el build: si no, el script queda en rojo permanente y
# se deja de mirar, que es la forma más común de perder una alarma.
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$SCRIPT_DIR/sql/invariants.sql"

ENV_ARG=""
FALLAR_POR_HISTORICO=false

for arg in "$@"; do
  case $arg in
    --env=*) ENV_ARG="$arg" ;;
    --all)   FALLAR_POR_HISTORICO=true ;;
    --help|-h)
      sed -n '6,27p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Argumento desconocido: $arg  (usa --help)"
      exit 2
      ;;
  esac
done

if [[ ! -f "$SQL_FILE" ]]; then
  echo "ERROR: no existe $SQL_FILE"
  exit 2
fi

SALIDA=$("$SCRIPT_DIR/db-query.sh" ${ENV_ARG:+"$ENV_ARG"} --csv --file="$SQL_FILE" 2>/dev/null)
if [[ $? -ne 0 || -z "$SALIDA" ]]; then
  echo "ERROR: no se pudo consultar la base."
  echo "Reintenta con:  $SCRIPT_DIR/db-query.sh ${ENV_ARG:-} --file=$SQL_FILE"
  exit 2
fi

# --- Reporte -----------------------------------------------------------------

recientes=0
historicas=0

printf '\n%-8s %-56s %8s %10s\n' "ESTADO" "INVARIANTE" "TOTAL" "30 DÍAS"
printf '%s\n' "-------------------------------------------------------------------------------------"

while IFS=',' read -r gravedad invariante total ultimos; do
  [[ "$gravedad" == "gravedad" ]] && continue          # encabezado
  [[ -z "${gravedad// }" ]] && continue

  invariante="${invariante%\"}"; invariante="${invariante#\"}"
  total=${total:-0}
  ultimos=${ultimos:-0}

  if [[ "$ultimos" -gt 0 ]]; then
    estado="FALLA"
    recientes=$((recientes + 1))
  elif [[ "$total" -gt 0 ]]; then
    estado="DEUDA"
    historicas=$((historicas + 1))
  else
    estado="OK"
  fi

  printf '%-8s %-56s %8s %10s\n' "$estado" "$invariante" "$total" "$ultimos"
done <<< "$SALIDA"

echo

if [[ "$recientes" -gt 0 ]]; then
  echo "FALLA: $recientes invariante(s) con violaciones en los últimos 30 días."
fi
if [[ "$historicas" -gt 0 ]]; then
  echo "DEUDA: $historicas invariante(s) con datos viejos inconsistentes (no rompen el build)."
fi
if [[ "$recientes" -eq 0 && "$historicas" -eq 0 ]]; then
  echo "Todo en orden."
  exit 0
fi

if [[ "$recientes" -gt 0 ]]; then
  exit 1
fi
if [[ "$FALLAR_POR_HISTORICO" == true ]]; then
  exit 1
fi
exit 0
