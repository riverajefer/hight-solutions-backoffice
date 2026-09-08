# Propuesta — Devolución habilitada para todas las OP

**Fecha:** 2026-09-07 · **Estado:** implementado y verificado en desarrollo · **Autor:** análisis técnico

## 1. Lo que pide el cliente

> "Es importante que salga el ítem de devolución para todas las OP. Que soliciten permiso por gerencia y luego yo pueda poder realizar el pago de la devolución. Entiendo que solo está habilitado para saldo a favor. Pero hay casos donde se va la luz, se retrasan los trabajos, entre otros, y por eso el cliente pide devolución."

Tres requisitos:

1. El botón **Devolución** debe estar disponible en toda OP, no solo en las que tienen saldo a favor.
2. La devolución la **autoriza gerencia** (ya existe ese circuito).
3. **Después** de la autorización, **Caja** registra el pago de la devolución.

## 2. Cómo funciona hoy

El módulo `refund-requests` ya tiene el circuito completo de aprobación: notificación in‑app, WhatsApp con la plantilla `solicitud_aprobacion_v1`, WebSocket, bandeja en Caja y permisos `create_refund_requests` / `approve_refunds`.

Lo que lo limita son **dos validaciones**, no la arquitectura:

| Punto | Archivo | Regla actual |
|---|---|---|
| Botón oculto | `frontend/src/features/orders/pages/OrderDetailPage.tsx:954` | `canCreateRefund` exige `hasOverpayment` |
| Rechazo en backend | `backend/src/modules/refund-requests/refund-requests.service.ts:161` | `computeAvailableOverpayment() <= 0` → 400 "La orden no tiene saldo a favor para devolver" |

Y un tercer punto que hoy no se nota pero se va a notar apenas gerencia empiece a aprobar de noche:

| Punto | Archivo | Problema |
|---|---|---|
| Aprobar = pagar | `refund-requests.service.ts:290` | `approve()` exige sesión de caja abierta y crea el egreso en el acto. Si gerencia aprueba por WhatsApp con la caja cerrada, **la aprobación falla**. |

## 3. El problema de fondo: no toda devolución es igual

Hoy "devolución" significa **devolver un excedente**: el cliente pagó de más, esa plata nunca fue una venta, y por eso basta con bajar `paidAmount`.

Lo que pide el cliente es otra cosa: **deshacer una venta** (total o parcialmente) porque el trabajo no se entregó o no cumplió. Si eso se procesa con la lógica actual pasa lo siguiente:

```
Total OP:      $500.000
Pagado:        $500.000   → balance $0
Devolución:    $500.000   → paidAmount 0, balance = 500.000 - 0 = $500.000
```

**La OP queda debiendo $500.000.** No es un detalle cosmético:

- `dashboard.repository.ts:34` suma `Order.balance` de las OP en estados activos → esa deuda fantasma entra a **cartera por cobrar**.
- Alguien va a salir a cobrarle a un cliente al que se le devolvió la plata.
- `dashboard.repository.ts:10` suma `Order.total` de todo lo que no es `ANULADO` → la venta **sigue contando como ingreso** aunque el dinero salió de la caja.

Conclusión: no alcanza con quitar el `if`. Hay que decirle al sistema **qué se devolvió**.

## 4. La idea central: separar el dinero de la venta

Una devolución tiene **dos cifras que hoy el sistema confunde en una sola**:

| Cifra | Qué significa | Tope |
|---|---|---|
| `refundAmount` | Dinero que **sale de la caja** hacia el cliente | lo que el cliente haya abonado (`paidAmount` neto) |
| `reversedAmount` | Valor de la **venta que se anula** | el total de la OP |

No son el mismo número, y el caso más común lo demuestra:

```
Total OP $500.000 · abonado $200.000 · el trabajo sale mal y se cae la venta completa
  → reversedAmount = $500.000   (la venta se anula entera)
  → refundAmount   = $200.000   (solo se devuelve lo que el cliente puso)
  → balance = (500.000 - 500.000) - 0 = $0   ✅ el cliente no queda debiendo nada
```

Con una sola cifra, ese caso es irrepresentable: si solo registras los $200.000 devueltos, la OP sigue mostrando $300.000 por cobrar de un trabajo que ya no existe.

### 4.1 Una fórmula que cubre los dos escenarios

El usuario indica **cuánto de la venta se anula**, y el sistema calcula solo **cuánto dinero hay que devolver**:

```
dinero disponible para devolver = excedente después de anular la venta
                                = max(0, paidAmount - (total - reversedAmount) + appliedCredit)
```

Es literalmente `computeAvailableOverpayment(total - reversedAmount, paidAmount, appliedCreditAmount)`. Y lo elegante es que **el caso de hoy es este mismo caso con `reversedAmount = 0`**: no hay dos flujos, hay uno solo con un parámetro nuevo. La devolución por saldo a favor sigue funcionando exactamente igual.

Por eso **no hace falta un enum de tipo de devolución**: se deriva. `reversedAmount = 0` es saldo a favor; `> 0` es reversión de venta. Lo que sí se agrega es un **motivo tipificado** (`refundReason`: calidad, incumplimiento de tiempo, fuerza mayor, arrepentimiento del cliente, otro) además de la observación libre que ya es obligatoria — sin eso, en seis meses nadie puede responder "¿cuánto devolvimos por calidad?".

### 4.2 Que el balance no mienta

Nueva columna `Order.reversedAmount Decimal @default(0)`, distinta de `refundedAmount` (que acumula **todo** lo devuelto y ya se usa para que los recálculos de `paidAmount` no resuciten plata).

La fórmula canónica en `computeOrderBalance()` pasa a ser:

```
balance = (total - reversedAmount) - paidAmount + appliedCreditAmount
```

Al ser un cambio dentro de la utilidad central, los cuatro servicios que ya la usan (`orders`, `payment-edit-approvals`, `advance-payment-approvals`, `cash-movement`) quedan coherentes sin tocarlos uno por uno.

## 5. Respuesta a "devolución parcial de una OP ya entregada"

**Propuesta: el estado no cambia, cambia el valor de la venta.** Se entregaron 100 de 200 piezas y las otras 100 salieron mal:

```
Total OP $500.000 · pagado $500.000 · se anulan $200.000 del trabajo
  → reversedAmount = $200.000
  → refundAmount   = $200.000
  → balance = (500.000 - 200.000) - 300.000 = $0
  → estado: sigue DELIVERED  ← la entrega ocurrió, y ocurrió sobre la mitad buena
```

La regla es una sola línea: **la OP pasa a `RETURNED` solo cuando `reversedAmount` acumulado llega al total.** Mientras sea parcial, conserva su estado, porque marcar como devuelta una orden que sí se entregó a medias es mentirle al historial y al asesor. La devolución parcial se ve con un chip derivado de `reversedAmount > 0`, no con un estado.

Tres consecuencias de diseño que caen de ahí:

1. **`RETURNED` hay que activarlo.** Existe en el enum de la base pero es **inalcanzable**: `order-status-transitions.ts:18` no tiene ninguna transición que lleve ahí, y el frontend ni siquiera lo declara (`order.types.ts:5`). A diferencia de `ANULADO`, deja el rastro de que hubo venta y hubo devolución.
2. **El bloque de totales de la OP muestra la devolución**, igual que hoy muestra "Saldo a favor del cliente": `Total $500.000 · Devolución $200.000 · **Valor neto $300.000**`. Sin esa línea el usuario ve un total que no cuadra con lo que pagó.
3. **No se seleccionan ítems, se ingresa un monto.** Devolver "el ítem 3" obligaría a tocar la OT, producción e inventario, y a decidir qué pasa con un ítem a medio producir. Para lo que el cliente describe (el UV salió mal, se fue la luz) el monto más el motivo alcanzan. Si más adelante hace falta el detalle por ítem, este modelo lo admite encima sin rehacerse.

## 6. Decisiones ya tomadas por el cliente

### 6.1 La devolución la paga Caja

Se separa autorizar de pagar — que es exactamente lo que el cliente describió. Se logra **sin tocar el enum de estados**, usando los campos que ya existen:

```
PENDING  →  APPROVED (executedAt = null)  →  APPROVED (executedAt + cashMovementId)
   ↑              ↑                                    ↑
 asesor       gerencia autoriza                   Caja paga
              (no exige caja abierta)             (exige sesión abierta)
```

- `approve()` deja de crear el `CashMovement` y de exigir sesión de caja → gerencia aprueba desde WhatsApp a cualquier hora.
- Nueva acción `execute()`: crea el `CashMovement` EXPENSE, baja `paidAmount`, sube `refundedAmount` y `reversedAmount`, recalcula `balance` y aplica la regla de estado.
- La bandeja de Caja pasa a tener dos secciones: *Pendientes de autorización* y ***Autorizadas pendientes de pago***.
- Permiso nuevo **`execute_refunds`** para Caja (gerencia autoriza, Caja paga). Obliga a tocar los tres archivos de siempre: `sync-permissions.ts`, `permission-labels.ts` y `PermissionsSelector.tsx`.
- Guarda contra doble ejecución: `executedAt IS NULL` dentro del `WHERE` del update, no solo un `findFirst` previo. Aprobar dos veces movería el dinero dos veces.

### 6.2 La comisión del asesor se resta

Aquí hay un detalle que hay que resolver bien. La base comisionable no es el total: es **`subtotal - discountAmount`** de las OP entregadas con `balance <= 0` (`orders.service.ts:316`). Es decir, base **sin IVA y sin el redondeo comercial** del total.

Eso trae dos trampas:

1. **Una devolución total deja `balance = 0`.** Si la OP siguiera en `DELIVERED`, seguiría comisionando el subtotal completo. Se resuelve con la regla de `RETURNED`: ese estado no está en `DELIVERED_ORDER_STATUSES`, así que sale sola del cálculo. **Hay que excluirla también de la consulta de "brecha"** (`orders.service.ts:322`), o aparecería como "pagada pendiente de entregar".
2. **Una devolución parcial no cambia el estado**, así que sigue comisionando el subtotal completo. Restar `reversedAmount` directamente sería incorrecto: está en pesos con IVA y la base está sin IVA.

Solución: al ejecutar se guarda también **`Order.reversedNetAmount`**, la porción anulada llevada a la misma moneda de la comisión:

```
reversedNetAmount += reversedAmount × (subtotal - discountAmount) / total
```

y la base pasa a ser `sum(subtotal) - sum(discountAmount) - sum(reversedNetAmount)`. Se mantiene como `_sum` en el `groupBy` de Prisma, así que no hay que rehacer la consulta ni cambiar cómo se liquida.

**Confirmado por el cliente:** el descuento se aplica sobre la **quincena en curso**. Si la comisión ya se pagó en un período anterior, no se reabre esa liquidación: la resta cae en la quincena que esté abierta al momento de pagar la devolución.

### 6.3 La devolución resta de las ventas del mes

**Confirmado por el cliente.** El total de ventas del dashboard pasa a descontar `reversedAmount` (`dashboard.repository.ts:10`). Hoy una OP devuelta seguiría contando como venta completa aunque el dinero salió de la caja.

### 6.4 Estado final: `RETURNED`, etiqueta "Devolución de dinero"

**Confirmado por el cliente.** Se reutiliza el valor `RETURNED` que ya existe en el enum de la base, con la etiqueta **"Devolución de dinero"** en la UI y color `error`. La etiqueta habla de dinero y no de mercancía, que es lo que realmente ocurre en estos casos: el material no vuelve, vuelve la plata.

**El estado cambia cuando Caja paga, no cuando gerencia autoriza.** El estado refleja hechos consumados. Entre la autorización y el pago la OP conserva su estado y se muestra con banner y chip *"Devolución autorizada, pendiente de pago"*. Si ese momento fuera un estado, la OP saldría de cartera y de la comisión con el dinero todavía en caja, y volvería a entrar si la devolución se cancela: la cartera y la comisión oscilarían por una OP que no ha cambiado de hecho.

Lo que hay que tocar para activarlo:

| Archivo | Cambio |
|---|---|
| `backend/.../order-status-transitions.ts` | `RETURNED` alcanzable desde los estados que admiten devolución; sigue siendo terminal (`[]`) |
| `frontend/src/types/order.types.ts:5` | Agregar `'RETURNED'` al tipo y a `ORDER_STATUS_CONFIG` con la etiqueta y el color |
| `orders.service.ts:322` | Excluir `RETURNED` de la consulta de "brecha", o aparecería como pagada pendiente de entregar |

La transición la ejecuta el sistema al pagar la devolución total, no el usuario desde el selector de estados.

### 6.5 Rastro en la OP: timeline y comprobante

Dos adiciones pedidas durante la implementación.

**La devolución entra al "Historial de Aprobaciones y Solicitudes de Autorización".** Se suma como sexta fuente del endpoint `GET /orders/:id/authorization-history`, junto a anticipos, descuentos, propiedad de cliente, edición y anulación de pagos. Muestra los **tres hitos**, porque autorizar y pagar son actos distintos:

```
Solicitó autorización para una devolución de $ 45.000, anulando $ 595.000 de la venta.
Motivo: el UV salió con mala resolución
Autorizada por: Laura Maldonado · 7 sept, 07:32 p. m.
Pendiente de pago en Caja — el dinero aún no ha salido.     ← o "Pagada en caja por: …"
```

El chip de estado no dice "Aprobada" en una devolución: dice **"Autorizada · falta pago"** o **"Pagada"**. Decir "aprobada" haría creer que la plata ya salió cuando puede seguir en la caja.

**Comprobante de la transferencia.** Una devolución en efectivo queda soportada por el recibo de caja que genera la ejecución, pero una por transferencia no deja rastro dentro del sistema: el soporte vive en la app del banco. Cuando el método es *Transferencia* se puede adjuntar imagen o PDF, o pegar un pantallazo con Ctrl+V.

Se adjunta en **dos momentos**, porque son dos cosas distintas:

| Campo | Quién lo adjunta | Qué documenta |
|---|---|---|
| `receiptFileId` | Quien solicita, en el formulario de devolución | Una transferencia que **ya se hizo** y que la solicitud viene a documentar |
| `executionReceiptFileId` | Caja, en el diálogo de *Pagar devolución* | La transferencia que **acaba de hacer** al ejecutar |

Son dos columnas y no una porque con un solo campo el segundo comprobante borraría al primero. Es el mismo patrón que ya usa `account_payable_payments`, que también guarda dos.

En el timeline, cuando existen ambos aparecen como *"Comprobante de la solicitud"* y *"Comprobante del pago"*; cuando hay uno solo, el rótulo genérico *"Ver comprobante de la transferencia"*.

> En los dos casos el archivo se sube **antes** de la operación: si la subida falla, no queda una solicitud apuntando a un comprobante inexistente, ni un egreso hecho sin su soporte.

## 7. Alcance estimado

| Capa | Trabajo |
|---|---|
| Prisma | `refundReason` y `reversedAmount` en `RefundRequest`; `reversedAmount` y `reversedNetAmount` en `Order`; migración idempotente |
| Backend | `computeOrderBalance()` + tests; `create()` con la fórmula unificada; `approve()` sin movimiento de caja; `execute()` nuevo con permiso `execute_refunds`; transición automática a `RETURNED`; exclusión de `RETURNED` en la consulta de brecha; base comisionable neta |
| Frontend | Botón siempre visible; diálogo con monto de venta anulada + motivo + dinero calculado; bandeja de Caja con la sección de pendientes de pago; línea de devolución en el bloque de totales; `RETURNED` en el tipo y en `ORDER_STATUS_CONFIG`; banners y chips en el detalle de OP |
| Permisos | `execute_refunds` en los tres archivos obligatorios |
| Reportes | Restar `reversedAmount` de ventas (§6.3) |
| Tests | `order-balance.util.spec.ts`, `refund-requests.service.spec.ts`, hook del frontend |

## 8. Estado de las decisiones

| # | Decisión | Resultado |
|---|---|---|
| 1 | ¿Quién paga la devolución? | **Caja**, con permiso `execute_refunds`, después de que gerencia autoriza |
| 2 | ¿La comisión se resta? | **Sí**, sobre la **quincena en curso**; no se reabren períodos ya liquidados |
| 3 | ¿Resta de las ventas del mes? | **Sí** |
| 4 | ¿Devolución parcial de una OP entregada? | **Conserva su estado**; solo la devolución total cambia el estado |
| 5 | ¿Estado final y en qué momento? | **`RETURNED` — "Devolución de dinero"**, al momento en que **Caja paga** |

Sin decisiones pendientes.

## 9. Verificación en desarrollo

Se ejecutó el ciclo completo contra la base de desarrollo, con estos resultados:

| Escenario | Resultado |
|---|---|
| Solicitar devolución en una OP pagada **sin saldo a favor** | Aceptada (antes devolvía 400) |
| Gerencia autoriza **con la caja cerrada** | Aceptada, sin mover dinero (antes fallaba) |
| Reversión parcial de $3.000 sobre una OP de $6.300 | `balance` 0, estado intacto, sin deuda fantasma |
| Anular más venta de la vigente | Rechazado con el valor vigente en el mensaje |
| Devolver más de lo abonado | Rechazado con el disponible en el mensaje |
| Reversión total acumulada | Estado `RETURNED`, `balance` 0 |
| **OP de $595.000 con $150.000 abonados que se cae entera** | Se anulan $595.000, salen $150.000, `balance` 0 — el cliente no queda debiendo los $445.000 |
| Prorrateo a la base comisionable | `reversedNetAmount` = $500.000 sobre un total de $595.000 (la base sin IVA, no el total) |
| Pagar dos veces la misma devolución | 409 `Esta devolución ya fue pagada` |
| Ciclo completo desde la UI (Caja → Pagar) | Egreso `RC-2026-0296`, OP en `RETURNED`, bandeja vacía |
| Devolución en el timeline de la OP | Aparece con sus tres hitos y el chip correcto en ambos estados |
| Comprobante de transferencia (solicitud) | Sube, se guarda en la solicitud y se abre desde el timeline con URL prefirmada |
| Comprobante de transferencia (pago en Caja) | Se adjunta desde el diálogo de pago y queda en un campo aparte: los dos archivos conviven y cada botón abre el suyo |
| Ventas del mes | Agosto: $3.987.000 brutos − $1.071.000 anulados = **$2.916.000**, que es lo que reporta el dashboard |

Pruebas automatizadas: **2.609 backend** y **408 frontend**, todas en verde.

### Tres hallazgos durante la verificación

1. El frontend tenía **su propia copia de la fórmula del balance** en `pendingAdvance.ts`, que el backend ya no permite olvidar (el parámetro es obligatorio) pero la UI sí: una OP devuelta mostraba "Saldo a cobrar $595.000" con el balance real en cero. Corregido y cubierto con pruebas.
2. El chip **"Autorizada · falta pago" se filtraba a otros tipos de evento**: le faltaba el guard por tipo, así que un anticipo aprobado también lo mostraba. Solo se ve en la app, no en las pruebas unitarias.
3. El detalle de la OP cargaba únicamente las devoluciones en estado `PENDING`, así que el banner de "autorizada pendiente de pago" nunca se habría mostrado. El select ahora trae también las aprobadas sin ejecutar.

### Datos de prueba

Quedaron tres OP de desarrollo con devoluciones aplicadas, todas con observaciones que empiezan por `PRUEBA CLAUDE`: OP-2026-0273, OP-2026-0293 y OP-2026-0296.

## 10. Pendiente para producción

1. Ejecutar las migraciones `20260907000000_refund_sale_reversal`, `20260907010000_refund_receipt_file` y `20260907020000_refund_execution_receipt` (las tres idempotentes).
2. Ejecutar `npm run prisma:sync:permissions` para publicar `execute_refunds`.
3. **Asignar `execute_refunds` al rol de Caja desde la UI de Roles.** El script solo lo asigna al rol `admin`; sin este paso la bandeja de pago no le aparece a Caja.
4. Decidir si `approve_refunds` sigue en el rol de Caja o pasa solo a gerencia: hoy Caja lo tiene, así que un mismo usuario podría autorizar y pagar.

### Una observación sobre la sesión de caja

`execute()` registra el egreso en **cualquier sesión abierta**, no necesariamente la del usuario que paga. Es el mismo comportamiento que ya tenía `approve()`, así que no es una regresión, pero con dos cajas simultáneas el movimiento podría caer en el arqueo equivocado. Vale la pena revisarlo aparte.

Sin sorpresas de arquitectura: el circuito de aprobación (WhatsApp, WS, notificaciones, bandeja, permisos) ya está construido y se reutiliza tal cual.
