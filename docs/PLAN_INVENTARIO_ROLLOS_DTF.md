# Plan: consumo de inventario amarrado a la OP (empieza con rollos DTF)

> Estado: **fases 1, 2 y 3 implementadas** (2026-11-10). Fase 2: el ítem de OP descuenta solo (reglas DTF UV y DTF TEXTIL, factor 1), con rollo en uso, partición entre rollos, bandeja «sin rollo», corrección manual, cierre con merma y devolución como merma recuperada. Fase 3: rentabilidad de toda OP sobre venta sin IVA (subtotal − descuento sin IVA + prueba de color; las retenciones no restan) con costo de material; rentabilidad por rollo; rollo amarrado a su línea de OG, que se excluye de la rentabilidad de la OP. Fase 4 (rollos por metro: calandra, papel, cinta, plotter) **implementada** el 2026-11-14 (§10, ver §10.7); los carnets pasan a la fase 6.
>
> Dos reglas que se fijaron al implementar, sin pregunta explícita al cliente:
> - Una OP **devuelta** (`RETURNED`, devolución total del dinero) **no** devuelve material: el trabajo se imprimió. Solo `ANULADO`, borrar el borrador o quitar el ítem lo devuelven.
> - Solo un rollo **cerrado a mano** convierte lo devuelto en merma recuperada. Uno **agotado** por el sistema se reabre al devolverle material: «agotado» es un cálculo que una venta mal digitada (p. ej. 200 stickers tomados como 200 m) puede provocar sin que el rollo físico se haya acabado. (Corregido 2026-11-10; la primera versión lo trataba como cerrado.)
> - Las OP que ya existían no se tocan: el descuento empieza con lo que se cree o edite desde el despliegue.

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
| `source` | `AUTO` (regla del producto) o `MANUAL` |
| `createdById`, `updatedAt` | |

Índice único `(orderItemId, lotId)` (con `lotId` nulo = consumo pendiente de asignar a un rollo, o insumo sin lotes). Esta fila es **el estado actual**; cada cambio de cantidad genera un movimiento de kardex por la **diferencia** (`EXIT` si sube, `RETURN` si baja). Así:

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
- si no hay stock en ningún rollo, el consumo queda «sin rollo» en una bandeja para asignarlo después (decisión §9.3); la OP nunca se bloquea.

Todo ocurre en la misma transacción que crea/edita la OP, con bloqueo de fila sobre los lotes afectados (`SELECT … FOR UPDATE`, mismo patrón que `lockOrderForUpdate`).

**Punto de enganche:** un único servicio `MaterialConsumptionService.syncForOrderItem(itemId, tx)` llamado desde `OrdersService` en crear, editar, eliminar ítem, anulación parcial y cambio a `ANULADO`/`RETURNED`. `DtfService.convertToOrder` no necesita nada propio porque ya pasa por `ordersService.create`.

### 4.4 Consumo manual (carnets y demás insumos)
En el detalle de la OP, pestaña **«Materiales»**: elegir ítem, insumo, (lote si aplica) y cantidad. Mismo servicio, `source = MANUAL`. Opcionalmente seleccionar el ítem de OT. Esto resuelve el pedido del cliente: compraron 500 carnets como insumo, hoy crean la OP, registran 120 → costo a la OP, quedan 380.

### 4.5 Cierre de rollo y merma
Los rollos reales no traen exactamente lo nominal y el final se pierde. «Cerrar rollo» lleva el saldo a 0 con un movimiento `ADJUSTMENT` (`referenceType = LOT_CLOSE`, motivo obligatorio). Ese costo es **merma**: se reporta aparte en la rentabilidad del rollo, no se carga a ninguna OP. Si el rollo rindió más de lo registrado, el mismo flujo permite ajustar hacia arriba (con permiso de gerencia).

### 4.6 Reversión
- Ítem eliminado / OP anulada / devolución total → `RETURN` del total al **mismo lote**.
- Si ese lote ya está `CLOSED`, el `RETURN` no reabre el saldo: se registra como merma recuperada del rollo (decisión §9.5).
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
- Costo de material = Σ `MaterialConsumption.totalCost` del ítem. La merma de impresión no se carga a la OP: sale al cerrar el rollo (decisión §9.4).
- Ingreso del ítem = `total` del ítem **sin IVA**, descontando lo anulado (`annulledQuantity × unitPrice`).
- Ganancia bruta del ítem atribuible al material = ingreso − costo de material.
- `_calcProfitability` pasa a: `totalExpenses = OG de las OT + costo de material`, con el desglose visible por separado.

**Ajuste que propongo:** la rentabilidad actual compara `order.total` (con IVA y redondeo comercial) contra OG (que en buena parte no tienen IVA). Con costos de material bien medidos, ese 19 % distorsiona. **Decidido:** pasar a subtotal sin IVA en el mismo cambio (§9.7); mueve las cifras que el cliente ya ve.

**Doble conteo:** la OG con la que se compró un rollo es un gasto de caja; el consumo es el costo. Si esa OG está amarrada a una OT, la OP lo contaría dos veces. Regla: una línea de OG vinculada a un `SupplyLot` se **excluye** de la rentabilidad por OP. (Hoy hay 6 casos así en PRD; habría que revisarlos.)

### 7.2 Por rollo
- Valor de adquisición = `totalCost`.
- Consumido = Σ consumos; valor consumido = Σ `totalCost`.
- Ingreso asociado: para cada ítem que consumió del rollo, `ingreso del ítem × (m consumidos de este rollo / m totales consumidos por el ítem)`. Esto reparte sin duplicar cuando un ítem se partió entre dos rollos.
- Ganancia bruta acumulada = ingreso asociado − valor consumido.
- Merma = valor de los ajustes de cierre.
- Restante y su costo = `remainingQuantity × unitCost`.

## 8. Fases sugeridas

| Fase | Alcance | Entregable |
|---|---|---|
| **1** | Modelo (`SupplyLot`, `MaterialConsumption`, `ProductSupplyRule`, campos nuevos), registro de rollos, vista de rollos + detalle + histórico, alerta. Seed de insumos «Rollo DTF UV» y «Rollo DTF Textil» y sus reglas. | Se pueden cargar los rollos reales que hay hoy en bodega. |
| **2** | Consumo automático DTF desde la OP (crear/editar/eliminar/anular), rollo en uso, partición entre rollos, cierre con merma. Invariantes SQL nuevas en `db-invariants.sh` (`remainingQuantity = initial − Σ movimientos`). | Las OP DTF empiezan a descontar. |
| **3** | Costo de material en la rentabilidad de la OP y rentabilidad por rollo. | Rentabilidad real de DTF. |
| **4** | Rollos por metro más allá del DTF: recetas desde la pantalla, varios insumos por producto, cambiar de insumo en el ítem y «material del cliente». Ver §10. | Calandra (papel + tela), cintas portacarné y banners/vinilos de medida fija. |
| **5** | Ítems de medida libre (m² contra metro lineal). Depende de la pregunta §10.6-A. | Vinilo y banner a la medida. |
| **6** | Consumo manual de insumos **sin** lotes desde la OP (carnets), costo promedio ponderado. | Caso del cliente con los carnets. |

Las fases 1–3 son el pedido de DTF. La 4 reutiliza el motor sin tocar su núcleo.

## 10. Fase 4: rollos por metro (calandra, papel, cinta, plotter) — diseño 2026-11-14

### 10.1 El pedido

El cliente quiere lo mismo que DTF para el **papel de sublimación**, la **tela** de calandra, la **cinta portacarné** y los rollos del **plotter** (vinilo, banner). Su caso concreto: 250 + 30 + 10 cintas de tres OP, 4 rollos de 100 m comprados, 0,90 m por cinta. Hoy cargan un rollo a cada OP y dejan uno como insumo; lo correcto es que cada OP se lleve 225 m, 27 m y 9 m, y el resto quede en el rollo.

En PRD (últimos 3 meses, sin anuladas) «Calandra y Sublimación» es el área que más vende: $165,4M, por encima de DTF UV ($97,8M). Plotter ecosolvente: $44,0M.

### 10.2 Qué ya sirve y qué falta

| Pieza | Estado |
|---|---|
| Insumo con rollos (`trackLots`, prefijo, % de alerta) | **Ya existe en la pantalla de insumos.** El cliente puede crear «Papel de sublimación», «Cinta premium 20 mm», «Tela pluton», «Banner 13 oz»… sin desarrollo. |
| Varios insumos por producto | **El motor ya lo soporta**: `syncOrder` agrupa por ítem × insumo y aplica cada regla del producto. La tabla tiene único `(productId, supplyId)`. Falta probarlo con dos reglas y verlo en la pestaña Materiales. |
| Factor distinto de 1 (cinta = 0,90 m) | **Ya soportado** (`cantidad × factor`). |
| Recetas (`ProductSupplyRule`) | **Sin pantalla ni API.** Las dos reglas DTF las sembró la migración `20261111000000_material_consumptions`. Es la pieza principal de la fase. |
| Regla nueva sobre OP viejas | **Riesgo.** La regla no tiene fecha de vigencia: al crear la regla de CALANDRA, editar cualquier OP vieja con un ítem CALANDRA descontaría sus metros del rollo actual. |
| Cambiar el factor | **Riesgo.** Al editar una OP, la sync recalcula con el factor nuevo y mueve consumos ya hechos. |
| Corregir un consumo a 0 («lo trajo el cliente») | **Falla hoy.** `release` borra la fila cuando llega a 0 y con ella la marca `MANUAL`; la siguiente edición de la OP vuelve a descontar según la regla. Afecta también a DTF. |
| Elegir qué tela gastó el ítem | **No existe.** La regla apunta a un insumo fijo, pero «CALANDRA» se hace en pluton, tifón, satín… |

### 10.3 Diseño

**A. Recetas por producto (pantalla + API).**
- En el formulario del producto (Portafolio → Productos), sección «Insumos que consume»: filas `insumo con rollos` + `cantidad por unidad vendida` (en la unidad de consumo del insumo) + activo. Ejemplos: CINTA PREMIUM → Cinta premium 0,90 m + Papel de sublimación X m; Banner 1x2 → Banner 13 oz 2 m.
- Solo se ofrecen insumos con `trackLots` (el motor ignora los demás).
- API: `GET/PUT /products/:id/supply-rules` (reemplaza el juego completo en una transacción). Permisos: leer con `read_products`, editar con `update_products`. Sin permiso nuevo.
- Borrar una regla = desactivarla (`isActive = false`), nunca borrado físico: hay consumos que la referencian por historia.

**B. Vigencia de la regla.** Campo `ProductSupplyRule.effectiveFrom` (por defecto la fecha de creación; migración: las dos reglas DTF toman su `created_at`). La sync solo aplica una regla a ítems con `createdAt ≥ effectiveFrom`. Los consumos ya registrados siguen su curso normal (devolución al anular, etc.). Así una regla nueva no toca OP viejas al editarlas.

**C. Factor congelado.** `MaterialConsumption.factor Decimal?` guarda el factor con el que nació la fila. Si un ítem ya tiene filas AUTO de ese insumo, la sync usa ese factor y no el vigente; el factor nuevo aplica a ítems nuevos. Si cambia la **cantidad** del ítem, se recalcula con el factor congelado.

**D. Corrección a 0 que se respeta.** Una corrección `MANUAL` a 0 deja una fila con `quantity = 0`, `lotId` nulo y `source = MANUAL` como marca (no se borra). Hay que ajustar `release`, la bandeja de pendientes (filtrar `quantity > 0`), los totales y las invariantes SQL. En la pestaña Materiales, atajo **«Lo pone el cliente»** por línea = corrección a 0 con motivo obligatorio. Volver al cálculo automático (`quantity: null`) borra la marca. Arreglar esto beneficia también a DTF.

**E. Cambiar de insumo en el ítem.** En la pestaña Materiales, «Cambiar insumo»: lleva a 0 la línea de la regla (marca del punto D) y registra un consumo `MANUAL` del otro insumo con rollos (misma unidad de consumo). Requiere que `correctItem` acepte un insumo **sin** regla para ese producto (hoy solo exige `trackLots`, así que en el backend basta con la validación de unidad). La receta guarda la tela por defecto; el operario la cambia cuando el pedido fue en otra.

**F. Sin cambios en el núcleo.** Rollo en uso, partición entre rollos, bandeja «sin rollo», cierre con merma, rentabilidad por OP y por rollo funcionan igual para cualquier insumo con rollos.

### 10.4 Lo que no entra en esta fase

- Ítems de medida libre (vinilo/banner en m², banderas a la medida): fase 5, según la respuesta §10.6-A. Mientras tanto se pueden corregir a mano en la pestaña Materiales.
- Tinta: no se puede medir por trabajo. Si se quiere, sería una regla más con un estimado por m² (decisión del cliente, no bloquea).
- Insumos sin lotes (carnets): fase 6.
- Limpieza del catálogo: hay productos duplicados con nombres distintos («Impreson y Calandra», «impresion y calandra», «impresion calandra y tela») y `priceUnit` es texto libre. Como la receta se amarra al producto, conviene que el cliente unifique antes de cargar recetas. Es trabajo de datos, no de código.

### 10.5 Carga inicial (la hace el cliente, en este orden)

1. Crear los insumos con rollos (pantalla de insumos ya existente): papel de sublimación por ancho, cada tela, cinta, cada vinilo y banner por ancho.
2. Registrar los rollos que hay en bodega (`/inventory/lots`).
3. Cargar las recetas de los productos (pantalla nueva).

Sin el paso 2 todo cae en la bandeja «sin rollo», igual que con DTF.

### 10.6 Preguntas al cliente que bloquean

| # | Pregunta | Qué cambia |
|---|---|---|
| A | En vinilo, banner y telas a la medida, ¿de dónde sacamos los metros gastados: el asesor escribe ancho × alto en el ítem, o producción registra los metros reales al imprimir? | Define la fase 5: campos de medida en el ítem + conversión con el ancho del rollo, o un registro de producción. |
| B | De un mismo material (p. ej. la misma tela o el mismo papel), ¿puede haber más de un rollo montado a la vez, en dos máquinas o en dos anchos? | Hoy hay un solo «rollo en uso» por insumo (índice único). Si cada ancho o color es un insumo distinto, no cambia nada; si hay dos máquinas gastando el mismo insumo a la vez, hay que poder elegir el rollo en el consumo. |

## 9. Decisiones del cliente (2026-11-10)

| # | Pregunta | Decisión | Qué cambia en el diseño |
|---|---|---|---|
| 1 | ¿Cuándo se descuenta? | **Al crear el ítem**, aunque la OP esté en borrador; si se anula, se devuelve. | `syncForOrderItem` corre en crear/editar sin mirar el estado. Los borradores viejos deben anularse para devolver el material (las 350 OP DTF en `DRAFT` de PRD no se tocan: el descuento empieza con las OP nuevas). |
| 2 | ¿Varias impresoras por tipo? | **Un solo «rollo en uso» por tipo.** | `IN_USE` único por insumo (índice único parcial `(supply_id) WHERE status = 'IN_USE'`). Sin `machineId`. |
| 3 | ¿Y si no hay stock registrado? | **Dejar pasar la venta** y registrar el consumo «sin rollo», en una bandeja para asignarlo después. | `MaterialConsumption.lotId` nulo = pendiente de asignar. Bandeja de consumos sin rollo; al asignarlo se genera el `EXIT` contra el lote. Nunca se bloquea la OP ni queda un lote en negativo. |
| 4 | Merma de impresión (pruebas, reimpresiones) | **Alternativa simple:** solo al cerrar el rollo. | Se elimina `kind`/`REPRINT`. Toda la merma sale por el cierre del rollo y se reporta en la rentabilidad del rollo, no de la OP. |
| 5 | Devolución a un rollo ya cerrado | **Merma recuperada**; el rollo no se reabre. | El `RETURN` sobre un lote `CLOSED` no suma saldo: se registra como merma recuperada del rollo (resta de su merma). |
| 6 | ¿Los rollos se compran siempre por OG? | **Sí.** | El rollo puede nacer desde la línea de OG (`SupplyLot.expenseOrderItemId`) y esa línea se excluye de la rentabilidad de la OP para no contarla dos veces. Revisar las 6 OG de rollos amarradas a OT en PRD. |
| 7 | ¿Rentabilidad sin IVA? | **Sí, subtotal sin IVA** para todas las OP. | `_calcProfitability` usa ingreso sin IVA. Cambia las cifras que el cliente ya ve: avisarle al desplegar. |
| 8 | Rollos actuales en bodega | **Pendiente.** | Hay que cargarlos en «Rollos y lotes» antes de activar el descuento automático; sin ellos, los consumos caen en la bandeja «sin rollo». |

### 10.7 Cómo quedó implementado (2026-11-14)

- **Correcciones manuales en tabla aparte** (`material_overrides`, único por ítem × insumo, `quantity ≥ 0`, `note`). Se descartó la fila de consumo en 0 del punto D: `material_consumptions` tiene `CHECK quantity > 0` y una fila con `lotId` nulo significa «pendiente», así que un 0 ahí se confundiría con la bandeja. La sync lee la corrección como lo deseado y gana sobre la regla. Borrar el ítem la borra (Cascade) y la sync devuelve lo que quedó huérfano. La migración `20261114000000_material_overrides` pasa las filas `MANUAL` existentes a la tabla nueva (en PRD no había ninguna).
- **Vigencia**: `product_supply_rules.effective_from` (las reglas DTF toman su `created_at`). Crear o reactivar una regla la fija en ese momento.
- **Factor congelado**: `material_consumptions.factor`. Un ítem que ya consumió sigue con su regla y su factor aunque la regla se desactive o cambie; solo vuelve a 0 si el ítem se borra, la OP se anula o el producto del ítem cambia.
- **API**: `GET/PUT /products/:productId/supply-rules` (`read_products` / `update_products`; quitar = desactivar), `PUT /material-consumption/order-items/:id` acepta `quantity: 0` con `note` obligatoria y cualquier insumo con rollos, `PUT /material-consumption/order-items/:id/swap` (misma unidad de consumo). `GET /material-consumption/orders/:id` ahora devuelve `{ rows, overrides }`.
- **Pantallas**: tarjeta «Insumos que consume» en el formulario del producto (solo al editar; pide `read_supply_lots` para listar insumos). En la OP, «Material consumido» tiene menú por línea (corregir cantidad, lo puso el cliente, se hizo en otro insumo, volver a automático) y «Agregar material» para ítems sin receta.
- **Invariante nueva**: «Correcciones de material que no se aplicaron» (lo cargado al ítem × insumo ≠ la corrección).
