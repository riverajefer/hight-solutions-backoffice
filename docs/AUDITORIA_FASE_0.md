# Auditoría Fase 0 — antes del fork para Zoom

Fecha: 2026-09-06 · Rama: `develop` · Commit base: `1b997c6`

Objetivo: encontrar los bugs que el clon se llevaría intactos. Todo lo que quede
sin corregir aquí se corrige dos veces a partir del fork.

Cada hallazgo lleva evidencia en el código. No se hizo ningún cambio.

---

## 1. El índice único parcial existe en 1 de 11 tablas de solicitudes — **Alta** · ✅ Corregido

`expense_order_auth_requests` es la única tabla con la garantía en base de datos:

```
backend/prisma/migrations/20260828000000_unique_pending_expense_order_auth_request/migration.sql
CREATE UNIQUE INDEX IF NOT EXISTS "expense_order_auth_requests_pending_unique"
  ON "expense_order_auth_requests" ("expense_order_id", "requested_by_id")
  WHERE "status" = 'PENDING';
```

Las otras diez tablas de solicitudes repiten el patrón `findFirst` → `create`
sin nada que lo respalde en Postgres, que es exactamente la carrera que esa
migración documenta con tres casos reales de producción (OG-2026-0444, 0445 y
0317, con 1 a 14 ms de diferencia entre las filas gemelas):

| Tabla | Guard actual |
|---|---|
| `client_advisor_requests` | solo `findFirst` |
| `order_edit_requests` | solo `findFirst` |
| `order_status_change_requests` | solo `findFirst` |
| `advisor_change_requests` | solo `findFirst` |
| `account_payable_auth_requests` | `findFirst` — [accounts-payable-auth-requests.service.ts:137](../backend/src/modules/accounts-payable-auth-requests/accounts-payable-auth-requests.service.ts#L137) |
| `account_payable_payment_auth_requests` | `findFirst` — [accounts-payable-payment-auth-requests.service.ts:150](../backend/src/modules/accounts-payable-payment-auth-requests/accounts-payable-payment-auth-requests.service.ts#L150) |
| `account_payable_payment_reversal_requests` | solo `findFirst` |
| `client_ownership_auth_requests` | solo `findFirst` |
| `cash_movement_void_requests` | solo `findFirst` |
| `refund_requests` | solo `findFirst` |

Consecuencia idéntica a la ya vista: notificación de WhatsApp duplicada y una
solicitud gemela que se queda PENDING para siempre en la bandeja.

### Corrección aplicada

**Una migración**, [20260906010000_unique_pending_request_indexes](../backend/prisma/migrations/20260906010000_unique_pending_request_indexes/migration.sql),
con diez índices parciales sobre nueve tablas (anulaciones de caja lleva dos: la
solicitud apunta a un movimiento o a un pago, nunca a los dos). El predicado de
cada índice replica exactamente el `where` del `findFirst` del servicio, así que
no se endurece ninguna regla de negocio: la garantía solo se mueve a donde la
carrera no existe.

`account_payable_payment_reversal_requests` quedó fuera y no le falta nada: ya
está cubierta por el UNIQUE global de `payment_auth_request_id`.

**El índice solo es la mitad.** Sin manejar el choque, la petición perdedora
recibe un P2002 crudo. Los nueve servicios ahora devuelven la solicitud gemela y
salen sin notificar — es lo que evita la segunda notificación de WhatsApp, que
era el síntoma visible del bug.

**El detector de P2002 estaba roto y había que arreglarlo primero.**
`isUniquePendingViolation` en el módulo de OG leía `meta.target`, que con el
adaptador `PrismaPg` viene vacío: el nombre de la restricción viaja en
`meta.driverAdapterError`. La rama nunca se ejecutaba, así que el índice de OG
bloqueaba el duplicado pero la petición gemela recibía un 500. Replicar ese
patrón nueve veces habría multiplicado el bug por nueve.

- [unique-violation.util.ts](../backend/src/common/utils/unique-violation.util.ts) — `isUniqueViolationOn` (busca sobre el meta completo) y `createOrReturnTwin`, que encapsula crear-o-devolver-la-gemela.
- Los tests de OG mockeaban el error con `meta.target`, la forma del motor nativo. Pasaban mientras producción fallaba. Ahora usan la forma real del adaptador.

**Verificación**: la migración corrió limpia contra la base de dev/staging y los
once índices quedaron creados (los diez nuevos más el de OG). No había
duplicados que limpiar ni en producción ni en dev, así que los `UPDATE` de
saneamiento fueron no-ops; quedan como red para el clon de Zoom, que sí va a
nacer con datos sembrados. 2521 tests pasan.

---

## 2. Consecutivos sin retry en 9 puntos de creación — **Alta** · ✅ Corregido

Solo dos servicios implementan el patrón sync+retry completo
([work-orders.service.ts:108](../backend/src/modules/work-orders/work-orders.service.ts#L108),
[quotes.service.ts:91](../backend/src/modules/quotes/quotes.service.ts#L91)) y
uno lo hace con un reintento suelto ([dtf.service.ts:99](../backend/src/modules/dtf/dtf.service.ts#L99)).

> **Corrección al conteo original.** Este hallazgo decía "9 puntos sin retry" e
> incluía la creación de OP. Estaba mal: `orders.service.create` y
> `expense-orders.service.create` **sí** tienen su bucle de reintento, escrito
> con `maxAttempts` en vez de `MAX_RETRIES`, y el grep con el que hice la
> auditoría solo buscaba el segundo nombre. El de órdenes cubre además el
> `CASH_RECEIPT` de sus abonos iniciales (`isReceiptNumberCollision`). Son
> **siete** los puntos desprotegidos, no nueve, y la corrección aplicada los
> cubre igual.

Sin ninguna protección contra P2002:

- [quotes.service.ts:303](../backend/src/modules/quotes/quotes.service.ts#L303) — `ORDER`, conversión de cotización
- [production-orders.service.ts:101](../backend/src/modules/production/production-orders.service.ts#L101) — `PRODUCTION_ORDER`

Y cinco emisores de `CASH_RECEIPT`, todos contra el índice único
`cash_movements_receipt_number_key`:
[cash-movement.service.ts:62](../backend/src/modules/cash-movement/cash-movement.service.ts#L62),
[expense-orders.service.ts:497](../backend/src/modules/expense-orders/expense-orders.service.ts#L497),
[accounts-payable.service.ts:425](../backend/src/modules/accounts-payable/accounts-payable.service.ts#L425),
[refund-requests.service.ts:303](../backend/src/modules/refund-requests/refund-requests.service.ts#L303),
[pending-cash-entries.service.ts:118](../backend/src/modules/cash-session/pending-cash-entries.service.ts#L118).

### Corrección aplicada

La idea inicial era un helper `generateWithRetry(type, fn)` en el servicio, pero
no sirve para la mitad de los casos: `cash-movement`, `orders` y
`production-orders` generan el número **dentro de una transacción**, y ahí el
reintento es imposible — el primer error aborta la transacción completa.

La corrección va entonces en el generador, no en los llamadores. `generateNumber`
ahora incrementa contra el mayor entre el contador y el máximo real de la tabla
destino, en una sola sentencia atómica:

```sql
last_number = GREATEST(contador_del_año, (SELECT MAX(...) FROM tabla_destino)) + 1
```

- [consecutives.repository.ts](../backend/src/modules/consecutives/consecutives.repository.ts) — `getNextNumber` acepta la tabla de origen; el `GREATEST` se evalúa con la fila del contador ya bloqueada, así que dos peticiones concurrentes siguen sin poder obtener el mismo número.
- [consecutives.service.ts](../backend/src/modules/consecutives/consecutives.service.ts) — `CONSECUTIVE_SOURCES`, un solo mapa que ahora comparten `generateNumber` y `syncCounter`.

Los 9 puntos de creación quedan corregidos sin tocarlos. Los bucles de reintento
que ya existían en `quotes`, `work-orders` y `dtf` se dejan como están: ahora son
redundantes, pero cubren el caso residual de una fila insertada por fuera del
contador justo entre el `MAX` y el `INSERT`. Quitarlos es limpieza opcional, no
parte de la corrección.

**Verificación contra producción** (solo lectura): la sentencia nueva produce
exactamente el mismo número que la anterior para los 8 tipos vivos — los
contadores están hoy en sincronía, así que el cambio es un no-op y solo se
activa cuando el contador queda atrás. Que es justo lo que va a pasar en Zoom al
sembrar la base.

| tipo | antes | después |
|---|---|---|
| ORDER | 2780 | 2780 |
| CASH_RECEIPT | 2866 | 2866 |
| WORK_ORDER | 620 | 620 |
| DTF_UV | 648 | 648 |
| EXPENSE | 492 | 492 |
| QUOTE | 288 | 288 |
| DTF_TEXTIL | 508 | 508 |
| PRODUCTION_ORDER | 7 | 7 |

### Dos cosas que aparecieron de paso

- `syncCounter('PRODUCTION')` apuntaba a la tabla `productions`, **que no existe
  en la base**. Nadie genera ese consecutivo, así que nunca reventó, pero era una
  bomba de tiempo. Ahora `PRODUCTION` está declarado como `null` explícito.
- En la tabla `consecutives`, el `prefix` de `EXPENSE` guarda `GAS` mientras el
  código usa `OG`. Es cosmético (el prefijo siempre se deriva del código, la
  columna nunca se lee para generar), pero se expone en `findAll()`. No lo toqué:
  corregirlo es un `UPDATE` de una fila en producción, mejor decidirlo aparte.

---

## 3. `useSingleFlight` está en 3 de ~104 formularios — **Media** · ✅ Corregido

El hook existe y tiene pruebas ([useSingleFlight.ts](../frontend/src/hooks/useSingleFlight.ts)),
pero solo lo usan `WorkOrderFormPage`, `ExpenseOrderFormPage` y
`ExpenseOrderDetailPage`. Hay 104 archivos `.tsx` que llaman `mutateAsync` y 74
que se apoyan en `disabled={isPending}`, que es justo el guard que no cierra la
carrera: entre el clic y el primer render con `isPending=true` caben dos envíos.

### El "3 de 104" subestimaba la protección y sobrestimaba la seguridad

Al ir a corregir aparecieron dos cosas que cambian el cuadro:

**Hay cinco formularios más con un candado equivalente escrito a mano**
(`submitting.current`): `RefundRequestDialog`, `StatusChangeAuthRequestDialog`,
`ApprovalReviewDialog`, `ExpenseOrderAuthRequestDialog` y `DuplicateClientDialog`.
Están protegidos; lo que sobra es el idioma duplicado. No los toqué: reescribir
un candado que funciona es churn, no corrección.

**Los formularios de React Hook Form NO estaban protegidos**, al contrario de lo
que afirmaba el propio comentario del hook. En react-hook-form 7.71.2,
`handleSubmit` emite `isSubmitting: true` y **ejecuta el handler igual**: no hay
guarda de reentrada (`createFormControl.handleSubmit`, `index.esm.mjs:2177`).
Dos clics en el mismo frame lo ejecutan dos veces. El comentario del hook decía
lo contrario y quedó corregido — era una suposición peligrosa justo en los
diálogos de dinero.

Lo verifiqué revirtiendo el arreglo en `VoidPaymentDialog`: con dos
`fireEvent.click` seguidos, `onSubmit` se llamaba **dos veces**. Con el hook,
una. Ese test quedó en el repo.

### Qué quedó protegido

Sin ningún candado, y ahora con uno — todos mueven dinero o crean solicitudes:

| Componente | Qué se disparaba dos veces |
|---|---|
| `PendingOgAuthorizationsPanel` | autorizar/rechazar OG en Caja |
| `PendingApAuthorizationsPanel` | aprobar/rechazar pago de CP |
| `PendingApReversalsCajaPanel` | confirmar reversión de pago |
| `PendingRefundRequestsPanel` | aprobar/rechazar devolución |
| `PendingVoidRequestsPanel` | aprobar/rechazar anulación |
| `AccountPayableAuthRequestDialog` | solicitud de autorización de CP |
| `OpenSessionPage` / `CloseSessionPage` | abrir y cerrar sesión de caja |
| `VoidPaymentDialog`, `VoidMovementDialog` | anular pago / movimiento |
| `RegisterPaymentDialog`, `RequestPaymentDialog` | registrar y solicitar pago de CP |
| `CreateMovementDialog` | movimiento de caja |
| `RequestEditPermissionButton`, `RequestAdvisorChangeButton` | solicitudes sobre la OP |

Los cinco últimos grupos son formularios de RHF: sin el hallazgo de arriba se
habrían dado por seguros.

**Pendiente, deliberadamente**: los ~80 formularios restantes (catálogos, roles,
productos, plantillas). Un duplicado ahí es una fila repetida que se borra, no
dinero movido dos veces.

---

## 4. La llave de idempotencia solo existe en órdenes de gasto — **Media** · ✅ Corregido

`idempotencyKey` está implementada de punta a punta únicamente en
[expense-orders.service.ts:91](../backend/src/modules/expense-orders/expense-orders.service.ts#L91).
Creación de OP, pagos y abonos no la tienen, y son los flujos donde un duplicado
cuesta dinero real, no una notificación repetida.

### Corrección aplicada

Migración [20260906020000_order_and_payment_idempotency_key](../backend/prisma/migrations/20260906020000_order_and_payment_idempotency_key/migration.sql):
`idempotency_key` con índice único en `orders` y en `payments`. NULL no colisiona
con NULL en Postgres, así que las filas históricas y cualquier cliente que no
mande la llave siguen entrando.

De punta a punta, igual que en OG: lectura previa (check-then-act) + captura del
P2002 contra el índice, que devuelve el registro gemelo en vez de crear otro.

**Por qué hacía falta además del candado del hallazgo 3**: `useSingleFlight` vive
en el navegador y solo cubre el doble clic dentro de esa pestaña. No cubre el
reintento de red, dos pestañas abiertas, ni un cliente viejo en caché. La llave
sí, porque la garantía está en la base.

**Dónde vive la llave en el frontend**:

- OP — `useRef(crypto.randomUUID())` al montar el formulario. La página se
  desmonta al crear, así que una llave por formulario alcanza.
- Abono — se **regenera cada vez que se abre el diálogo**
  ([OrderDetailPage.tsx:252](../frontend/src/features/orders/pages/OrderDetailPage.tsx#L252)).
  Una llave fija por página haría que el segundo abono legítimo a la misma orden
  devolviera el primero en lugar de registrarse. El diálogo de edición no la usa:
  edita por `PUT`, no crea.

**Verificación**: los dos índices quedaron creados en dev/staging. 2527 tests
pasan, incluidos cuatro nuevos para OP (devolver la gemela, persistir la llave,
perder la carrera contra el índice, y **no interferir con el reintento por
consecutivo duplicado**, que convive en el mismo `catch`) y dos para abonos.

---

## 5. `filter-notifications.dto.ts` convierte `'false'` en `true` — **Baja (latente)**

[filter-notifications.dto.ts:26](../backend/src/modules/notifications/dto/filter-notifications.dto.ts#L26)
usa `@Type(() => Boolean)` sin `@Transform`, y `Boolean('false') === true`.
`GET /notifications?isRead=false` devuelve las leídas. Los demás filtros
booleanos del proyecto ya traen el `@Transform` correcto (órdenes, clientes,
movimientos de caja, cuentas por pagar), así que es el único que quedó fuera.

---

## Revisado y sin hallazgos

- **`.env.example`**: backend y frontend están completos y al día. El diff
  contra las variables usadas en código no arroja faltantes. Un punto menos de
  riesgo para el arranque del clon.
- **Borrado de pagos vs. caja**: el único `payment.delete` del backend
  ([advance-payment-approvals.service.ts:170](../backend/src/modules/advance-payment-approvals/advance-payment-approvals.service.ts#L170))
  anula el `CashMovement` y libera el saldo a favor antes de borrar. Correcto.
- **URLs prefirmadas**: no hay `getFileUrl` dentro de bucles. `company.service`
  hace dos llamadas sueltas para los logos, aceptable.

---

## Orden sugerido

1. Hallazgo 2 (helper de consecutivos) — es refactor acotado y toca 9 sitios.
2. Hallazgo 1 (índices parciales) — 10 migraciones del mismo molde.
3. Hallazgo 3 y 4 sobre los flujos de dinero.
4. Hallazgo 5, de una línea.

Los cuatro primeros son los que el clon heredaría y multiplicaría por dos.
