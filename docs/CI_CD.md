# CI/CD

## Cómo funciona

```
PR / push a develop · staging · master
        │
        ▼
GitHub Actions (.github/workflows/ci.yml)
  ├─ Backend      → npm ci · prisma generate · tsc · jest
  ├─ Migraciones  → prisma migrate deploy en Postgres 17 vacío · prisma:drift
  └─ Frontend     → npm ci · lint · vitest · build (tsc + vite)
        │  todos en verde
        ▼
Railway ("Wait for CI") despliega el commit
  └─ prisma migrate deploy && start  (healthcheck /health)
```

- **CI** = GitHub Actions. Corre en cada PR hacia `develop`, `staging` y `master`, y en cada push a esas ramas (el commit que Railway despliega).
- **CD** = Railway, igual que antes. Lo único nuevo es que espera a que el CI pase.
- Node está fijado en **22** con `backend/.nvmrc` y `frontend/.nvmrc`. Es la misma versión mayor que Railway ya usaba por defecto (22.23.x), y Railpack lee ese archivo, así que CI y despliegue corren con la misma versión.

### Qué atrapa cada job

| Job | Atrapa |
|---|---|
| Backend | Errores de tipos y tests unitarios rotos |
| Migraciones | Una migración que falla al aplicarse (hoy se descubriría cuando el arranque en Railway falla) y un `schema.prisma` modificado sin migración, o una migración que no coincide con el schema |
| Frontend | Errores de lint, errores de tipos, tests rotos y un build que no compila |

### Lint del frontend

- `npm run lint` falla solo con **errores**. Los avisos (~690, casi todos `no-explicit-any`) se muestran pero no bloquean.
- `no-explicit-any` es aviso: los `any` heredados se van quitando al tocar cada archivo.
- `no-unused-vars` ignora lo que empieza con `_` (descartado a propósito) y lo que se separa con `...rest`.
- Los avisos de `react-hooks/exhaustive-deps` **no** se corrigen a ciegas: agregar dependencias a un `useEffect` puede causar loops o peticiones repetidas. Se revisan uno por uno al tocar cada pantalla.

> Los nombres de los jobs son los que exige el ruleset. Si renombras uno, actualiza el ruleset o los PRs quedan bloqueados esperando un check que ya no existe.

### Tiempos de referencia

Medidos en un clon limpio: backend ~4 min (jest es lo más lento), frontend ~1,5 min y migraciones ~1 min. Los jobs corren en paralelo.

## Configuración manual (aplicada el 2026-11-05)

### 1. Railway: esperar al CI

En **cada servicio** (BackEnd y FrontEnd) y **en cada ambiente** (production, staging, development):

`Settings → Source → Wait for CI` → activado.

Con esto, un push a la rama queda en estado *WAITING* hasta que los checks de GitHub pasan. Si fallan, Railway **no** despliega y la versión anterior sigue atendiendo.

> Requiere que Railway tenga acceso al repo por la GitHub App (ya lo tiene, porque despliega desde GitHub).

### 2. GitHub: protección de ramas

`Settings → Branches → Add branch ruleset` (o *Branch protection rule*) para `master` y `staging`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass → agrega:
  - `Backend (tsc + jest)`
  - `Migraciones (deploy + drift)`
  - `Frontend (tsc + vitest + build)`
- ✅ Require branches to be up to date before merging (opcional; alarga el flujo)

Los nombres de los checks aparecen en el buscador después de la primera corrida del workflow.

En `develop` puedes aplicarlo también, o dejarlo libre si a veces haces push directo; en ese caso, el "Wait for CI" de Railway sigue protegiendo el ambiente de desarrollo.

## Si un check falla

- **Migraciones → drift**: `schema.prisma` y las migraciones no describen la misma base. Corre `npx prisma migrate dev --name <cambio>` en local y versiona la migración.
- **Migraciones → deploy**: la migración tiene un error de SQL o depende de datos que no existen en una base vacía. Arréglala antes del merge; en Railway fallaría igual.
- **Backend / Frontend**: reproduce en local con los mismos comandos del workflow.

## Pendiente

- (Opcional) Trinquete de avisos: `--max-warnings <n>` con el número actual, para que no crezcan.
- Correr `backend/scripts/db-invariants.sh` contra staging después de cada despliegue o de forma programada.
