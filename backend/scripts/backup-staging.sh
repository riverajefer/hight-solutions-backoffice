#!/bin/bash

# =============================================================================
# Alias de compatibilidad → backup-db.sh --env=staging
# =============================================================================
# Este script tenía la URL de staging escrita a mano y quedó con la contraseña
# reemplazada por un placeholder, así que dejó de funcionar. La lógica vive
# ahora en backup-db.sh, que lee DATABASE_URL desde backend/.env.<ambiente>.
# =============================================================================

set -euo pipefail

exec "$(dirname "$0")/backup-db.sh" --env=staging "$@"
