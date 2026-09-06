# Auditoría Fase 0 — antes del fork para Zoom

Fecha: 2026-09-06 · Rama: `develop` · Commit base: `1b997c6`

Objetivo: encontrar los bugs que el clon se llevaría intactos. Todo lo que quede
sin corregir aquí se corrige dos veces a partir del fork.

Cada hallazgo lleva evidencia en el código. No se hizo ningún cambio.

---

## 1. El índice único parcial existe en 1 de 11 tablas de solicitudes — **Alta**

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

**Corrección**: una migración por tabla siguiendo el molde de la de OG (limpiar
duplicados existentes marcándolos `EXPIRED`, luego crear el índice parcial).

---

## 2. Consecutivos sin retry en 9 puntos de creación — **Alta** · ✅ Corregido

Solo dos servicios implementan el patrón sync+retry completo
([work-orders.service.ts:108](../backend/src/modules/work-orders/work-orders.service.ts#L108),
[quotes.service.ts:91](../backend/src/modules/quotes/quotes.service.ts#L91)) y
uno lo hace con un reintento suelto ([dtf.service.ts:99](../backend/src/modules/dtf/dtf.service.ts#L99)).

Sin ninguna protección contra P2002:

- [orders.service.ts:552](../backend/src/modules/orders/orders.service.ts#L552) — `ORDER`, la creación de OP
- [quotes.service.ts:303](../backend/src/modules/quotes/quotes.service.ts#L303) — `ORDER`, conversión de cotización
- [production-orders.service.ts:101](../backend/src/modules/production/production-orders.service.ts#L101) — `PRODUCTION_ORDER`

Y los seis emisores de `CASH_RECEIPT`, todos contra el índice único
`cash_movements_receipt_number_key`:
[cash-movement.service.ts:62](../backend/src/modules/cash-movement/cash-movement.service.ts#L62),
[orders.service.ts:687](../backend/src/modules/orders/orders.service.ts#L687),
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

## 3. `useSingleFlight` está en 3 de ~104 formularios — **Media**

El hook existe y tiene pruebas ([useSingleFlight.ts](../frontend/src/hooks/useSingleFlight.ts)),
pero solo lo usan `WorkOrderFormPage`, `ExpenseOrderFormPage` y
`ExpenseOrderDetailPage`. Hay 104 archivos `.tsx` que llaman `mutateAsync` y 74
que se apoyan en `disabled={isPending}`, que es justo el guard que no cierra la
carrera: entre el clic y el primer render con `isPending=true` caben dos envíos.

**Corrección**: no hace falta migrar los 104. Priorizar los que crean dinero o
solicitudes: pagos, abonos, OP, CP, solicitudes de autorización y anulaciones.

---

## 4. La llave de idempotencia solo existe en órdenes de gasto — **Media**

`idempotencyKey` está implementada de punta a punta únicamente en
[expense-orders.service.ts:91](../backend/src/modules/expense-orders/expense-orders.service.ts#L91).
Creación de OP, pagos y abonos no la tienen, y son los flujos donde un duplicado
cuesta dinero real, no una notificación repetida.

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
