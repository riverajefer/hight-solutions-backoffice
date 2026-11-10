# Plan: consumo de inventario amarrado a la OP (empieza con rollos DTF)

> Estado: **fase 1 implementada** (2026-11-10) — lotes/rollos, registro, vista, detalle, histórico y alerta visual. `MaterialConsumption` y `ProductSupplyRule` se movieron a la fase 2, porque su forma depende de las decisiones abiertas de §9.

## 1. Qué encontré en el sistema (y en PRD)

| Hecho | Consecuencia para el diseño |
|---|---|
| Ya existe el módulo `dtf` (`DtfRecord`): el pedido DTF se registra en cm y se convierte en OP con **un ítem en metros** (`dtf.service.ts:282`). | El «pedido DTF» y la OP terminan siempre en un `OrderItem`. |
| En PRD los 2.228 `DtfRecord` se convirtieron en OP **en el mismo instante** (mediana y p90 = 0 h). | El `DtfRecord` es solo un formulario de entrada. El consumo se ancla al **ítem de OP**, no al registro DTF. |
| Desde agosto hay ~3.080 ítems DTF: ~1.710 vienen del módulo DTF y **~1.350 se crean directo en la OP**. | El descuento no puede vivir en `convertToOrder`: tiene que salir de la OP, venga de donde venga. |
| Solo **85 de esos ítems tienen OT** (y 1 de los que vienen del módulo DTF). | Confirma lo que pidió el cliente: el consumo no puede depender de la OT. |
| La cantidad del ítem **no siempre son metros**: «DTF UV» se vende casi siempre por metro (550 ítems a $70.000 con 0,34 m), pero hay stickers/etiquetas a $280 con cantidad 1.300 (unidades). | El consumo en metros se **propone** desde la cantidad, pero se puede corregir. Nunca se deriva a ciegas. |
| El producto se llama `"DTF UV "` (con espacio al final). | Amarrar por `productId`, nunca por nombre. |
| `Supply` tiene un solo `currentStock` y un `purchasePrice` estático; el kardex (`InventoryMovement`) solo sabe de OT y movimientos manuales. Casi no se usa (6 movimientos en PRD). | Hay que extender el inventario: lotes, costo por movimiento y referencia a la OP. |
| La rentabilidad (`OrdersService._calcProfitability`) es `order.total − OG de las OT de la OP`. | Una OP DTF sin OT hoy tiene costo $0 → 100 % de utilidad. Además usa el total **con IVA** (ver §7). |
| Hay 6 OG de compra de rollos/DTF amarradas a una OT. | Riesgo de contar el rollo dos veces (como OG y como consumo). Ver §7. |

## 2. Recomendación: motor estándar + configuración por producto

**No lo haría solo para DTF ni por categoría.** El caso de los carnets y el de los rollos son el mismo problema — *descontar un insumo amarrándolo a la OP, llevar su costo a la OP y ver el sobrante* — con una sola diferencia: el rollo necesita **identidad individual** (lote) y el carnet no.

Entonces:

1. **Un solo motor de consumo** que descuenta cualquier `Supply` contra un ítem de OP (OT opcional).
2. **El insumo decide si se controla por lotes** (`trackLots`). Rollos DTF: sí. Carnets: no (o sí, si quieren saber de qué compra salió).
3. **El producto decide si el consumo es automático** mediante una regla (una «receta» mínima): `DTF UV → Rollo DTF UV, 1 m por cada 1 m vendido`. Los productos sin regla se descuentan a mano desde la OP.

Así, extender a otro producto es **configurar, no programar**: crear el insumo, decir si lleva lotes y (si aplica) crear la regla.

## 3. Modelo de datos

### 3.1 Cambios en lo existente

- `Supply`
  - `trackLots Boolean @default(false)` — el stock se maneja por lotes/rollos.
  - `averageCost Decimal?` — costo promedio ponderado para insumos **sin** lotes (se recalcula en cada entrada). Reemplaza el uso de `purchasePrice` como costo.
  - `lowStockPercent Decimal?` — umbral de alerta por lote (por defecto 10 %, ver §6).
- `InventoryMovement` (el kardex sigue siendo la única fuente de verdad)
  - `lotId String?`
  - `orderId String?`, `orderItemId String?`, `workOrderItemId String?` (los tres opcionales)
  - `consumptionId String?` — qué consumo lo originó
  - `unitCost` pasa a ser **obligatorio** en salidas y entradas
  - nuevos `referenceType`: `ORDER_ITEM`, `LOT_CLOSE`

### 3.2 Nuevas tablas

**`SupplyLot`** (rollo / lote)

| Campo | Nota |
|---|---|
| `code` | Consecutivo legible, p. ej. `ROL-UV-0001` (patrón de `consecutives` con sync+retry) |
| `supplyId` | Rollo DTF UV / Rollo DTF Textil |
| `initialQuantity`, `remainingQuantity` | En la unidad de consumo (m). `remainingQuantity` se mueve con `increment/decrement` atómico |
| `unitCost`, `totalCost` | Se guardan ambos; el formulario calcula uno desde el otro |
| `receivedAt`, `createdById`, `notes` | |
| `expenseOrderItemId String?` | Línea de OG con que se compró (trazabilidad de la compra) |
| `status` | `AVAILABLE`, `IN_USE`, `DEPLETED`, `CLOSED` — «Bajo inventario» **se calcula**, no se guarda |
| `depletedAt` | Cuando llega a 0 o se cierra |

Sin borrado físico: no hay `DELETE`; un rollo mal registrado se **anula** con movimiento de ajuste (solo si no tiene consumos).

**`MaterialConsumption`** (consumo vigente de un ítem)

| Campo | Nota |
|---|---|
| `orderItemId`, `orderId` | Ancla obligatoria |
| `workOrderItemId?` | Opcional |
| `supplyId`, `lotId?` | |
| `quantity`, `unitCost`, `totalCost` | Costo **congelado** al momento del consumo |
| `kind` | `PRODUCTION` (lo vendido) o `REPRINT` (reimpresión / merma atribuible a la OP, sin ingreso) |
| `source` | `AUTO` (regla del producto) o `MANUAL` |
| `createdById`, `updatedAt` | |

Índice único `(orderItemId, lotId, kind)` (con `lotId` nulo tratado aparte para insumos sin lotes). Esta fila es **el estado actual**; cada cambio de cantidad genera un movimiento de kardex por la **diferencia** (`EXIT` si sube, `RETURN` si baja). Así:

- reintentos / doble clic → la fila ya existe, la diferencia es 0, no hay movimiento duplicado;
- editar la OP → solo se mueve el delta;
- anular → la cantidad va a 0 y se genera un `RETURN` por el total.

**`ProductSupplyRule`** (receta mínima)

`productId`, `supplyId`, `factor` (m de insumo por unidad vendida; DTF = 1), `autoConsume Boolean`, `isActive`. Una regla por producto en la fase 1.

## 4. Flujos

### 4.1 Registrar rollo
Formulario: tipo (insumo con `trackLots`), longitud inicial (m), costo por metro **o** valor total (se calcula el otro con `formatCurrencyInput`), fecha (`DatePicker`), observaciones, OG de compra opcional. Crea `SupplyLot` + movimiento `ENTRY` con `lotId`, en la misma transacción.

### 4.2 Rollo en uso
Cada insumo con lotes tiene **un rollo `IN_USE`** (el que está montado en la impresora). El operario lo cambia desde la vista de rollos. Al montar uno nuevo, el anterior pasa a `AVAILABLE` (si le queda) o se ofrece **cerrarlo** (§4.5).

### 4.3 Consumo automático desde la OP (DTF)
Cuando un ítem de OP tiene producto con regla `autoConsume`:
- se propone `cantidad × factor` metros del rollo en uso;
- en el formulario de la OP el ítem muestra «Consumo: 0,34 m de ROL-UV-0007» con opción de **corregir los metros** (caso stickers vendidos por unidad) o **cambiar el rollo**;
- si el rollo en uso no alcanza, el consumo **se parte** automáticamente con el siguiente rollo disponible (FIFO por `receivedAt`) — dos filas de `MaterialConsumption`;
- si no hay stock en ningún rollo, ver decisión §9.3.

Todo ocurre en la misma transacción que crea/edita la OP, con bloqueo de fila sobre los lotes afectados (`SELECT … FOR UPDATE`, mismo patrón que `lockOrderForUpdate`).

**Punto de enganche:** un único servicio `MaterialConsumptionService.syncForOrderItem(itemId, tx)` llamado desde `OrdersService` en crear, editar, eliminar ítem, anulación parcial y cambio a `ANULADO`/`RETURNED`. `DtfService.convertToOrder` no necesita nada propio porque ya pasa por `ordersService.create`.

### 4.4 Consumo manual (carnets y demás insumos)
En el detalle de la OP, pestaña **«Materiales»**: elegir ítem, insumo, (lote si aplica) y cantidad. Mismo servicio, `source = MANUAL`. Opcionalmente seleccionar el ítem de OT. Esto resuelve el pedido del cliente: compraron 500 carnets como insumo, hoy crean la OP, registran 120 → costo a la OP, quedan 380.

### 4.5 Cierre de rollo y merma
Los rollos reales no traen exactamente lo nominal y el final se pierde. «Cerrar rollo» lleva el saldo a 0 con un movimiento `ADJUSTMENT` (`referenceType = LOT_CLOSE`, motivo obligatorio). Ese costo es **merma**: se reporta aparte en la rentabilidad del rollo, no se carga a ninguna OP. Si el rollo rindió más de lo registrado, el mismo flujo permite ajustar hacia arriba (con permiso de gerencia).

### 4.6 Reversión
- Ítem eliminado / OP anulada / devolución total → `RETURN` del total al **mismo lote**.
- Si ese lote ya está `CLOSED`, el `RETURN` reabre el saldo… **o** se registra como merma recuperada (decisión §9.4).
- Anulación parcial por ítems: el consumo **no** se reversa solo (el material ya se usó); se ofrece ajustarlo a mano.

## 5. Permisos (3 archivos obligatorios: `sync-permissions.ts`, `permission-labels.ts`, `PermissionsSelector.tsx`)

| Permiso | Para |
|---|---|
| `read_supply_lots` | Ver rollos, detalle e histórico |
| `create_supply_lots` | Registrar rollos (operario, gerencia) |
| `manage_supply_lots` | Cambiar rollo en uso, cerrar rollo, ajustar longitud |
| `manage_material_consumption` | Corregir/registrar consumo manual en la OP |
| `read_material_costs` | Ver costos, rentabilidad por OP y por rollo (no todos los operarios deberían ver costos) |

## 6. Vistas

1. **Rollos** (`/inventory/lots`): tabla condensada con código, tipo, inicial, consumido, disponible, % consumido (barra), costo/m, valor, fecha de ingreso, estado con chip (`Disponible` / `Bajo inventario` / `Agotado` / `Cerrado`) y marca del rollo en uso. Filtros por tipo y estado; el histórico es la misma tabla con «Agotados/Cerrados» incluidos (paginación server-side).
2. **Detalle de rollo**: datos originales, kardex del rollo, OP que consumieron (con enlace), ajustes/reversiones, fecha de agotamiento y bloque de rentabilidad (§7.2).
3. **OP → pestaña Materiales**: consumos por ítem, costo y ganancia bruta del ítem.
4. **Alerta de inventario bajo**: chip en la vista + aviso al rollo en uso cuando pasa el umbral; reutilizar `inventory.scheduler` / notificaciones existentes para avisar a quien tenga `manage_supply_lots`. Umbral: `Supply.lowStockPercent`, por defecto una constante centralizada `DEFAULT_LOT_LOW_STOCK_PERCENT = 10` en un util compartido.

## 7. Costos y rentabilidad

### 7.1 Por OP / ítem
- Costo de material = Σ `MaterialConsumption.totalCost` del ítem (incluye `REPRINT`).
- Ingreso del ítem = `total` del ítem **sin IVA**, descontando lo anulado (`annulledQuantity × unitPrice`).
- Ganancia bruta del ítem atribuible al material = ingreso − costo de material.
- `_calcProfitability` pasa a: `totalExpenses = OG de las OT + costo de material`, con el desglose visible por separado.

**Ajuste que propongo:** la rentabilidad actual compara `order.total` (con IVA y redondeo comercial) contra OG (que en buena parte no tienen IVA). Con costos de material bien medidos, ese 19 % distorsiona. Recomiendo pasar a **subtotal sin IVA** en el mismo cambio. Es una decisión del cliente porque mueve las cifras que ya ven (§9.6).

**Doble conteo:** la OG con la que se compró un rollo es un gasto de caja; el consumo es el costo. Si esa OG está amarrada a una OT, la OP lo contaría dos veces. Regla: una línea de OG vinculada a un `SupplyLot` se **excluye** de la rentabilidad por OP. (Hoy hay 6 casos así en PRD; habría que revisarlos.)

### 7.2 Por rollo
- Valor de adquisición = `totalCost`.
- Consumido = Σ consumos; valor consumido = Σ `totalCost`.
- Ingreso asociado: para cada ítem que consumió del rollo, `ingreso del ítem × (m consumidos de este rollo / m totales consumidos por el ítem)`. Esto reparte sin duplicar cuando un ítem se partió entre dos rollos. Los `REPRINT` suman costo pero no ingreso.
- Ganancia bruta acumulada = ingreso asociado − valor consumido.
- Merma = valor de los ajustes de cierre.
- Restante y su costo = `remainingQuantity × unitCost`.

## 8. Fases sugeridas

| Fase | Alcance | Entregable |
|---|---|---|
| **1** | Modelo (`SupplyLot`, `MaterialConsumption`, `ProductSupplyRule`, campos nuevos), registro de rollos, vista de rollos + detalle + histórico, alerta. Seed de insumos «Rollo DTF UV» y «Rollo DTF Textil» y sus reglas. | Se pueden cargar los rollos reales que hay hoy en bodega. |
| **2** | Consumo automático DTF desde la OP (crear/editar/eliminar/anular), rollo en uso, partición entre rollos, cierre con merma. Invariantes SQL nuevas en `db-invariants.sh` (`remainingQuantity = initial − Σ movimientos`). | Las OP DTF empiezan a descontar. |
| **3** | Costo de material en la rentabilidad de la OP y rentabilidad por rollo. | Rentabilidad real de DTF. |
| **4** | Consumo manual de cualquier insumo desde la OP (carnets), costo promedio ponderado para insumos sin lotes. | Caso del cliente con los carnets. |
| **5+** | Ir sumando productos con regla (vinilos, lonas…), reglas por m² (ancho × alto en `specifications`). | |

Las fases 1–3 son el pedido de DTF. La 4 es pequeña porque reutiliza todo lo anterior; la pondría inmediatamente después.

## 9. Decisiones abiertas (para el cliente o para ti)

1. **¿Cuándo se descuenta?** Hay 350 OP DTF en `DRAFT` en PRD. Opciones: (a) al crear el ítem, aun en borrador, y se devuelve si se anula — refleja que DTF se imprime de inmediato; (b) al salir de `DRAFT`. *Recomiendo (a)*, porque el DTF se imprime al instante y un borrador olvidado ya consumió material; pero entonces los borradores viejos deben anularse para devolver el material.
2. **¿Hay más de una impresora / rollo montado a la vez por tipo?** Si sí, el «rollo en uso» pasa a ser por máquina (`machineId` en el lote en uso).
3. **¿Qué hacer si no hay stock registrado?** (a) bloquear la OP; (b) permitir y dejar el consumo «sin rollo» para asignarlo después; (c) dejar el rollo en negativo. *Recomiendo (b)*: no frena la venta y deja una bandeja de «consumos sin rollo» que alguien debe resolver. Bloquear la venta por un dato de bodega es lo que hizo que el inventario nunca se usara.
4. **Devolución a un rollo ya cerrado**: ¿reabre el saldo o queda como merma recuperada? *Recomiendo merma recuperada* (el rollo físico ya no existe).
5. **¿Los rollos se compran siempre por OG?** Si sí, el registro del rollo podría nacer desde la línea de OG pagada en vez de cargarse a mano (evita digitar dos veces el costo).
6. **Rentabilidad sin IVA**: ¿pasamos a subtotal sin IVA para todas las OP? Cambia las cifras de la pantalla de rentabilidad que ya usa el cliente.
7. **Merma en la impresión** (pruebas de color, reimpresiones): ¿se registra contra la OP (`REPRINT`) o solo al cerrar el rollo? Lo primero da rentabilidad por OP más honesta; lo segundo es menos trabajo para el operario.
8. **Stock actual**: ¿cuántos rollos hay hoy y de qué longitud/costo? Hace falta la carga inicial antes de activar la fase 2.
