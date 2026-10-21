# Saneamiento: IVA de las Órdenes de Gasto pagado por Caja y sin registrar

**Fecha:** 2026-10-19 · **Estado:** script (fases 1 y 2) listo y probado en local; **nada aplicado en producción**.

## Qué pasó

Hasta el 2026-10-19, al autorizar Caja una Orden de Gasto (`ExpenseOrdersService.cajaAuthorize`), cada egreso de caja se registraba con la **base del ítem** (`item.total`, sin IVA ni retenciones). La OG le mostraba a Caja el total con IVA y Caja entregaba ese total. Consecuencias:

1. **La Cuenta por Pagar espejo quedaba debiendo el IVA.** `settleFromExpenseOrderMovements` reflejaba los egresos (la base) como abonos de la CP, así que la CP quedaba `PARTIAL` u `OVERDUE` con saldo = IVA − retenciones: una deuda que no existe.
2. **El IVA pagado en efectivo salió del cajón sin asiento.** Cada arqueo con una de esas OG quedó corto por ese IVA.

El código ya está corregido en `develop` (`allocateExpenseTotalToItems` en `backend/src/common/utils/expense-totals.util.ts`): cada egreso lleva su parte del total. **Mientras ese cambio no esté desplegado, cada OG con IVA que Caja autorice en producción sigue creando un caso nuevo** (el 2026-10-19 en la mañana eran 133; en la tarde, 137).

## El script

`backend/scripts/sanitize-ap-iva-paid-via-expense-order.ts`. Corre las dos fases en orden; `--fase=1` o `--fase=2` para una sola.

### Fase 1 — la Cuenta por Pagar

- Por cada CP que califica registra un **abono de ajuste por el saldo exacto**, uno por método de pago de los egresos de la OG, **sin movimiento de caja**, con referencia `AJUSTE-IVA-<OG>` y la nota: *«Saneamiento 2026-10: IVA entregado por Caja al autorizar la Orden de Gasto OG-… El egreso de esa autorización (RC-…) se registró solo por la base del ítem, sin IVA; este abono refleja la diferencia…»*. Fecha del abono: la de la autorización de Caja; registrado por: quien autorizó en Caja.
- Recalcula `paidAmount`/`balance`/`status` desde los abonos vivos y exige que el saldo quede en $0 (si no, revierte esa CP).
- No toca la caja: eso es la fase 2.
- Cada CP va en su propia transacción y se vuelve a leer antes de escribir: si alguien la pagó o la anuló entre el dry-run y el `--apply`, se salta.
- Idempotente: una CP saneada queda `PAID` y deja de calificar.

### Fase 2 — la caja (opción A, elegida por el usuario el 2026-10-19)

A cada abono `AJUSTE-IVA-…` **en efectivo** que no tenga movimiento le crea su egreso de caja, en la caja contable «Ajustes Históricos» (la misma de `sanitize-historic-orphan-payments.ts`; se crea inactiva si no existe — en PRD aún no existe):

- **Ninguna sesión original se reabre ni se toca.** Sus arqueos firmados quedan iguales; el faltante queda explicado en un asiento aparte.
- Una sesión por mes (hora de Colombia) del egreso original, **nacida `CLOSED`** (una abierta sería tomada por `findFirst({ status: 'OPEN' })`). `openingAmount = 0`, `closingAmount = systemBalance = −egresos`, `discrepancy = 0`, `openedAt = closedAt` = último segundo del mes, o el momento de aplicar si el mes no ha terminado. La nota dice que es un asiento contable, no un arqueo físico.
- Cada egreso: `EXPENSE`, `CASH`, el monto del abono, `referenceType = 'ACCOUNT_PAYABLE'` y `referenceId` = la CP (como cualquier pago de CP), vinculado al abono por `cashMovementId`, hecho por quien autorizó la OG en Caja, con fecha del cierre de la sesión de ajuste y una descripción que nombra la CP, la OG, el recibo original y la fecha de su sesión. **Nunca `EXPENSE_ORDER`:** `settleFromExpenseOrderMovements` y `sanitize-ap-paid-via-expense-order.ts` lo tomarían como egreso de la OG y lo sumarían otra vez a la CP (probado en local: el script viejo no los toma).
- Recibos `AJU-YYYY-NNNNN` continuando el mayor `AJU-` existente, para no consumir la secuencia real `RC-`.
- Una transacción por mes; el enlace se hace solo si el abono sigue vivo y sin movimiento, y si no cuadran todos se revierte el mes entero.
- Las transferencias no tienen fase 2: no pasan por el cajón.

### Ambas fases

- Dry-run por defecto y con la sesión de base de datos en **solo lectura** (no puede escribir aunque quisiera). `--apply` para escribir, `--ap=CP-…` para una sola, `--env=` para el ambiente, `--detalle` para listar todas.
- En dry-run, la fase 2 proyecta también los abonos que crearía la fase 1.

### Qué califica

OG en `PAID`, CP ni `PAID` ni `CANCELLED`, no es anticipo de nómina, todos sus abonos son reflejo de los egresos de la OG y todos esos egresos están reflejados, los egresos suman exactamente la base de la OG (la firma del bug), el saldo es total − pagado y es positivo, y el total de la CP coincide con el de la OG (`computeExpenseTotals`) con tolerancia menor a $1 para las CP viejas que guardaban centavos.

## Dry-run en producción (2026-10-19, solo lectura)

| | CP | Saldo que se cierra |
|---|---:|---:|
| Total de la CP igual al de la OG | 76 | $2.720.416,91 |
| Total de la CP con centavos (diferencia < $1 contra la OG) | 60 | $935.394,80 |
| **A sanear** | **136** | **$3.655.811,71** |
| — de ellas `PARTIAL` | 50 | $1.689.621,05 |
| — de ellas `OVERDUE` | 86 | $1.966.190,66 |
| Abonos de ajuste en efectivo | 100 | $1.265.813,51 |
| Abonos de ajuste por transferencia | 36 | $2.389.998,20 |

Ninguna OG candidata mezcla métodos de pago, así que cada CP recibe un solo abono.

**Excluida (1):** `CP-2026-1005` / `OG-2026-0707` — alguien ya pagó el IVA aparte ($1.043 en efectivo, con su movimiento de caja) y quedó un residuo de **$0,81** por los centavos de la base. No es este bug: es una CP atrapada por centavos (invariante `cp_atrapadas_por_centavos`); se resuelve por separado.

**Caso a saber:** `CP-2026-1026` / `OG-2026-0725` (IVA $156.471 por transferencia). Su egreso guarda `823529.0000000001` por un error de punto flotante en el precio unitario; el script compara a centavos y la incluye.

### Fase 2 en producción (mismo dry-run)

Crearía la caja «Ajustes Históricos» y **5 sesiones cerradas con 100 egresos en efectivo por $1.265.813,51**:

| Mes | Egresos | Monto |
|---|---:|---:|
| 2026-06 | 1 | $2.315,91 |
| 2026-07 | 23 | $314.221,81 |
| 2026-08 | 35 | $360.491,66 |
| 2026-09 | 17 | $170.770,42 |
| 2026-10 | 24 | $418.013,71 |

Ese efectivo salió de **41 sesiones de la Caja Principal** del 2026-06-24 al 2026-10-19: 40 cerradas ($1.222.959,11; las más grandes 2026-10-02 con $257.339, 2026-07-14 con $99.387, 2026-09-02 con $86.625, 2026-08-27 con $83.781,50 y 2026-08-31 con $79.863) y la abierta hoy ($42.854,64, 5 OG). El detalle por sesión lo imprime la fase 1 del dry-run.

**Sesión abierta de hoy:** su IVA ya va incluido en la sesión de ajuste de octubre. Caja **no** debe registrar además un egreso manual por esos $42.854,64, o quedaría contado dos veces. El arqueo de hoy cierra corto por ese monto y el ajuste lo explica.

> Contexto: la revisión antifraude de octubre encontró arqueos con −$26,8M netos acumulados. Este IVA explica ~$1,22M de eso; el resto sigue pendiente.

## Orden sugerido para aplicar

1. Desplegar el fix de `cajaAuthorize` a producción (si no, siguen apareciendo casos).
2. Backup desde la raíz: `./backend/scripts/backup-db.sh --env=production`.
3. Desde `backend/`, dry-run: `npx ts-node scripts/sanitize-ap-iva-paid-via-expense-order.ts --env=production --detalle`
4. Una sola: `… --env=production --ap=CP-2026-196 --apply` y revisarla en la pantalla de Cuentas por Pagar.
   Si su abono es en efectivo, esa misma corrida crea la sesión de ajuste de su mes con ese único egreso; las demás CP de ese mes irán a otra sesión de ajuste del mismo mes al correr todas (es aceptable, pero si se prefiere una sesión por mes, probar con `--fase=1 --ap=…` y dejar la fase 2 para la corrida completa).
5. Todas: `… --env=production --apply`
6. Verificar: un nuevo dry-run debe dar 0 a sanear (solo la excluida) y «sin egreso: 0»; `./scripts/db-invariants.sh` sin CP descuadradas; en Caja, la caja «Ajustes Históricos» con sus sesiones cerradas.
7. Si después del despliegue aparece algún caso nuevo (OG autorizadas antes del despliegue), se vuelve a correr: es idempotente. Si aún estamos en el mismo mes, quedará una segunda sesión de ajuste para ese mes.

## Pendiente fuera de este script

`sanitize-historic-orphan-payments.ts` numera sus recibos `AJU-YYYY-NNNNN` empezando siempre en 00001. Si se aplica en producción **después** de este saneamiento, chocaría con los recibos `AJU-2026-00001…00100` y fallaría por recibo duplicado (sin dañar datos: la transacción del mes se revierte). Antes de usarlo hay que hacer que continúe la secuencia existente, como lo hace la fase 2 de este script.

## Prueba en local (2026-10-19)

Contra la base local de Docker, con casos armados a mano que reproducen el bug: IVA en efectivo, IVA con retefuente 2,5 % por transferencia, CP con total en centavos, OG con dos métodos de pago (efectivo + transferencia, el ajuste se partió $2.470 + $1.330), y dos que deben excluirse (abono propio aparte y total de CP distinto al de la OG). Resultado: las 4 válidas quedaron `PAID` con saldo $0 y `paidAmount` = suma de abonos; las 2 excluidas no se tocaron; una segunda corrida no encontró nada.

Fase 2 en local: 4 abonos en efectivo en 2 sesiones de ajuste (abril y mayo), ambas `CLOSED` con `systemBalance` = −egresos (coincide con lo que recalcula `computeSystemBalance`) y descuadre 0; recibos `AJU-2026-00011…00014`, continuando la secuencia `AJU-` que ya había en la base local; cada egreso vinculado a su abono, con `referenceType = ACCOUNT_PAYABLE`; ninguna sesión abierta en la caja de ajustes; el script viejo (`sanitize-ap-paid-via-expense-order.ts`) no tomó los egresos nuevos; las dos fases juntas en una sola corrida `--apply` funcionaron; la segunda corrida no hizo nada; `db-invariants.sh` sin CP descuadradas.
