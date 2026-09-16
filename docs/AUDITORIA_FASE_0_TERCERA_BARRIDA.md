# Tercera barrida — Fase 0

Fecha: 2026-09-14 · Rama: `develop` · Commit base: `4c920cd`

Las dos barridas anteriores ([primera](./AUDITORIA_FASE_0.md),
[segunda](./AUDITORIA_FASE_0_SEGUNDA_BARRIDA.md)) cubrieron índices únicos,
consecutivos, doble envío, idempotencia, filtros booleanos, permisos de
Cotizaciones y Auditoría, zonas horarias de filtros y aritmética de CP.

Esta apunta a lo que ninguna tocó:

- **El código nuevo desde el 6 de septiembre**: descuento por nómina,
  conciliación de la CP espejo de OG, saldo a favor en DTF, auditoría nueva y
  `server.js`.
- **El perímetro**: rutas públicas, webhooks, WebSocket, subida de archivos y
  crons.
- **Lo que el fork arrastraría con nombre propio**: dominios, marca y secretos.

Cada hallazgo trae evidencia en el código y, cuando aplica, verificación contra
producción en solo lectura.

**Estado**: los hallazgos 1 a 7 están corregidos; el 5 se cerró el 2026-09-15
con la decisión del cliente sobre asistencia. Del 8, el Swagger ya está resuelto
y el resto se hace durante el rebranding del fork.

---

## 1. Cualquiera en internet puede crearse una cuenta de administrador — **Crítica** · ✅ Corregido

Tres piezas que por separado parecen inofensivas:

1. `auth.controller.ts` — `POST /auth/register` era `@Public()`.
2. `auth.service.ts` — creaba el usuario con el `roleId` **que manda el
   cliente**, sin mirar qué rol es.
3. [seed.ts:437](../backend/prisma/seed.ts#L437) — el rol `admin` se crea con
   un UUID fijo, `b1700ef6-4e33-4c5b-9f4a-a249e59e483f`, que está en el
   repositorio desde el 2026-01-21 (`4b404f0`).

Una sola petición sin token, con un email cualquiera y ese `roleId`, devolvía
un access token de administrador con todos los permisos: caja, pagos,
anulaciones, roles, usuarios.

**Verificado contra producción** (solo lectura, no se probó el ataque):

```
  name   | es_uuid_admin_seed
---------+--------------------
 admin   | t
```

El rol `admin` de PRD **tiene ese UUID**. Y aunque no lo tuviera, el agujero
seguía abierto para gente de adentro: 17 usuarios activos que no son admin
(12 operarios, 2 `user`, 2 contabilidad, 1 caja) tienen `read_roles` y pueden
leer los ids de todos los roles.

**No hay rastro de explotación en la base**: cero usuarios con la firma de ese
endpoint (crea cuentas sin `firstName`), y los 5 administradores tienen
nombres reconocibles. Confirma que el último, creado el 2026-08-11, lo creaste
tú o alguien del equipo. Vale la pena revisar en Grafana Loki si hubo
peticiones a `POST /api/v1/auth/register`.

**Nadie usaba el endpoint.** Los usuarios se crean desde el módulo de
Usuarios, que exige `create_users`, y la página `/register` del frontend era un
placeholder que decía "será habilitada por el administrador".

**Por qué importaba para Zoom**: el seed es el mismo, así que el clon habría
nacido con el mismo UUID y el mismo endpoint abierto.

### Corrección aplicada

Se eliminó el autoregistro de punta a punta, sin reemplazo:

- **Backend**: la ruta `POST /auth/register`, `AuthService.register` y
  `RegisterDto`.
- **Frontend**: la página placeholder, la ruta `/register`, `PATHS.REGISTER` y
  `ROUTES.REGISTER`, `authApi.register`, el tipo `RegisterDto` y la excepción
  de `/auth/register` en el interceptor de axios.
- **Documentación**: `CLAUDE.md`, `README.md`, `FRONTEND_ARCHITECTURE.md` y las
  guías `FOLDERS.md` y `06-TESTING-GUIDE.md`, para que ninguna guía para IA
  vuelva a describir el endpoint.

**El UUID fijo del seed no se tocó.** Sin el endpoint deja de ser una llave, y
cambiarlo en PRD sería una migración sin beneficio de seguridad.

**Una prueba para que no vuelva**:
[auth.controller.spec.ts](../backend/src/modules/auth/auth.controller.spec.ts)
falla si `AuthController` vuelve a tener un método `register` o `signup`.
Reintroducir la ruta no rompía ningún test de comportamiento, así que hacía
falta algo que lo hiciera ruidoso.

**Verificación**:

- Backend levantado en local: `AuthController` mapea solo `login`, `refresh`,
  `logout`, `me`, `profile`, `change-password`, `verify-password` y
  `profile/photo`.
- `POST /api/v1/auth/register` con el UUID de admin → **404**.
- Login con credenciales inválidas → 401, así que la autenticación sigue
  funcionando.
- `/register` en el frontend cae en el login.

---

## 2. El IVA de 83 CP espejo de OG no se podía pagar — **Alta** · ✅ Corregido

Lo introdujo `84e8adc`, la corrección del doble pago de la CP espejo.

`settleFromExpenseOrderMovements` refleja los egresos de la OG como pagos de la
CP, y con eso `balance` **ya descuenta** lo girado. Pero `assertPayableAmount`
calcula el disponible así:

```ts
const disponible = Prisma.Decimal.max(balance.sub(porOG), new Prisma.Decimal(0));
```

y `paidThroughExpenseOrder` sumaba **todos** los movimientos de la OG,
incluidos los que ya estaban reflejados. Lo girado se restaba dos veces y el
disponible daba $0.

El comentario de `settleFromExpenseOrderMovements` decía lo contrario de lo que
pasaba: *"Si queda saldo, la CP sigue viva por la diferencia, que sí es
pagable."* No lo era. Los movimientos de la OG pagan la base, y la diferencia
con el total de la CP es IVA (o retenciones) que sí se le debe al proveedor.

**Verificado contra producción:**

```
  status   | cps | con_saldo | saldo_tras_reflejar | pago_bloqueado | residuo_total
-----------+-----+-----------+---------------------+----------------+---------------
 PARTIAL   |  32 |        32 |                  32 |             32 |    1059006.73
 OVERDUE   | 130 |       130 |                  51 |             51 |     886113.64
```

**83 CP con $1.945.120 que el sistema no dejaba pagar.** 51 ya están vencidas,
y es probable que parte de ellas se vencieran justamente por eso.

| CP | total | saldo | girado por OG | disponible que calculaba |
|---|---|---|---|---|
| CP-2026-633 | $1.628.937 | $260.082 | $1.368.855 | $0 |
| CP-2026-692 | $1.077.854 | $172.094 | $905.760 | $0 |
| CP-2026-384 | $977.537 | $156.077 | $821.460 | $0 |

En la primera, $260.082 es exactamente el 19 % de $1.368.855.

### Corrección aplicada

[paidThroughExpenseOrder](../backend/src/modules/accounts-payable/accounts-payable.service.ts)
ahora suma solo los movimientos **sin** pago de CP asociado
(`accountPayablePayment: { is: null }`), el mismo filtro que ya usaba
`settleFromExpenseOrderMovements`. Así quedan cubiertas las dos mitades:

- Una CP ya conciliada tiene como tope su saldo, que es el IVA pendiente.
- Una CP histórica nunca conciliada sigue restando lo que salió por la OG. Esa
  es la protección contra el doble pago que `84e8adc` fue a poner.

**Dos pruebas nuevas**, con un mock que replica el filtro de la base:

- La CP-2026-633 de PRD: el IVA exacto se puede pagar y un peso más no.
- La CP histórica: sigue bloqueando lo que salió por la OG.

La primera se corrió contra la consulta anterior y **falla**; con la nueva
pasa.

**Verificación contra producción** (solo lectura), aplicando la consulta nueva
a las 190 CP espejo con saldo:

```
 bloqueadas_antes | bloqueadas_ahora | pagable_antes  | pagable_ahora
------------------+------------------+----------------+----------------
               83 |                0 | 103636890.41   | 105582010.78
```

La diferencia pagable es exactamente $1.945.120,37. **No requiere saneamiento
de datos.**

---

## 3. El descuento por nómina no seguía el ciclo de vida de la OP — **Alta, latente** · ✅ Corregido

`d1d353d` (2026-09-09). **En producción hay 0 descuentos**, así que nada de
esto había causado daño. Era el momento más barato para corregirlo: después
del fork se corrige dos veces, y después del primer uso real hay que sanear
datos.

### 3a. Anular la OP no cancelaba el descuento

La rama de `ANULADO` de `orders.service.ts` no tocaba `payroll_deductions`, y
`apply()` no miraba el estado de la OP. Un descuento APROBADO sobre una OP que
después se anulaba seguía en la bandeja de nómina. Si alguien lo aplicaba,
**se le descontaba al empleado de su salario un trabajo anulado**.

Devoluciones sí lo contemplaba
([refund-requests.service.ts:187](../backend/src/modules/refund-requests/refund-requests.service.ts#L187));
la anulación había quedado por fuera.

### 3b. El monto se congelaba, pero la OP se seguía pudiendo editar

`createFromOrder` congela el valor, y el comentario decía que si la OP cambia
*"el descuento hay que cancelarlo y volver a pedirlo"*. Ese flujo no existe:
ninguna edición revisaba el descuento, no hay endpoint para pedirlo sobre una
OP existente, y `order_id` es único. Quitarle un ítem a la OP después de
aprobado el descuento la dejaba sobrepagada con plata del empleado.

### 3c. Borrar un periodo o registro de nómina dejaba el descuento huérfano

Los registros caen en cascada y la llave `payroll_item_id` es `ON DELETE SET
NULL`: el descuento quedaba `APPLIED` y la OP pagada, sin registro de nómina
que lo descontara.

### 3d. La concurrencia de `apply()` no estaba protegida como decía el comentario

- El comentario confiaba en el índice único de `payment_id`, pero cada
  aplicación crea **su propio** pago: el índice nunca chocaba. Lo que frenaba
  el doble descuento era la llave de idempotencia del frontend, y su colisión
  llegaba como un **500**.
- El `PayrollItem` se leía **fuera** de la transacción: dos descuentos del
  mismo empleado aplicados a la vez se pisaban la suma.
- `approve`, `reject` y `cancel` hacían `update where { id }` sin condición de
  estado.

### Corrección aplicada

- **3a** — Anular una OP con el descuento **aplicado** se bloquea antes de
  consumir la autorización de anulación, con el mismo mensaje de devoluciones:
  hay que cancelar el descuento, que es lo que se lo devuelve al empleado. Si
  el descuento estaba pendiente o aprobado, se cancela al anular. `approve()` y
  `apply()` rechazan OP anuladas o devueltas.
- **3b** — `recalculateOrderTotals` llama a `assertOrderValueMatches` con el
  total nuevo, dentro de la transacción que lo guarda. Si hay un descuento vivo
  y el total cambia, el cambio se revierte entero. Por ahí pasan los siete
  caminos que cambian el valor: ítems, descuentos de OP y tasas. Las tasas y la
  prueba de color se guardan fuera de transacción, así que ahí la guarda va
  antes de escribir (`assertNoLiveDeduction`). Una edición que no mueve el
  total sigue permitida.
- **3c** — Borrar un periodo o un registro de nómina con descuentos aplicados
  se bloquea.
- **3d** — Los cuatro cambios de estado usan `updateMany` condicionado, y quien
  pierde la carrera recibe un conflicto en vez de pisar al otro. `apply()`
  reclama el descuento **antes** de tocar la nómina. La suma y la resta sobre
  `orderDeductions` son incrementos atómicos de la base. La colisión de
  `idempotency_key` devuelve el descuento ya aplicado.

**Pruebas**: el spec de descuentos se reescribió con 38 casos, entre ellos las
carreras de aplicar y de cancelar, la colisión de la llave con la forma real
del P2002 del adaptador, las OP anuladas y cada guarda de ciclo de vida. Se
suman pruebas de cableado en órdenes (anulación y tasas) y en periodos y
registros de nómina.

> **Límite de la verificación**: a diferencia del hallazgo 2, no se pudo correr
> el spec nuevo contra el servicio anterior: no compila, porque llama funciones
> que antes no existían. Las carreras están cubiertas con mocks de las
> escrituras condicionadas, no reproducidas contra Postgres.

---

## 4. CORS con los dominios de High Solutions escritos en código — **Media, bloqueaba el fork** · ✅ Corregido

`main.ts` tenía la lista escrita en código:

```ts
const allowedOrigins = [
  'http://localhost:5173',
  'https://pruebas.crmhighsolutions.com',
  'https://crmhighsolutions.com',
];
```

El backend de Zoom habría rechazado las peticiones de su propio frontend.

### Corrección aplicada

[cors-origins.util.ts](../backend/src/common/utils/cors-origins.util.ts) arma
la lista desde `CORS_ORIGINS` (varios orígenes, separados por coma) o, si no
existe, desde `FRONTEND_URL`. En desarrollo se suma el Vite local. El arranque
deja en el log los orígenes que quedaron permitidos, o un error si no quedó
ninguno.

**Lo que evitó revisar Railway antes de tocar el código**: `FRONTEND_URL` está
guardada **sin esquema** (`crmhighsolutions.com` en PRD,
`pruebas.crmhighsolutions.com` en staging). El navegador manda
`Origin: https://crmhighsolutions.com`, así que leer la variable tal cual
habría tumbado el login de todos. Por eso `normalizeOrigin` agrega `https://`,
y `app.config.ts` la normaliza también para los enlaces de WhatsApp.

**Cambio de comportamiento**: fuera de desarrollo ya no se aceptan
`localhost` ni el frontend del otro ambiente. PRD solo acepta
`https://crmhighsolutions.com`, y staging solo el de pruebas. Si alguien
apuntaba un frontend local contra el API de producción, eso deja de funcionar.

**Verificación**: pruebas del útil con los valores reales de Railway. Con el
backend levantado en local, un preflight desde `http://localhost:5173` responde
204 con su cabecera, y desde `https://crmhighsolutions.com` o un origen ajeno se
rechaza.

---

## 5. Tres crons corrían en hora UTC — **Media** · ✅ Corregido

Railway corre en UTC y `ScheduleModule.forRoot()` no fija zona, así que todo
`@Cron` sin `timeZone` se dispara 5 horas antes de lo que dice.

| Cron | Dice | Corría en Colombia | Estado |
|---|---|---|---|
| Cierre de asistencia de fin de día | 11:59 p. m. | **6:59 p. m.** | ✅ 7:00 p. m. por decisión del cliente, con horas extra |
| Marcar CP vencidas | 12:00 a. m. | 7:00 p. m. del día anterior | ✅ |
| Alerta de stock bajo | 8:00 a. m. | 3:00 a. m. | ✅ |

### Asistencia: la jornada termina a las 7 p. m., con horas extra

**Verificado contra producción**: los 91 cierres de "fin de día" de los últimos
60 días pasaron a las 6:59 p. m., sobre 8 usuarios. En los últimos 7 días (lo
que se conserva de los avisos del navegador), **ninguna** de esas personas usó
el CRM ni tenía la pestaña abierta después del cierre: se habían ido entre las
6 y las 7 sin marcar salida. El cierre no estaba cortando trabajo real.

> **Corrección a la versión anterior**, que decía que eran personas con la
> pestaña todavía activa. La consulta de 7 días muestra lo contrario.

Moverlo a medianoche, como decía el código, habría inflado horas. El cierre por
inactividad registra la hora en que lo detecta, entre 60 y 75 minutos después
del último aviso, y una pestaña abierta en un equipo encendido cuenta como
presente.

**Decisión del cliente (2026-09-15)**: la jornada termina a las 7 p. m., pero
hay personal que hace horas extra. Para ese caso había dos problemas:

- El aviso después del cierre era el recordatorio genérico de marcar entrada,
  que se puede descartar por sesión. Nada decía que la jornada se había cerrado.
- Un registro de horas extra marcado después de las 7 no lo cerraba nadie. Con
  la pestaña abierta, el cierre por inactividad no actúa, así que quedaba
  abierto hasta el cierre del día siguiente.

### Corrección aplicada a asistencia

- **Cierre de jornada a las 7:00 p. m. hora Colombia**, explícito y
  configurable con `ATTENDANCE_WORKDAY_END` (`HH:mm`), pensando en las sedes de
  Zoom. Se registra en `onModuleInit` con `SchedulerRegistry`: el decorador
  `@Cron` se evalúa al cargar la clase, antes de que se lea el `.env`.
- **Horas extra = marcar entrada de nuevo.** Si el sistema cerró la jornada,
  `GET /attendance/my-status` devuelve `autoClosedAt`, y el banner muestra un
  aviso que no se puede descartar: *"Tu jornada se cerró automáticamente a las
  7:00 p. m. Si vas a hacer horas extra, marca entrada de nuevo."* Ese segundo
  registro es la hora extra, separado y visible en los reportes.
- **Tope a las 11:59 p. m.**: cierra el registro de horas extra que nadie cerró.
- `cron` 4.3.5 queda declarado como dependencia directa, la misma versión que
  trae `@nestjs/schedule`.

Estos registros no alimentan la nómina: las horas extra de la liquidación se
siguen digitando en el registro de nómina.

### Corrección aplicada a CP vencidas: el `timeZone` solo no bastaba

En PRD, `due_date` se guarda como la medianoche de Colombia (**05:00 UTC** en
236 CP). El cron comparaba `dueDate < now`:

- A las 7 p. m. de Colombia, la CP pasaba a vencida **la noche de su propio día
  de vencimiento**. En PRD había **3 CP en OVERDUE con vencimiento hoy**.
- Con solo agregar `timeZone`, a las 00:00 de Colombia `dueDate < now` la
  habría vencido **desde el primer segundo de su día**: peor.

Ahora corre a medianoche de Colombia y corta en el inicio de hoy en hora
Colombia (`startOfDay(businessToday())`). Lo que vence hoy no está vencido
hasta mañana. Dos pruebas con reloj fijo cubren el borde de las 11:30 p. m.,
cuando en UTC ya es el día siguiente. Las 3 CP marcadas antes de tiempo no se
sanean: mañana ya les corresponde estar vencidas.

---

## 6. WhatsApp aceptaba webhooks falsos si faltaban los secretos — **Media, riesgo para el fork** · ✅ Corregido

Había dos candados, y los dos podían quedar abiertos por configuración:

- Sin `WHATSAPP_APP_SECRET`, la firma de Meta **no se validaba**: solo quedaba
  un `warn` en el log.
- `WHATSAPP_ACTION_SECRET` firmaba un segundo formato de botón: mensajes
  interactivos con la solicitud y un HMAC en el id (`approve:{id}:{hmac}`). En
  PRD **la variable no existe**, así que esa firma se calculaba con clave vacía.

> **Corrección a dos versiones anteriores de este informe.** La primera decía
> que en PRD estaban las dos variables: falta `WHATSAPP_ACTION_SECRET`. La
> segunda decía que por eso los botones de aprobación de producción se firmaban
> con clave vacía y que definirla invalidaría los ya enviados. Tampoco: los
> botones actuales no usan esa firma.

**Cómo funcionan de verdad los botones.** Las plantillas mandan `APPROVE` o
`REJECT`. Al enviarlas se guarda el `wamid` del mensaje, el teléfono del admin y
un vencimiento de 48 horas (`WhatsappActionContext`). Cuando tocan el botón, el
webhook exige la firma de Meta, busca la solicitud por ese `wamid` y comprueba
vencimiento y teléfono.

El formato interactivo firmado era **código muerto por un solo lado**:
`sendInteractiveButtonMessage` y `generateActionHmac` no tenían ninguna llamada,
pero el webhook seguía aceptando esos mensajes (`handleButtonReply`). No era
explotable mientras la firma de Meta estuviera configurada, pero era una
entrada sin uso, protegida por un secreto que nadie había definido.

### Corrección aplicada

- **Staging y producción sin `WHATSAPP_APP_SECRET`**: el webhook se rechaza
  (401) en vez de saltarse la firma, con pruebas por ambiente. PRD y staging la
  tienen, así que no hay regresión.
- **Se eliminó el formato interactivo firmado** de punta a punta: la rama del
  webhook, `handleButtonReply`, `handleViewOrder`, `generateActionHmac`,
  `validateActionHmac`, `sendInteractiveButtonMessage`, la variable
  `WHATSAPP_ACTION_SECRET` (config y `.env.example`) y sus pruebas. Una prueba
  nueva comprueba que un mensaje con ese formato se ignora.

**No hay nada que configurar**, ni en PRD ni en el clon de Zoom. La variable
que existe en el ambiente de staging de Railway quedó sin uso y se puede borrar.

---

## 7. La autorización de Caja de una OG podía dejarla atascada — **Baja, latente** · ✅ Corregido

`cajaAuthorize` marcaba la OG `AUTHORIZED` **antes** de verificar que hubiera
una caja abierta. Sin caja, la OG salía de `ADMIN_AUTHORIZED` sin pago ni
movimientos y Caja no podía reintentar. Además, la verificación de estado era
leer-y-luego-escribir: dos autorizaciones simultáneas creaban los egresos dos
veces.

**Verificado contra producción**: 0 OG atascadas en `AUTHORIZED`, y las 366
pagadas tienen sus movimientos.

### Corrección aplicada

La caja abierta se verifica primero. La transición a `AUTHORIZED` es un
`updateMany` condicionado
([claimCajaAuthorization](../backend/src/modules/expense-orders/expense-orders.repository.ts)),
y si otra autorización ya la tomó, esta responde conflicto sin crear egresos.
Tres pruebas nuevas: la autorización normal, sin caja y la carrera perdida.

**Queda fuera, a propósito**: los egresos, el paso a `PAID`, la CP y la
conciliación siguen sin una transacción común. Una falla a mitad de camino
puede dejar egresos a medias. Unirlos pide que `generateNumber`,
`createFromExpenseOrder` y `settleFromExpenseOrderMovements` acepten un cliente
de transacción: es un refactor aparte.

---

## 8. Marca de High Solutions escrita en código — **Mejora para el fork** · Pendiente

Lo que el rebranding por grep tiene que encontrar, ordenado por lo fácil que
es pasarlo por alto:

| Qué | Dónde | Propuesta |
|---|---|---|
| Rol `admin` buscado **por nombre** | `notifications.service.ts:115`, `whatsapp.service.ts:97`, `whatsapp-webhook.service.ts:570`, `advisor-change-requests.service.ts:153`, `DtfItemsTable.tsx:136`, `ClientDetailPage` | No es marca, pero si el seed de Zoom renombra el rol, las notificaciones a admin fallan en silencio. Mantener el nombre `admin` o migrar a permisos |
| Sitios web en el pie de 4 PDF | `generateOrderPdf.ts:170`, `generateQuotePdf.ts:169`, `generateExpenseOrderPdf.ts:169`, `generateWorkOrderPdf.ts:124` | Leerlos del módulo Company, que ya guarda los logos |
| Página de mantenimiento | `maintenance.middleware.ts:43` | Nombre desde `VITE_APP_NAME`/config |
| Contacto de la empresa | `seed.ts:2571` | Datos del seed de Zoom |
| ~~Swagger "BackOffice example", público en producción~~ | `main.ts` | ✅ Corregido: título neutro ("Backoffice API") y solo se publica en desarrollo, salvo `SWAGGER_ENABLED=true` (`swagger.util.ts`) |

---

## Revisado sin hallazgos

- **`frontend/server.js`**: 404 real para assets inexistentes, `index: false`,
  sin fallback SPA para rutas con extensión. Sin traversal: `express.static`
  normaliza la ruta.
- **Auditoría nueva (`audit-log.extension.ts`)**: los logs de una transacción
  interactiva se escriben tras el commit y se descartan en rollback; un fallo
  de auditoría no tumba la operación.
- **Rutas públicas**: aparte del registro ya eliminado, solo login (10/min),
  refresh, ubicaciones, reporte de errores del cliente (20/min), el webhook y
  `approvals/resolve`, que solo devuelve el id de la entidad para un
  `requestId` UUID. Todos los demás controladores aplican `JwtAuthGuard` +
  `PermissionsGuard`, salvo notificaciones, que se acota por el token (ya
  revisado en la segunda barrida).
- **WebSocket**: valida el JWT en el handshake. `origin: true` es aceptable
  porque la autenticación no va en cookies.
- **Clonar un periodo de nómina** no copia `orderDeductions`: no hay doble
  descuento por esa vía.
- **`.env.example`**: completo; el diff contra el código solo muestra variables
  internas de Prisma y Node. Ahora documenta `CORS_ORIGINS`.
- **Coma flotante**: solo quedan sumas de presentación en
  `dashboard.repository.ts`; nada que se guarde.

**Fuera de alcance en esta barrida**: la ejecución de devoluciones (`a84e17b`,
~380 líneas de servicio) solo se revisó en su interacción con el descuento por
nómina. Inventario, producción y cartera tampoco se tocaron.

---

## Qué falta

1. **Desplegar** backend y frontend. El hallazgo 1 sigue abierto en producción
   hasta que salga el backend.
2. **Revisar en Loki** si hubo llamadas a `POST /api/v1/auth/register`.
3. **Hallazgo 8** durante el rebranding del fork (el Swagger ya está resuelto).
