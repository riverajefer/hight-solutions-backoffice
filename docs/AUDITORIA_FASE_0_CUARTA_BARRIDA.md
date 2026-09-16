# Cuarta barrida — Fase 0

Barrida sobre lo que las tres anteriores dejaron fuera de alcance por escrito:
**inventario, producción, portafolio y la ejecución de devoluciones**. Se suma
una revisión transversal de paginación y de cómo se elige la sesión de caja,
porque ahí está el hallazgo que más pesa para el clon de Zoom.

Las cifras de producción salen de `scripts/db-query.sh` en modo solo lectura,
consultado el 2026-09-15.

Corregidos: los hallazgos **1, 2, 3, 4, 5 y 8** (la caja, todo el bloque de
inventario y el tope de paginación). Los demás siguen en diagnóstico; el orden
sugerido está al final.

---

## 1. El inventario nunca descuenta: la OT no manda la cantidad — **Alta** · ✅ Corregido

El backend está completo. Al pasar una OT a `COMPLETED`,
[work-orders.service.ts:227](../backend/src/modules/work-orders/work-orders.service.ts#L227)
llama a `createExitFromWorkOrder`, que descuenta cada insumo dentro de la misma
transacción. Pero filtra por cantidad:

```ts
where: { workOrderItem: { workOrderId }, quantity: { not: null, gt: 0 } }
```

Y el formulario de OT nunca escribe esa cantidad. El selector de insumos mapea
la selección a un objeto con un solo campo:

- [WorkOrderFormPage.tsx:938](../frontend/src/features/work-orders/pages/WorkOrderFormPage.tsx#L938) — `value.map((v) => ({ supplyId: v.id }))`
- [WorkOrderFormPage.tsx:869](../frontend/src/features/work-orders/pages/WorkOrderFormPage.tsx#L869) — `{ supplyId: newSupply.id }`

No hay ningún campo de cantidad en la pantalla. El insumo queda vinculado a la
OT con `quantity = null`, el `findMany` devuelve cero filas y la función retorna
antes de mover nada.

Lo que dice producción:

| Dato | Valor |
|---|---|
| Vínculos insumo–OT | 9 |
| …con cantidad > 0 | **0** |
| Movimientos de inventario | **0** |
| OT completadas | 39 |
| Insumos activos con stock ≠ 0 | 11 |

39 OT completadas y ni un solo movimiento. El módulo de inventario lleva toda la
vida del sistema sin ejecutarse una vez.

### Corrección aplicada

Cada insumo seleccionado muestra ahora su propia casilla de cantidad, con la
abreviatura de la unidad de consumo al lado —sin ella no se sabe si el número
son metros o rollos—. Se dejó **opcional a propósito**: dejarla vacía significa
"no descontar", que es exactamente el comportamiento de los 9 vínculos que ya
existen. Así no hace falta migrar nada ni bloquear OT viejas.

De paso se corrigió un detalle que habría vuelto el campo inservible: el
`onChange` del selector remapeaba la lista a `{ supplyId }` en cada cambio, así
que agregar un segundo insumo borraba la cantidad del primero. Ahora conserva la
que ya estaba escrita.

---

## 2. Editar un insumo reescribe el stock sin dejar movimiento — **Alta** · ✅ Corregido

`PUT /supplies/:id` acepta `currentStock` y lo escribe directo sobre la tabla:

- [supplies.service.ts:169](../backend/src/modules/portfolio/supplies/supplies.service.ts#L169)
- [supplies.service.ts:80](../backend/src/modules/portfolio/supplies/supplies.service.ts#L80) (en la creación, igual)

Salta por encima de `InventoryMovement`, que es justo la tabla que existe para
responder "quién cambió este stock, cuándo y por qué". Queda sin `previousStock`,
sin `newStock`, sin motivo y sin responsable.

Combinado con el hallazgo 1, esto explica el dato raro de producción: 11 insumos
con stock distinto de cero y cero movimientos. **Hoy el stock se mantiene a mano
editando el insumo.** Es el único camino que quedó vivo.

### Corrección aplicada

`currentStock` salió del DTO de actualización. Con `forbidNonWhitelisted: true`
el backend ahora responde 400 si alguien lo manda, así que el frontend dejó de
enviarlo: en edición el campo queda deshabilitado y su texto de ayuda dice
«Para corregirlo, registra un movimiento de ajuste en Inventario».

Al crear sí se acepta, pero ya no se escribe a pelo: el insumo y su movimiento
`INITIAL` nacen en la misma transacción, con saldo anterior 0, motivo y
responsable. El campo se llama «Stock Inicial» en ese modo.

Eso dejaba un hueco: `ADJUSTMENT` solo sabía restar, así que un conteo físico
que saliera **por encima** del sistema no tenía cómo registrarse y habría
obligado a volver a la puerta de atrás que acabábamos de cerrar. Se añadió
`direction` (`INCREASE` / `DECREASE`), obligatorio para los ajustes. Es el
hallazgo 12 adelantado: sin él, la corrección de este no era usable.

---

## 3. La sesión de caja se elige con `findFirst` sin caja ni orden — **Alta para el fork** · ✅ Corregido

**Siete** caminos de dinero —no cinco, como decía el primer conteo— buscaban "la
sesión abierta" sin decir de cuál caja:

```ts
const activeSession = await this.prisma.cashSession.findFirst({
  where: { status: 'OPEN' },
});
```

- [refund-requests.service.ts](../backend/src/modules/refund-requests/refund-requests.service.ts) — ejecutar una devolución
- [expense-orders.service.ts](../backend/src/modules/expense-orders/expense-orders.service.ts) — autorización de Caja de una OG
- [accounts-payable.service.ts](../backend/src/modules/accounts-payable/accounts-payable.service.ts) — pago de una CP
- [orders.service.ts](../backend/src/modules/orders/orders.service.ts) — **cuatro**: pagos iniciales al crear la OP, abono nuevo al editarla, `addPayment`, y el abono que pasa de no-dinero a dinero al editar el método

Sin `cashRegisterId` y sin `orderBy`, el motor devuelve la fila que quiera.

**Hoy en High Solutions no hace daño: producción tiene una sola caja registrada,
una sola activa.** Por eso nunca se notó.

Para Zoom es otra cosa. Con tres sedes operando a la vez habrá tres sesiones
`OPEN` simultáneas, y un pago hecho en una sede se puede registrar en la caja de
otra. El arqueo de cierre no le cuadra a ninguna de las tres y no queda rastro de
por qué. `cash-movement.service.ts:162` sí lo hace bien —filtra por
`cashRegisterId` y ordena por `openedAt`—, así que el patrón correcto ya existe
en el código.

Hay algo previo que decidir: **el modelo no tiene concepto de sede**. `locations`
es el catálogo de departamentos y ciudades de Colombia para direcciones, no
sucursales; ninguna tabla tiene `locationId`. Si las tres sedes de Zoom van a
compartir una instancia, la sede es una dimensión nueva que atraviesa caja,
consecutivos e inventario. Si va a ser una instancia por sede, este hallazgo se
reduce a "filtra por la caja del usuario" y ya.

### Corrección aplicada

Esa decisión sigue pendiente, pero no hacía falta tomarla para cerrar el agujero.
Los siete puntos pasan ahora por un único resolvedor,
[`active-cash-session.util.ts`](../backend/src/modules/cash-session/active-cash-session.util.ts):

```ts
export async function findActiveCashSession(
  client: CashSessionClient,   // PrismaService o el `tx` de una transacción
  cashRegisterId?: string,
): Promise<ActiveCashSession | null>
```

**No adivina.** Sin caja indicada pide dos filas (`take: 2`, ordenadas por
`openedAt`) y distingue tres casos: ninguna abierta devuelve `null` —el
comportamiento que ya esperaban los llamadores, con su cola de abonos
pendientes—, una abierta la devuelve, y **varias abiertas fallan** con un
`ConflictException` que le dice al operario qué hacer. Perder un movimiento en la
caja equivocada cuesta mucho más de reconstruir que repetir la operación: ya
pasó con los pagos huérfanos.

El parámetro `cashRegisterId` es el camino sin ambigüedad posible, y es el que
habrá que usar el día que exista la dimensión de sede.

**Para High Solutions esto no cambia absolutamente nada hoy**, y está
comprobado contra producción, no supuesto: 78 sesiones históricas, **todas sobre
la misma caja, sin un solo solape entre cajas distintas**. La rama que falla es
inalcanzable mientras exista una sola caja. El día que se abra la segunda, en vez
de misregistrar el dinero en silencio, se detiene y avisa.

Dos detalles del diseño:

- El índice parcial `cash_sessions_one_open_per_register` (que ya existía)
  garantiza como máximo una sesión abierta por caja, así que dos resultados son
  siempre dos cajas distintas. El mensaje de error puede afirmarlo sin rodeos.
- El tipo `Pick<Prisma.TransactionClient, 'cashSession'>` deja que la misma
  función sirva para `this.prisma` y para el `tx` de una transacción en curso,
  que era la razón por la que dos de los siete sitios estaban duplicados.

`isAnySessionOpen` ([pending-cash-entries.service.ts:37](../backend/src/modules/cash-session/pending-cash-entries.service.ts#L37))
se deja como está a propósito: devuelve un booleano para un aviso de la UI y
nunca elige una sesión, así que no puede desviar dinero. Con dos cajas abiertas
diría "hay caja" y la escritura fallaría después con el mensaje correcto —una
inconsistencia de aviso, no de plata—. Ajustarla de verdad exige saber a qué sede
pertenece quien mira la pantalla, que es justo la decisión pendiente.

**Verificación**: `tsc --noEmit` limpio y la suite completa en verde (184 suites,
2784 tests), con 8 pruebas nuevas para el resolvedor. Los 19 mocks de
`cashSession.findFirst` de los specs de órdenes, OG, CP y devoluciones se
migraron a `findMany`.

---

## 4. Lectura‑modificación‑escritura sobre el stock: actualizaciones perdidas — **Media** · ✅ Corregido

[inventory.service.ts:128‑163](../backend/src/modules/inventory/inventory.service.ts#L128)
lee `currentStock`, calcula en memoria y escribe el valor absoluto:

```ts
const previousStock = new Prisma.Decimal(supply.currentStock);
newStock = previousStock.add(qty);
// …
client.supply.update({ where: { id }, data: { currentStock: newStock } })
```

Dos movimientos simultáneos sobre el mismo insumo leen el mismo `previousStock` y
el segundo pisa al primero: un movimiento queda registrado en el kardex pero su
efecto sobre el stock desaparece. Lo mismo en
[createExitFromWorkOrder:74‑94](../backend/src/modules/inventory/inventory.service.ts#L74).

Se arregla con la operación atómica de Prisma: `{ currentStock: { increment: qty } }`.

De paso, el comentario de la línea 156 dice "Crear movimiento y actualizar stock
atomicamente", pero cuando no se pasa `tx` —que es el caso de todo movimiento
manual, porque `createManualMovement` no abre transacción— el `Promise.all` son
dos consultas sueltas. Si falla la segunda, queda un movimiento en el kardex que
declara un stock que nunca se escribió.

### Corrección aplicada

Un único `applyStockDelta()` hace el cambio con `increment` / `decrement` y
**deriva el saldo anterior del resultado**, no de una lectura previa: así refleja
el valor real en el instante del cambio aunque otro movimiento haya entrado
entremedio.

La comprobación de stock insuficiente se movió después del descuento: se mira el
saldo resultante y, si quedó negativo, el `throw` revierte la transacción
completa. Comprobar antes, contra una lectura vieja, era justo lo que permitía
que dos movimientos simultáneos dejaran el stock bajo cero.

El `Promise.all` que se llamaba atómico sin serlo desapareció: `createMovement`
abre siempre su propia transacción. El parámetro `tx` opcional se eliminó porque
nadie lo usaba, y era la trampa que hacía creer lo contrario.

---

## 5. La salida por OT recorta el stock a cero y descuadra el kardex — **Media** · ✅ Corregido

```ts
const newStock = Prisma.Decimal.max(previousStock.sub(qty), new Prisma.Decimal(0));
```

Si la OT consume más de lo que hay, el stock se queda en cero y el movimiento se
graba igual, con `quantity` mayor que la diferencia entre `previousStock` y
`newStock`. El kardex deja de cuadrar consigo mismo y no hay ni error ni aviso:
el faltante real se pierde en silencio.

`createMovement` sí lanza `BadRequestException` por stock insuficiente. Son dos
criterios distintos para la misma situación.

Como el hallazgo 1 tiene esta ruta apagada, hoy no ha ocurrido nunca. Pero se
activa el día que se agregue el campo de cantidad, así que conviene resolver los
dos juntos.

### Corrección aplicada

Se quitó el recorte: el consumo se registra completo y el stock puede quedar
negativo.

**Es una decisión de negocio, y la dejo explícita para que el cliente pueda
cambiarla.** El trabajo ya se hizo: negar el cierre de la OT no devuelve el
material a la bodega, y solo trasladaría el problema a producción. Un saldo
negativo es la señal honesta de que el registro venía atrasado respecto a la
bodega, y la alerta de mínimo lo hace visible ese mismo día. La alternativa
—rechazar el cierre— bloquearía trabajo real por un dato de inventario que hoy
no es confiable.

El movimiento manual mantiene el criterio contrario y sí rechaza el sobregiro:
ahí no hay un hecho consumado que registrar.

De paso, las alertas de stock bajo salen ahora **después** del commit. Se
disparaban desde dentro de la transacción, así que avisaban de consumos que
todavía podían revertirse.

---

## 6. La valoración de inventario mezcla unidades de compra y de consumo — **Media**

[inventory.repository.ts:173](../backend/src/modules/inventory/inventory.repository.ts#L173):

```sql
CAST(COALESCE(s.current_stock * s.purchase_price, 0) AS FLOAT) as total_value
```

`purchase_price` es el precio de la **unidad de compra** (el rollo) y
`current_stock` se lleva en **unidad de consumo** (el metro). El insumo guarda
`conversionFactor` justo para salvar esa distancia, y **ese campo no se lee en
ninguna parte del código**: se guarda, se puede editar y nadie lo usa.

Un rollo de 50 m a $100.000, con 50 m en stock, se valoriza en $5.000.000.

En producción hay 2 insumos activos con unidad de compra distinta de la de
consumo y factor distinto de 1. Son pocos, pero su valor está inflado por el
factor.

---

## 7. Un alias SQL repetido deja un campo siempre vacío — **Baja**

[inventory.repository.ts:142‑143](../backend/src/modules/inventory/inventory.repository.ts#L142):

```sql
uom.name as unit_name,
uom.abbreviation as unit_name   -- ← debería ser unit_abbreviation
```

Dos columnas con el mismo alias. El driver se queda con una, así que el
`unit_abbreviation` que declara el tipo de TypeScript nunca llega, y lo que viaja
en `unit_name` no es necesariamente el nombre. El tipo del repositorio afirma
algo que la consulta no cumple, y TypeScript no puede detectarlo porque
`$queryRaw` confía en el tipo que uno le escriba.

La pantalla de alertas de stock bajo pinta `unit_name`; hoy muestra la
abreviatura donde dice mostrar el nombre.

---

## 8. Once de quince filtros paginados no tienen tope de `limit` — **Media** · ✅ Corregido

Estos DTO declaran `limit` con `@Min(1)` y sin `@Max`:

`orders`, `quotes`, `work-orders`, `expense-orders`, `attendance`, `prospects`,
`dtf`, `session-logs`, `payroll-deductions`, `production`, `inventory`.

Y los repositorios pasan el valor directo a Prisma (`take: limit`) en orders,
quotes, work-orders, expense-orders, attendance, prospects, dtf y session-logs.
Solo inventario acota con `Math.min(limit, 100)`.

`GET /orders?limit=100000` trae la tabla completa con todos sus `include`. No es
un agujero de seguridad —hace falta estar autenticado y con permiso de lectura—
pero sí una forma fácil de tumbar la API sin querer, y el backend no aguanta
réplicas para amortiguarlo.

La corrección es un `@Max(100)` en el DTO base y un `Math.min` en el repositorio,
por si alguien construye el filtro sin pasar por la validación.

### Corrección aplicada

Los topes viven en
[`common/dto/pagination.dto.ts`](../backend/src/common/dto/pagination.dto.ts),
un archivo que existía **vacío desde enero**. Dos constantes y un `clampPageSize()`.

`@Max(MAX_PAGE_SIZE)` —100— en los once filtros, y `clampPageSize()` en los ocho
repositorios que pasaban `take: limit` a Prisma. Son dos líneas de defensa
distintas y las dos hacen falta: la validación devuelve un 400 legible al que
pide de más, y el clamp cubre a quien arme el filtro desde un servicio sin pasar
por el `ValidationPipe`.

El techo de 100 no le quita nada a la interfaz: **ninguna tabla del frontend
ofrece más de 100 filas por página**, revisado uno por uno.

Órdenes es la excepción, con `MAX_REPORT_PAGE_SIZE` = 1.000, porque hay dos
pantallas que piden 500 y 1.000 filas para filtrar del lado del cliente. Bajarlas
a 100 las habría roto; dejarlas sin techo no arregla nada. El tope alto acota el
daño de 3.209 filas a 1.000 sin tocar lo que hoy funciona, y el comentario de la
constante dice cuándo bajarlo. Esas dos pantallas son el hallazgo 13.

De paso, el `meta` de la respuesta ahora informa el límite **efectivo**: antes
habría dicho `limit: 5000` junto a 100 filas, con un `totalPages` calculado sobre
una cifra que nunca se usó.

Al revisar los repositorios aparecieron cuatro más que el conteo inicial no vio,
porque escribían el `take` de otra forma: producción (`take: filters.limit`),
movimientos de caja, sesiones de caja e inventario —este último ya acotaba con
un `Math.min(limit, 100)` suelto, que se unificó con el helper—. Los tres
primeros sí pasaban el valor crudo.

**Cuentas por Pagar queda como la excepción documentada**, con
`MAX_EXPORT_PAGE_SIZE` = 100.000: su filtro ya llevaba ese techo a propósito para
la exportación a Excel, que se trae el rango completo sin paginar. Se respetó,
pero su comentario decía «el resto de listados del sistema no acota `limit`» y
eso dejó de ser cierto con este cambio, así que se actualizó.

---

## 9. Ningún paso de producción se puede marcar como omitido — **Media**

`ProductionStepStatus.SKIPPED` se lee en cinco lugares del servicio —cuenta como
avance, habilita el paso siguiente, permite cerrar la orden— y **no hay un solo
punto que lo escriba**. El controlador expone especificación, ejecución y
completar; nada más.

Tampoco hay forma de cancelar una orden de producción ni de reabrir un paso
cerrado por error: `completeStep` rechaza los pasos `COMPLETED` y no existe el
camino inverso.

En producción hay 6 órdenes de producción y las 6 están en `IN_PROGRESS`,
ninguna `COMPLETED`. No alcanza para concluir que se atascaron —el módulo es
reciente y pueden estar realmente en curso—, pero sí conviene preguntarle al
cliente si alguna lleva parada por un paso que no aplicaba.

---

## 10. La devolución calcula los montos sobre una lectura previa a la transacción — **Media**

En [refund-requests.service.ts:440](../backend/src/modules/refund-requests/refund-requests.service.ts#L440)
la orden se lee fuera de la transacción, y con esa foto se calculan
`newPaidAmount`, `newRefundedAmount`, `newReversedAmount` y `newBalance`. Dentro
de la transacción esos valores absolutos se escriben tal cual.

El `updateMany` con `executedAt: null` cierra bien la carrera de ejecutar la
misma devolución dos veces, pero no protege contra otra escritura sobre la misma
orden. Si entre la lectura y el commit se registra un pago, el `paidAmount` nuevo
se pisa con el viejo menos la devolución: el pago se borra.

La ventana es de milisegundos y hace falta que coincidan un pago y una devolución
sobre la misma OP, así que es poco probable. Pero es dinero, y el resto del
servicio —que está muy bien pensado en todo lo demás— ya usa el patrón correcto
en otros puntos.

---

## 11. Consecutivos que se queman fuera de la transacción — **Baja**

`generateNumber` se llama antes de abrir la transacción en dos sitios:

- [refund-requests.service.ts:477](../backend/src/modules/refund-requests/refund-requests.service.ts#L477) — `CASH_RECEIPT`
- [production-orders.service.ts:101](../backend/src/modules/production/production-orders.service.ts#L101) — `PRODUCTION_ORDER`

Si la transacción falla, el número ya se consumió y queda un hueco en la
numeración. En la orden de producción da igual. En el **recibo de caja** importa
más: es la numeración que se revisa cuando hay que reconstruir un día de caja, y
un salto obliga a explicar por qué.

---

## 13. Dos reportes de órdenes ya salen incompletos — **Media**

Apareció al ponerle techo a la paginación: son las dos pantallas que obligaron a
subir el tope de órdenes a 1.000.

**Producción tiene 3.209 órdenes.**

[SalesByAdvisorPage.tsx:146](../frontend/src/features/orders/pages/SalesByAdvisorPage.tsx#L146)
pide las primeras 1.000 órdenes, con todos sus `include`, **solo para sacar la
lista de asesores que han creado alguna**:

```ts
queryFn: () => ordersApi.getAll({ page: 1, limit: 1000 })
```

Es un `SELECT DISTINCT created_by_id` disfrazado de página de 1.000 filas. Y como
son 1.000 de 3.209, un asesor cuyas órdenes estén todas en las 2.209 más
antiguas **no aparece en el filtro**. No hay forma de notarlo desde la pantalla:
simplemente no está.

[PendingPaymentOrdersPage.tsx:76](../frontend/src/features/orders/pages/PendingPaymentOrdersPage.tsx#L76)
trae 500 órdenes sin filtrar por estado y decide del lado del cliente cuáles
tienen saldo. El `clientId` arranca en `undefined`, así que **al abrir la
pantalla el listado de cartera pendiente sale de las primeras 500 de 3.209**. El
comentario del código dice «limit alto para cubrir todas las pendientes»: cubría,
cuando había menos órdenes.

Las dos se arreglan del lado del servidor, no subiendo el límite:

- un endpoint que devuelva los asesores con órdenes (`DISTINCT`), que además
  ahorra traerse 1.000 órdenes completas en cada carga;
- mover el filtro de cartera pendiente al backend, como `paymentStatus`, que ya
  existe en `FilterOrdersDto`.

Mientras tanto ninguna de las dos empeora: el tope de 1.000 las deja exactamente
como estaban.

---

## 12. Mejoras menores

- ~~**`ADJUSTMENT` solo resta.**~~ ✅ Corregido junto con el hallazgo 2: se
  añadió `direction` (`INCREASE` / `DECREASE`), obligatorio para los ajustes.
- **`getLowStockSupplies()` es código muerto** y además está roto: compara con
  `this.prisma.supply.fields.minimumStock as any`. Nadie la llama; la versión
  `Raw` es la que se usa. Conviene borrarla antes de que alguien la adopte.
- **`PENDING` en órdenes de producción no existe en la práctica**: se crea con
  ese estado y se actualiza a `IN_PROGRESS` en la misma transacción, dos líneas
  después.
- **N+1 al crear una orden de producción**: un `create` por componente y otro por
  paso, dentro de la transacción. Con plantillas grandes acerca el tiempo límite
  de la transacción sin necesidad; `createMany` lo resuelve.
- **`validateRequiredExecutionFields` confía en el esquema**: si `fieldSchema`
  viniera nulo o sin `fields`, revienta con un 500 en vez de un mensaje claro.

---

## Verificación del bloque de inventario

Probado extremo a extremo en desarrollo, no solo con tests:

1. Se creó la OT **OT-2026-0152** desde OP-2026-0295 con dos insumos: Lona
   Brillante 10 oz (2,5 m²) y Propalcote 300 gr (4 plg). Las cantidades quedaron
   guardadas en `work_order_item_supplies` — lo que nunca había pasado.
2. Se agregó el segundo insumo **después** de escribir la cantidad del primero,
   para confirmar que ya no se borra.
3. Al pasar la OT a Completada se crearon los dos movimientos `EXIT`. El stock
   bajó de 80 a 77,5 y de 500 a 496, y en ambos
   `previous_stock - quantity = new_stock`.
4. Crear un insumo con stock inicial 150 generó su movimiento `INITIAL` con saldo
   anterior 0, motivo y responsable (`adminsistema`).
5. Editar un insumo responde 200 y ya no manda el stock; el campo aparece
   deshabilitado con la indicación de usar un ajuste.

Sin errores nuevos en consola. Los datos de prueba quedan en desarrollo con
nombres reconocibles («PRUEBA QA …»).

`tsc --noEmit` limpio en backend y frontend. Backend: 185 suites y 2.806 tests en
verde (incluye las 15 pruebas del tope de paginación). Frontend: 59 archivos y
497 tests en verde.

---

## Revisado sin hallazgos

- **Aprobación y rechazo de devoluciones**: `assertRefundStillViable` se
  revalida al autorizar y al pagar, la orden pagada por nómina se bloquea
  explícitamente, y el índice parcial `refund_requests_pending_unique` con
  `createOrReturnTwin` cierra el doble clic. El tratamiento de `refundedAmount` y
  `reversedNetAmount` es correcto.
- **Transiciones de OT**: `COMPLETED` es terminal, así que no hay forma de
  disparar dos veces la salida de inventario por la misma OT.
- **Restricción secuencial de pasos de producción**: valida el paso anterior por
  `order - 1` dentro del mismo componente, y los pasos se copian de la plantilla
  con `order` contiguo.
- **CRUD de portafolio** (productos, categorías de producto y de insumo,
  unidades de medida): unicidad validada, borrado lógico, guards y permisos por
  ruta en los cinco controladores.
- **Guards de producción e inventario**: `JwtAuthGuard` + `PermissionsGuard` con
  permiso por endpoint en los dos módulos.
- **Cron de stock bajo**: fija `timeZone: BUSINESS_TIMEZONE`, ya corregido en la
  tercera barrida.

---

## Fuera de alcance

Cartera (`portfolio` se revisó como catálogo; la cartera de clientes como
cobranza no se tocó), `prospects`, `quote-kanban-columns`, `comments` y
`commercial-channels`.

Sigue pendiente el hallazgo 8 de la tercera barrida: la marca de High Solutions
escrita en código.

---

## Orden sugerido

1. ~~**Hallazgo 3** — la caja.~~ ✅ Hecho. La decisión de si las 3 sedes
   comparten instancia sigue pendiente, pero ya no es un riesgo de dinero:
   el sistema falla en vez de adivinar.
2. ~~**Hallazgos 1, 2, 4, 5** — inventario.~~ ✅ Hecho, los cuatro juntos, más
   el sentido del ajuste (hallazgo 12) que hacía falta para que el 2 fuera
   usable.
3. ~~**Hallazgo 8** — el tope de paginación.~~ ✅ Hecho.
4. **Hallazgo 13** — los dos reportes incompletos. Es el más visible para el
   cliente de los que quedan: hoy muestran cifras de menos sin avisar.
5. **Hallazgos 6, 9, 10** — requieren decisión del cliente: cómo valorizar, si
   hace falta omitir pasos, y si vale la pena cerrar la ventana de la devolución.
6. **Hallazgos 7, 11 y las mejoras menores** — cuando haya espacio.
