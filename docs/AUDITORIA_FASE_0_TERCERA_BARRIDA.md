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
producción en solo lectura. **Los hallazgos 1 y 2 se corrigieron el mismo día;
el resto sigue pendiente.**

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
- `tsc` limpio en backend y frontend. Los 2729 tests del backend pasan.

**Queda de tu lado**: desplegar a producción y revisar Loki.

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

[paidThroughExpenseOrder](../backend/src/modules/accounts-payable/accounts-payable.service.ts#L365)
ahora suma solo los movimientos **sin** pago de CP asociado
(`accountPayablePayment: { is: null }`), el mismo filtro que ya usaba
`settleFromExpenseOrderMovements`.

Así las dos mitades del problema original quedan cubiertas:

- Una CP ya conciliada tiene como tope su saldo, que es el IVA pendiente.
- Una CP histórica nunca conciliada sigue restando lo que salió por la OG. Esa
  es la protección contra el doble pago que `84e8adc` fue a poner.

**Dos pruebas nuevas** en
[accounts-payable.service.spec.ts](../backend/src/modules/accounts-payable/accounts-payable.service.spec.ts),
con un mock que replica el filtro de la base:

- La CP-2026-633 de PRD: el IVA exacto se puede pagar y un peso más no.
- La CP histórica: sigue bloqueando lo que salió por la OG.

La primera se corrió contra la consulta anterior y **falla**; con la nueva
pasa. Así se comprobó que atrapa el bug y no solo describe el arreglo.

**Verificación contra producción** (solo lectura), aplicando la consulta nueva
a las 190 CP espejo con saldo:

```
 bloqueadas_antes | bloqueadas_ahora | pagable_antes  | pagable_ahora
------------------+------------------+----------------+----------------
               83 |                0 | 103636890.41   | 105582010.78
```

La diferencia pagable es exactamente $1.945.120,37. **No requiere saneamiento
de datos**: las 83 CP quedan pagables en cuanto sale el despliegue.

---

## 3. El descuento por nómina no sigue el ciclo de vida de la OP — **Alta, latente**

`d1d353d` (2026-09-09). **En producción hay 0 descuentos**, así que nada de
esto ha causado daño todavía. Es el momento más barato para corregirlo: después
del fork se corrige dos veces, y después del primer uso real hay que sanear
datos.

### 3a. Anular la OP no cancela el descuento

La rama de `ANULADO` en
[orders.service.ts:1655](../backend/src/modules/orders/orders.service.ts#L1655)
no toca `payroll_deductions`, y
[`apply()`](../backend/src/modules/payroll-deductions/payroll-deductions.service.ts#L324)
no mira el estado de la OP.

Un descuento APROBADO sobre una OP que después se anula sigue en la bandeja de
nómina. Si alguien lo aplica, **se le descuenta al empleado de su salario un
trabajo anulado** y se registra un pago sobre una OP ANULADA.

Devoluciones sí lo contempla
([refund-requests.service.ts:187](../backend/src/modules/refund-requests/refund-requests.service.ts#L187));
la anulación quedó por fuera.

### 3b. El monto se congela, pero la OP se sigue pudiendo editar

[`createFromOrder`](../backend/src/modules/payroll-deductions/payroll-deductions.service.ts#L154)
congela el valor y el comentario dice que, si la OP cambia, *"el descuento hay
que cancelarlo y volver a pedirlo"*. Ese flujo no existe:

- `update`, `updateItem`, `removeItem` y los descuentos de la OP no revisan si
  hay un descuento vivo.
- No hay endpoint para pedir un descuento sobre una OP existente: solo nace al
  crear la OP.
- `order_id` es único en `payroll_deductions`, así que después de cancelar
  **no se puede volver a pedir**.

Si le quitan un ítem a la OP después de aprobado el descuento, al aplicarlo la
OP queda sobrepagada. Ese saldo a favor es plata que el empleado ya perdió de
su quincena.

### 3c. Borrar un periodo o registro de nómina deja el descuento huérfano

[payroll-periods.service.ts:148](../backend/src/modules/payroll/periods/payroll-periods.service.ts#L148)
borra el periodo sin mirar su estado (se puede borrar uno **PAGADO**), y los
registros caen en cascada. La llave `payroll_item_id` es `ON DELETE SET NULL`,
así que el descuento queda `APPLIED` y la OP pagada, pero ya no hay registro
de nómina que lo descuente. La empresa pierde el valor y nada lo marca.

### 3d. La concurrencia de `apply()` no está protegida como dice el comentario

- El comentario (líneas 327 y 436) confía en el índice único de `payment_id`.
  Pero cada aplicación crea **su propio** pago, así que ese índice nunca choca.
  Lo que hoy evita el doble descuento es la llave de idempotencia
  determinística que manda el frontend. Esa sí choca, pero contra
  `idempotency_key`, y como el `catch` solo reconoce `payment_id`, el segundo
  clic recibe un **500** en vez del 409 amable.
- El `PayrollItem` se lee **fuera** de la transacción. Si se aplican a la vez
  dos descuentos distintos del mismo empleado, el segundo pisa la suma del
  primero: las dos OP quedan pagadas y en nómina solo aparece uno.
- `approve`, `reject` y `cancel` hacen `update where { id }` sin condición de
  estado, así que un aprobar y un cancelar simultáneos pueden terminar en
  cualquier orden.

### Corrección propuesta

- **3a**: en la rama `ANULADO`, cancelar el descuento PENDING/APPROVED; y si
  está APPLIED, bloquear la anulación con el mismo mensaje de devoluciones. En
  `apply()`, rechazar OP anuladas o devueltas.
- **3b**: bloquear la edición de valores de una OP con descuento vivo, o
  permitir crear un descuento nuevo después de cancelar (el índice único
  pasaría a ser parcial, solo sobre estados vivos).
- **3c**: bloquear el borrado de periodos PAID y de registros con descuentos
  aplicados.
- **3d**: mover la lectura del `PayrollItem` dentro de la transacción,
  convertir los `update` de estado en `updateMany` condicionados, y reconocer
  el P2002 de `idempotency_key`.

---

## 4. CORS con los dominios de High Solutions escritos en código — **Media, bloquea el fork**

[main.ts:61](../backend/src/main.ts#L61):

```ts
const allowedOrigins = [
  'http://localhost:5173',
  'https://pruebas.crmhighsolutions.com',
  'https://crmhighsolutions.com',
];
```

`FRONTEND_URL` ya existe en `.env.example`, pero CORS no lo lee. El backend de
Zoom rechazaría las peticiones de su propio frontend y el login fallaría, con
un error de CORS en consola que no dice nada útil.

**Corrección propuesta**: armar la lista desde `FRONTEND_URL`, que acepte
varios orígenes separados por coma. Así el clon solo cambia variables de
entorno.

---

## 5. Tres crons corren en hora UTC — **Media**

La segunda barrida verificó los filtros de fecha y el cron de expiración de
aprobaciones, pero no los demás crons. Railway corre en UTC y
`ScheduleModule.forRoot()` no fija zona, así que todo `@Cron` sin `timeZone`
se dispara 5 horas antes de lo que dice.

| Cron | Dice | Corre en Colombia |
|---|---|---|
| [attendance.scheduler.ts:31](../backend/src/modules/attendance/attendance.scheduler.ts#L31) — cierre de fin de día | 11:59 p. m. | **6:59 p. m.** |
| [accounts-payable.service.ts:881](../backend/src/modules/accounts-payable/accounts-payable.service.ts#L881) — marcar CP vencidas | 12:00 a. m. | 7:00 p. m. del día anterior |
| [inventory.scheduler.ts:15](../backend/src/modules/inventory/inventory.scheduler.ts#L15) — alerta de stock | 8:00 a. m. | 3:00 a. m. |

**Verificado contra producción** — cierres automáticos de asistencia de los
últimos 60 días, por hora de Colombia:

```
 hora_cot | count
----------+-------
 18       |    91
```

Los 91 cierres de "fin de día" pasaron a las 6:59 p. m., sobre 8 usuarios, con
registros de 8,9 horas en promedio. Son personas con la pestaña **todavía
activa** a esa hora: a quien se va, ya lo cierra antes el cron de inactividad
de 60 minutos. Cualquier trabajo después de las 7 p. m. no se registra.

Las CP, por su parte, pasan a vencidas la noche del mismo día de vencimiento y
no al terminar el día.

**Corrección propuesta**: `{ timeZone: BUSINESS_TIMEZONE }` en los tres, como
ya hacen `audit-logs.scheduler` y `approval-expiry`. La de asistencia **cambia
lo que ven los usuarios**: pregúntale al cliente si el cierre de las 7 p. m.
se volvió la regla de hecho antes de moverlo a medianoche.

---

## 6. WhatsApp acepta webhooks falsos si faltan los secretos — **Media, riesgo para el fork**

- [whatsapp-webhook.service.ts:45](../backend/src/modules/whatsapp/whatsapp-webhook.service.ts#L45)
  — sin `WHATSAPP_APP_SECRET`, la firma de Meta **no se valida**. Solo queda un
  `warn` en el log.
- [whatsapp.service.ts:33](../backend/src/modules/whatsapp/whatsapp.service.ts#L33)
  — sin `WHATSAPP_ACTION_SECRET`, el HMAC de cada botón se firma con **clave
  vacía**, que cualquiera puede calcular.

En producción las dos variables están configuradas (las aprobaciones funcionan
con firma). El riesgo es el clon: el montaje de WhatsApp para Zoom es la fase
más lenta, y un despliegue sin esos dos secretos aceptaría un POST falso que
aprueba pagos.

**Corrección propuesta**: en staging y producción, negarse a arrancar si falta
cualquiera de los dos. Falla ruidosa en el deploy, no silenciosa en ejecución.

---

## 7. La autorización de Caja de una OG puede dejarla atascada — **Baja, latente**

[expense-orders.service.ts:481](../backend/src/modules/expense-orders/expense-orders.service.ts#L481):

- Marca la OG `AUTHORIZED` **antes** de verificar que haya una caja abierta
  (línea 491). Si no la hay, responde error, pero la OG ya salió de
  `ADMIN_AUTHORIZED`: Caja no puede reintentar, y la OG no tiene pago ni
  movimientos. El mensaje de error lo reconoce.
- Los movimientos, el paso a `PAID`, la CP y la conciliación van **sin
  transacción**: una falla a mitad de camino deja egresos de caja a medias.
- La verificación de estado es leer-y-luego-escribir. Dos autorizaciones
  simultáneas crearían los egresos dos veces. Hoy lo frena el candado del
  frontend de la primera barrida, pero la base no.

**Verificado contra producción**: 0 OG atascadas en `AUTHORIZED`, y las 366
pagadas tienen sus movimientos. No ha pasado.

**Corrección propuesta**: verificar la sesión primero, todo en una
transacción, y la transición como `updateMany where status = ADMIN_AUTHORIZED`
comprobando que afectó una fila.

---

## 8. Marca de High Solutions escrita en código — **Mejora para el fork**

Lo que el rebranding por grep tiene que encontrar, ordenado por lo fácil que
es pasarlo por alto:

| Qué | Dónde | Propuesta |
|---|---|---|
| Rol `admin` buscado **por nombre** | `notifications.service.ts:115`, `whatsapp.service.ts:97`, `whatsapp-webhook.service.ts:570`, `advisor-change-requests.service.ts:153`, `DtfItemsTable.tsx:136`, `ClientDetailPage` | No es marca, pero si el seed de Zoom renombra el rol, las notificaciones a admin fallan en silencio. Mantener el nombre `admin` o migrar a permisos |
| Sitios web en el pie de 4 PDF | `generateOrderPdf.ts:170`, `generateQuotePdf.ts:169`, `generateExpenseOrderPdf.ts:169`, `generateWorkOrderPdf.ts:124` | Leerlos del módulo Company, que ya guarda los logos |
| Dominios de CORS | `main.ts:61` | Hallazgo 4 |
| Página de mantenimiento | `maintenance.middleware.ts:43` | Nombre desde `VITE_APP_NAME`/config |
| Contacto de la empresa | `seed.ts:2571` | Datos del seed de Zoom |
| Swagger "BackOffice example", público en producción | `main.ts:15` | Título real y desactivarlo fuera de desarrollo: publica el mapa completo de la API |

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
  internas de Prisma y Node.
- **Coma flotante**: solo quedan sumas de presentación en
  `dashboard.repository.ts`; nada que se guarde.

**Fuera de alcance en esta barrida**: la ejecución de devoluciones (`a84e17b`,
~380 líneas de servicio) solo se revisó en su interacción con el descuento por
nómina. Inventario, producción y cartera tampoco se tocaron.

---

## Orden sugerido

1. ~~**Hallazgo 1**~~ ✅ — falta desplegar y revisar en Loki si hubo llamadas.
2. ~~**Hallazgo 2**~~ ✅ — falta desplegar; desbloquea $1.945.120 en 83 CP.
3. **Hallazgos 4 y 6** antes de forkear: sin el 4 el clon no arranca, y el 6
   es la red de seguridad para cuando se monte su WhatsApp.
4. **Hallazgo 3** mientras siga en cero filas.
5. **Hallazgo 5**, previa pregunta al cliente sobre el cierre de asistencia.
6. **Hallazgos 7 y 8** durante el rebranding.

Los hallazgos 3, 4 y 6 son los que el clon heredaría y habría que corregir dos
veces.
