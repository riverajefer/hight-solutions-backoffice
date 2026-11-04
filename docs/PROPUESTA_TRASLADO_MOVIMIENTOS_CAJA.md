# Propuesta: trasladar un movimiento de caja a la sesión de hoy

**Fecha:** 2026-11-04
**Estado:** decisiones tomadas el 2026-11-04 (sección 6), listo para construir

---

## 1. El caso que la origina

El 4 de noviembre el cliente reportó dos Órdenes de Gasto que figuraban pagadas, aunque el proveedor nunca recibió el dinero:

| OG | Ítem | Valor | Pagada por Caja | Sesión |
|---|---|---|---|---|
| OG-2026-0890 | Impresiones de papel (TECHTRADE) | $2.000 | 27-oct, RC-2026-5969, efectivo | cerrada |
| OG-2026-0917 | Propalcote 150g (TECHTRADE) | $2.500 | 29-oct, RC-2026-6198, efectivo | cerrada |

Ninguna tenía comprobante. El cliente pidió **eliminarlas** para pagarlas ese día, porque si no el arqueo no le cuadraba.

Se resolvió por script (`backend/scripts/move-movements-to-open-session.ts`): los dos egresos pasaron a la sesión abierta del 4-nov y se recalcularon los cierres de origen.

| Cierre | Diferencia antes | Diferencia después |
|---|---|---|
| 27-oct | −$3.862 | −$5.862 |
| 29-oct | +$3.114 | +$614 |

Es la **segunda vez** que hace falta este script. La primera fue el 23-oct, con dos abonos registrados mientras Caja hacía el arqueo (RC-2026-5657 y RC-2026-5658). Al cliente le gusta resolver estos casos desde el sistema, así que conviene convertirlo en un flujo con autorización.

## 2. Por qué no sirve lo que ya existe

| Opción | Problema |
|---|---|
| Eliminar la OG | No se permite: la OG ya tiene firma del admin y está pagada. Es una decisión del 2026-10-28 y se mantiene. |
| Anular el movimiento (`cash-movement-void-requests`) y crear una OG nueva | El cierre de una sesión cerrada queda congelado (`systemBalance`, `discrepancy`). Anular no corrige el arqueo de ese día, y la OG nueva duplica el gasto al proveedor en reportes y en la CP. |
| Editar la OG pagada (`expense-order-edit-requests`) | Cambia montos e ítems, pero no la sesión de caja del egreso. |

**Ojo:** la anulación de movimientos ya está disponible en la app. Si Caja la usa para este caso, el arqueo de ese día queda descuadrado para siempre y el gasto queda duplicado. Es otra razón para darle un camino correcto.

## 3. Propuesta

Una **solicitud de traslado de movimiento**, con el mismo patrón de las demás solicitudes del sistema (solicitud → aprobación del admin → ejecución).

### Quién la pide y desde dónde
- **Desde el detalle de la OG**, en un ítem pagado en efectivo: «El proveedor no recibió este pago».
- **Desde el detalle de una sesión cerrada**, en cualquier movimiento en efectivo: «Trasladar a la caja de hoy». Esto cubre también los ingresos registrados durante el arqueo.
- Pueden pedirla Caja (`caja_authorize_expense_orders`) y quien creó la OG. Se crea un permiso nuevo (`request_cash_movement_transfer`) para no depender de otros.
- El motivo es obligatorio, de al menos 10 caracteres.
- Al pedirlo, el sistema pregunta **«¿El dinero se quedó en la caja ese día?»**. Si la respuesta es no, la solicitud no se crea y el sistema explica que es un faltante que hay que investigar, no un traslado. La respuesta queda guardada en la solicitud.

### Quién la aprueba
- El admin, desde la bandeja de aprobaciones y por WhatsApp con la plantilla genérica `solicitud_aprobacion_v1`.
- Nadie puede aprobar su propia solicitud (`self-review.util.ts`).
- **Antes de aprobar, el admin ve el efecto:**
  > Cierre del 27-oct: esperado $2.784.462 → $2.786.462 · diferencia −$3.862 → **−$5.862** ⚠️ empeora
  > Caja de hoy: espera $2.000 menos en efectivo.

### Qué hace al aprobarse
Lo mismo que el script, que ya se probó dos veces en PRD, dentro de **una sola transacción**:
1. Pasa el movimiento a la sesión abierta de la **misma** caja.
2. Recalcula lo esperado y la diferencia del cierre de origen con la fórmula de `closeSession`.
3. Deja el motivo en la nota de la sesión de origen, en la descripción del movimiento y en `audit_logs`.
4. Marca la sesión de origen como «cierre corregido».
5. No toca pagos, recibos, OG, CP ni OP.

### Validaciones (al pedir y otra vez al aplicar)
- El movimiento es en efectivo, no está anulado, no es un contramovimiento y no tiene otro traslado aplicado.
- La sesión de origen está cerrada.
- La sesión destino está abierta y **sin arqueo en curso** (`countStartedAt` nulo). Si al aprobar no hay caja abierta, la aprobación falla con un mensaje claro y la solicitud sigue pendiente.
- Solo puede haber una solicitud pendiente por movimiento, con un **índice único parcial**. El `findFirst` solo no frena el doble clic.
- El movimiento tiene como máximo **30 días**, contados desde el cierre de la sesión de origen.
- Si el movimiento es de un mes anterior al de la sesión destino, se permite, pero con una **advertencia** visible al pedir y al aprobar: «Este traslado cambia el arqueo de octubre; avísale a contabilidad».

### Después de aplicarlo
- Se le recomienda a quien pidió el traslado (y a Caja) subir el comprobante del proveedor cuando pague: aparece un aviso en la notificación de aprobación, en el ítem de la OG y en el detalle de la sesión de hoy. **No es obligatorio** y no bloquea el cierre de caja.

## 4. Riesgos y controles

**El riesgo principal:** el flujo reescribe arqueos ya cerrados. Si el dinero sí salió del cajón ese día (por ejemplo, se le entregó a un mensajero que no le pagó al proveedor), trasladar el egreso permite **sacar el mismo dinero otra vez hoy**. La empresa paga dos veces, y el faltante solo aparece en un cierre viejo que nadie vuelve a mirar. Con un arqueo que casi nunca cuadra (−$26,8M netos en la revisión antifraude de octubre), el flujo también podría usarse para maquillar cierres.

| # | Control | Qué evita |
|---|---|---|
| 1 | El admin ve el antes y el después del cierre de origen, con alerta si empeora | Aprobar sin darse cuenta de que el dinero sí salió ese día |
| 2 | Recomendar subir el comprobante del proveedor (aviso, no bloqueo) | Trasladar y no pagar, o pagar dos veces sin soporte. Es un control más débil por decisión del cliente; el reporte del control 4 muestra los traslados sin comprobante |
| 2b | Preguntar si el dinero se quedó en la caja y bloquear si la respuesta es no | Usar el traslado para tapar un faltante real |
| 3 | El cierre queda marcado como «corregido», con su historial visible | Que la corrección pase desapercibida |
| 4 | Reporte de traslados por mes y por usuario | Que el abuso no se note |
| 5 | Solo dentro de la misma caja; advertencia si cruza de mes | Mover sin aviso arqueos de un mes que contabilidad ya cerró |
| 6 | Plazo máximo de 30 días | Reescribir arqueos de hace meses |

Riesgo técnico: **bajo**. La lógica del recálculo ya existe y se probó en PRD. Lo delicado son las reglas de control, por eso se acuerdan antes de construir.

## 5. Alcance técnico

**Backend**
- Modelo `CashMovementTransferRequest`: movimiento, sesión de origen, sesión destino, motivo, estado, solicitante, revisor, y el esperado y la diferencia antes y después. Migración con el índice único parcial.
- Módulo `cash-movement-transfer-requests` con controller, service y repository. La lógica del script pasa a un servicio reutilizable en `cash-session`.
- Campo en `CashSession` para marcar un cierre corregido, o que se derive de los traslados aplicados.
- Permisos nuevos `request_cash_movement_transfer` y `approve_cash_movement_transfer`, registrados en los **tres** archivos: `sync-permissions.ts`, `permission-labels.ts` y `PermissionsSelector.tsx`.
- Notificaciones al admin y a quien pidió, y aprobación por WhatsApp.
- Pruebas unitarias del recálculo y de las validaciones, y una invariante en `db-invariants.sh`: el esperado guardado de cada sesión cerrada coincide con el recalculado.

**Frontend**
- Botón y diálogo en el ítem de la OG pagada y en el movimiento de la sesión cerrada.
- Tarjeta en la bandeja de aprobaciones con el antes y el después.
- Marca de «cierre corregido» e historial en el detalle de la sesión.
- Avisos de «sube el comprobante» en el ítem de la OG y en la sesión de hoy (no bloquean).
- La pregunta «¿El dinero se quedó en la caja?» y la advertencia de cambio de mes en el diálogo.

**Estimación:** de 2 a 3 días con pruebas. Si se agrega el reporte del control 4, medio día más.

**Fuera de alcance (fase 2):** corregir el método de pago de un movimiento de una sesión cerrada («se registró en efectivo pero se pagó por transferencia»). Hoy se hace con `correct-closed-session.ts --to-transfer`.

## 6. Decisiones (2026-11-04)

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Comprobante obligatorio antes de cerrar la caja? | **Opcional.** El sistema recomienda subirlo, pero no bloquea el cierre. |
| 2 | ¿Quién aprueba? | **Solo el administrador.** |
| 3 | ¿Plazo máximo? | **30 días** desde el cierre de la sesión de origen. |
| 4 | ¿Traslado entre meses? | **Se permite con advertencia**, al pedir y al aprobar. |
| 5 | ¿Preguntar si el dinero se quedó en la caja? | **Sí.** Si la respuesta es no, no se crea la solicitud: es un faltante que hay que investigar. |
| 6 | ¿También para ingresos registrados durante el arqueo? | **Sí.** El flujo sirve para ingresos y egresos en efectivo. |

Para el punto 5 en ingresos, la pregunta cambia a «¿El dinero llegó a la caja en la sesión siguiente?», que es lo que pasó el 22 de octubre.

## 7. Implementación (2026-11-04)

| Pieza | Dónde |
|---|---|
| Modelo y migración | `CashMovementTransferRequest`, `20261104000000_cash_movement_transfer_requests` (índices únicos parciales: uno pendiente y uno aplicado por movimiento) |
| Reglas puras | `backend/src/modules/cash-movement-transfer-requests/cash-movement-transfer.util.ts` |
| Servicio | `cash-movement-transfer-requests.service.ts`: vista previa, crear, aprobar (una transacción con `FOR UPDATE` en las dos sesiones), rechazar, WhatsApp |
| Endpoints | `GET/POST /cash-movements/:id/transfer-requests[/preview]`; `GET /cash-movement-transfer-requests/{pending,all,session/:id,expense-order/:id}`; `PUT …/:id/{approve,reject}` |
| Permisos | `request_cash_movement_transfer` (asignarlo a Caja desde Roles) y `approve_cash_movement_transfer` (además se exige rol admin) |
| Frontend | Botón ⇄ por movimiento en el detalle de una sesión cerrada; «El proveedor no recibió el pago» en la OG pagada; tarjeta «Traslados de caja» con la marca «Cierre corregido»; pestaña «Traslados de Caja» en Solicitudes |

Diferencias con el script `move-movements-to-open-session.ts`:
- El recálculo parte del esperado **guardado** y le resta solo el efecto del movimiento. El script exigía que el guardado coincidiera con el recalculado; en la app eso bloquearía todo cierre en el que después se anuló otro movimiento.
- El plazo de 30 días se cuenta al pedir, no al aprobar.
- Quien pide un traslado no puede aprobarlo, salvo que sea admin (regla general de `self-review.util.ts`).

Pendiente: el reporte de traslados por mes y por usuario (control 4). Por ahora el historial de la pestaña de Solicitudes cumple esa función.
