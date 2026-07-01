# Observabilidad — Logs en Grafana Cloud (Loki)

El backend usa [`nestjs-pino`](https://github.com/iamolegga/nestjs-pino) para emitir logs
estructurados en JSON. En **staging/producción** los envía por push a **Grafana Cloud
Loki** con el transporte `pino-loki`; en **desarrollo** usa `pino-pretty` (salida legible
en consola). No requiere infraestructura adicional en Railway.

## Arquitectura

```
NestJS (pino) ──push (pino-loki, batched cada 5s)──▶ Grafana Cloud Loki ──▶ Grafana (Explore / Dashboards)
```

Cada log lleva las labels `app="backoffice-backend"` y `env="<NODE_ENV>"`, más campos
estructurados: `level`, `context`, `req` (id/método/url), `res.statusCode`,
`responseTime`, y `userId`/`ip`/`userAgent` (del `AuditContextInterceptor`).

## 1. Configurar Grafana Cloud

1. Crear una cuenta gratuita en <https://grafana.com/> y un stack.
2. En **Connections → Add new connection → Loki** (o **Details** del stack → Loki),
   copiar:
   - **URL** de push → `LOKI_HOST` (ej. `https://logs-prod-xxx.grafana.net`)
   - **User / Instance ID** → `LOKI_USER`
3. Generar un **API token** con permiso de escritura de logs
   (Grafana Cloud → **Access Policies** o **API Keys**) → `LOKI_API_KEY`.

## 2. Configurar variables en Railway

En el dashboard de Railway, en los servicios **staging** y **production** del backend,
agregar:

| Variable | Valor |
|----------|-------|
| `LOG_LEVEL` | `info` |
| `LOKI_HOST` | URL de push de Loki |
| `LOKI_USER` | User/Instance ID |
| `LOKI_API_KEY` | Token de Grafana Cloud |

> En **desarrollo** dejar las `LOKI_*` vacías: la app cae automáticamente a `pino-pretty`.
> Si un entorno productivo no tiene `LOKI_*`, los logs salen como JSON a stdout (Railway
> los captura igual, sin push a Loki).

## 3. Importar el dashboard

En Grafana: **Dashboards → New → Import** → subir
[`grafana-dashboard.json`](./grafana-dashboard.json) → seleccionar la data source de Loki.

Incluye: volumen de logs por nivel, panel de errores recientes y un panel de búsqueda de
texto libre, con variables de `Ambiente` (staging/production) y `Buscar texto`.

## 4. Consultas LogQL útiles (Explore)

```logql
# Todo lo de producción
{app="backoffice-backend", env="production"}

# Sólo errores
{app="backoffice-backend"} | json | level=~"error|fatal"

# Actividad de un usuario
{app="backoffice-backend"} | json | userId="<uuid>"

# Respuestas 5xx
{app="backoffice-backend"} | json | res_statusCode>=500

# Requests lentos (>1s)
{app="backoffice-backend"} | json | responseTime > 1000
```

### WhatsApp (Meta API)

El módulo de WhatsApp loguea con el `Logger` de NestJS (`context="WhatsappService"`),
así que su actividad ya llega a Loki. El dashboard incluye una sección **WhatsApp
(Meta API)** con envíos vs. fallos y una tabla de actividad.

```logql
# Toda la actividad de WhatsApp (envíos, fallos, webhooks)
{app="backoffice-backend"} | json | context=~"Whatsapp.*"

# Solo fallos de envío a Meta
{app="backoffice-backend"} | json | context="WhatsappService" | level="error"
```

> El *payload* completo enviado a Meta se registra con `logger.debug`, por lo que con
> `LOG_LEVEL=info` (default) **no se ve**. Para inspeccionarlo, poner `LOG_LEVEL=debug`
> en Railway temporalmente (genera bastante volumen).

## Seguridad

El logger **redacta** automáticamente datos sensibles antes de enviarlos a Loki:
`authorization`, `cookie`, `set-cookie`, `password`, `currentPassword`, `newPassword`,
`refreshToken`, `accessToken`. Ver la lista en
[`../../src/common/logger/logger.config.ts`](../../src/common/logger/logger.config.ts).

## Fuera de alcance (fase 2)

Métricas Prometheus (`/metrics`), tracing (OpenTelemetry) y alertas en Grafana.
