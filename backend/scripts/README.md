# Scripts de Base de Datos

Scripts para backup y restauración de las bases de datos en Railway (staging y producción).

Las credenciales **no** viven en los scripts: `backup-db.sh` lee `DATABASE_URL`
desde `backend/.env.<ambiente>`. Para respaldar producción hay que completar
antes `backend/.env.production` (Railway → servicio Postgres → Variables →
`DATABASE_PUBLIC_URL`, o `railway login && railway link && railway variables`).

---

## Requisito previo

Necesitas tener `pg_dump` y `psql` instalados:

```bash
# macOS
brew install libpq && brew link --force libpq

# Ubuntu / Debian
sudo apt-get install postgresql-client
```

---

## Crear un backup

**Script:** `backup-db.sh`

Los backups se guardan en `backups/<ambiente>/` con timestamp en el nombre.
El ambiente por defecto es `staging`.

```bash
# Desde la raíz del proyecto:

# Backup completo (schema + data) de staging
./backend/scripts/backup-db.sh

# Backup completo de producción
./backend/scripts/backup-db.sh --env=production

# Solo el schema (estructura de tablas)
./backend/scripts/backup-db.sh --schema

# Solo la data (sin estructura)
./backend/scripts/backup-db.sh --data

# Backup comprimido (.gz)
./backend/scripts/backup-db.sh --compress

# Combinado: producción, comprimido
./backend/scripts/backup-db.sh --env=production --compress
```

`backup-staging.sh` sigue existiendo como alias de `backup-db.sh --env=staging`.

**Ejemplo de archivo generado:**
```
backups/staging/backup_staging_full_20260511_143022.sql
backups/production/backup_production_full_20260511_143022.sql.gz
```

El script aborta si el dump sale vacío, para no dejar un backup inservible que
dé falsa seguridad.

> La carpeta `backups/` está en `.gitignore` — los dumps nunca se commitean.

---

## Restaurar un backup

**Script:** `restore-backup.sh`

> ⚠️ La restauración **sobreescribe** los datos existentes. El script siempre pide confirmación antes de ejecutar.

### Modo interactivo (recomendado)

Muestra la lista de backups disponibles y pregunta el destino:

```bash
./backend/scripts/restore-backup.sh
```

Ejemplo de selección:

```
Backups disponibles en backups/staging:

  [1] backup_staging_full_20260511_150000.sql.gz    1.2M  2026-05-11 15:00:00
  [2] backup_staging_full_20260511_143022.sql        4.8M  2026-05-11 14:30:22
  [3] backup_staging_schema_20260510_090000.sql      120K  2026-05-10 09:00:00

Selecciona un backup [1-3]: 1

¿A qué base de datos restaurar?
  [1] Staging   (Railway)
  [2] URL custom

Selecciona destino [1-2]: 1
```

### Modo directo (con flags)

```bash
# Archivo específico a staging
./backend/scripts/restore-backup.sh \
  --file backups/staging/backup_staging_full_20260511_143022.sql \
  --target staging

# Archivo comprimido
./backend/scripts/restore-backup.sh \
  --file backups/staging/backup_staging_full_20260511_143022.sql.gz \
  --target staging

# URL custom (otra base de datos)
./backend/scripts/restore-backup.sh \
  --file backups/staging/backup_staging_full_20260511_143022.sql \
  --target postgresql://user:pass@host:5432/db
```

### Targets disponibles

| Flag | Base de datos |
|------|---------------|
| `--target staging` | Railway Staging (preconfigurado) |
| `--target production` | Railway Production (requiere completar URL en el script) |
| `--target <URL>` | Cualquier URL de PostgreSQL |

---

## Flujo típico de trabajo

```bash
# 1. Generar backup antes de un cambio riesgoso
./backend/scripts/backup-staging.sh --compress

# 2. Hacer el cambio...

# 3. Si algo salió mal, restaurar el backup más reciente
./backend/scripts/restore-backup.sh
```
