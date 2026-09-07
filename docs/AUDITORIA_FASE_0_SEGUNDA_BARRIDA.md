# Segunda barrida — Fase 0

Fecha: 2026-09-06 · Rama: `develop` · Tras corregir los 5 hallazgos de
[AUDITORIA_FASE_0.md](./AUDITORIA_FASE_0.md)

La primera barrida salió de hipótesis conocidas (memorias del proyecto). Esta
apunta a zonas que aquella no tocó: **autorización, zonas horarias,
transacciones y aritmética de dinero**.

Cada hallazgo trae su verificación contra producción, en solo lectura.

---

## 1. El módulo de Cotizaciones no verifica permisos — **Alta** · ✅ Corregido

[quotes.controller.ts:35](../backend/src/modules/quotes/quotes.controller.ts#L35)
tiene `@UseGuards(JwtAuthGuard)` y **nada más**: ni `PermissionsGuard`, ni un
solo `@RequirePermissions` en sus 8 rutas. El servicio tampoco verifica nada.

Los permisos existen y están repartidos por rol en producción:

| Rol | Usuarios | ¿tiene `delete_quotes`? |
|---|---|---|
| admin | 5 | sí |
| contabilidad | 2 | no |
| Comercial | 12 | no |
| Comercial Líder | 1 | no |
| operarios | 12 | no |
| caja / diseño / user | 4 | no |

**Solo 5 usuarios deberían poder borrar cotizaciones. Hoy pueden los 36**, con
solo estar autenticados: `DELETE /quotes/:id` y `POST /quotes/:id/convert` —que
crea una OP y quema un consecutivo— no piden permiso alguno. La interfaz esconde
los botones; la API no.

**Y el alcance por asesor también es solo de fachada.** `read_all_quotes` se
aplica en el frontend, inyectando `createdById` en
[QuoteKanbanBoard.tsx:55](../frontend/src/features/quotes/components/kanban/QuoteKanbanBoard.tsx#L55).
Como el backend acepta `createdById` como un filtro más, cualquiera lo quita de
la petición y ve todo. En `QuotesListPage` ni siquiera se inyecta.

### Corrección aplicada

`PermissionsGuard` + `@RequirePermissions` en las 8 rutas
([quotes.controller.ts](../backend/src/modules/quotes/quotes.controller.ts)), y
el alcance por asesor movido al servicio
([quotes.service.ts](../backend/src/modules/quotes/quotes.service.ts)): se
deriva del usuario del token y **pisa** el `createdById` que venga del cliente.
Con `read_all_quotes`, ese parámetro sigue funcionando como filtro de pantalla.

Cinco pruebas nuevas cubren el alcance, incluida la evasión concreta: mandar el
id de otro asesor en la query.

### Quién pierde acceso — hay que avisarle al cliente

Esto es control de acceso que nunca se aplicó, así que ponerlo **cambia lo que
algunos usuarios pueden hacer hoy**:

| Rol | Usuarios activos | Qué cambia |
|---|---|---|
| `user` | 2 | No tiene ningún permiso de cotizaciones: pierde el acceso completo al módulo |
| `caja` | 1 | Solo `create_quotes` y `read_quotes`: pierde editar y convertir, y pasa a ver solo las propias |
| `operarios` | 12 | Solo permisos de lectura: pierde crear, editar y convertir |
| `Comercial` | 8 | Pierde borrar (nunca tuvo `delete_quotes`) |

**El único caso con uso real medido**: los operarios crearon **2 cotizaciones**
en toda la historia, la última el 8 de julio de 2026. Las conversiones a OP no
las hizo ningún rol sin permiso (0 órdenes con `quote_id`).

Si crear cotizaciones desde operarios era intencional, la solución no es quitar
el guard: es darle `create_quotes` a ese rol.

---

## 2. El filtro de fechas de Cotizaciones pierde el último día completo — **Alta** · ✅ Corregido

[quotes.service.ts:34](../backend/src/modules/quotes/quotes.service.ts#L34) hace
`new Date(filters.dateFrom)` en vez de usar `startOfDay`/`endOfDay` de
[date-range.util.ts](../backend/src/common/utils/date-range.util.ts), que existe
justo para esto y documenta el error exacto que se está cometiendo.

El frontend manda `2026-09-06` (fecha simple, según la convención del proyecto).
`new Date('2026-09-06')` es medianoche **UTC**, y se usa como `lte`. Una
cotización creada ese día a las 10:00 de Colombia está guardada como `15:00`, que
es mayor → **queda fuera**.

**Verificado contra producción**: el 24 de julio hay 10 cotizaciones. Filtrando
del 24 al 24, la consulta devuelve **0**.

```
 dia_con_mas_cotizaciones | cotizaciones_reales | devuelve_el_filtro_hoy_a_hoy
 2026-07-24               |                  10 |                            0
```

Pasa en los 88 días con cotizaciones: el día que elijas como "hasta" desaparece
entero. Y el borde de inicio arrastra 5 horas de la tarde anterior.

### Corrección aplicada

`startOfDay`/`endOfDay` en
[quotes.service.ts](../backend/src/modules/quotes/quotes.service.ts), como ya
hacen órdenes, OG, OT, DTF y clientes.

**Verificado contra los mismos datos de producción**, con los límites que produce
el código corregido:

```
 antes_del_arreglo | con_el_arreglo | reales_de_ese_dia
                 0 |             10 |                10
```

Dos pruebas nuevas: una fija los límites esperados (`00:00:00.000-05:00` a
`23:59:59.999-05:00`) y otra comprueba el caso que reventaba — que una
cotización creada a media mañana del día elegido como «hasta» caiga dentro del
rango.

---

## 2b. «Mi Asistencia» pierde el último día por la razón inversa — **Media** · ✅ Corregido

Mismo síntoma, mecanismo distinto, y apareció al revisar quién más parsea fechas
a mano.

`attendance.service.ts` hace `new Date(filters.endDate)`, lo cual está bien: ahí
los filtros son instantes ISO completos, no días, y así lo documenta
`date-range.util.ts`. El problema está en el otro extremo:
[MyAttendancePage.tsx:307](../frontend/src/features/attendance/pages/MyAttendancePage.tsx#L307)
manda `date?.toISOString()` directo del `DatePicker`, o sea **la medianoche del
día elegido**. Como se usa de límite superior, todo lo que pasó ese día después
de las 00:00 queda fuera.

Los filtros rápidos (semana, mes) no lo sufren: su `endDate` es el instante
actual. Solo el rango manual.

### Corrección aplicada · ✅

`handleEndDateChange` ahora manda el último instante del día elegido, con un
helper local `endOfLocalDay`. El `startDate` se queda como está: la medianoche
del día elegido es justo el límite inferior correcto.

---

## 3. Anular un pago de Cuenta por Pagar no anula su movimiento de caja — **Alta** · ✅ Corregido

[accounts-payable.service.ts:473](../backend/src/modules/accounts-payable/accounts-payable.service.ts#L473)
borra la fila del pago y actualiza el saldo de la CP. No toca el `CashMovement`.

En producción, **185 de los 187 pagos de CP tienen movimiento de caja asociado**.
Al "anular" uno, la CP vuelve a deber, pero la caja sigue registrando la salida:
el arqueo queda descuadrado y sin rastro de por qué.

Es exactamente el modelo que el resto del sistema ya resolvió con `isVoided`
—y que el flujo hermano de reversión (`accounts-payable-payment-reversal-requests`)
sí aplica bien. Hay dos caminos para deshacer el mismo pago y solo uno es
correcto.

**Dos problemas más en las mismas 25 líneas:**

- **El pago se borra, no se anula.** Se pierde el rastro: quién lo registró,
  cuándo, con qué soporte. Es lo contrario de lo que se decidió para los pagos de
  OP tras el caso OP-2026-1504.
- **Las dos escrituras van fuera de transacción**
  ([líneas 492-497](../backend/src/modules/accounts-payable/accounts-payable.service.ts#L492)):
  si la segunda falla, el pago desaparece y la CP queda diciendo que está pagada.

### Corrección aplicada

**No hizo falta migración**: el modelo correcto ya existía. El flujo hermano de
reversión con aprobación (`accounts-payable-payment-reversal-requests`) usa
`isReversed` + `reversedAt` sobre `account_payable_payments` y anula el
`CashMovement` dentro de una transacción. `deletePayment` ahora hace exactamente
lo mismo, así que las dos formas de deshacer un pago de CP quedan alineadas.

Tres cambios en `deletePayment`:

1. Marca `isReversed` en vez de borrar la fila.
2. Anula el `CashMovement` (`isVoided`, quién y por qué). La anulación es
   administrativa: no exige que la caja del pago siga abierta, igual que la
   reversión.
3. Todo en una transacción, y el saldo se **recalcula desde los pagos vivos** en
   vez de restarle el monto al acumulado — así una CP que ya venía descuadrada se
   corrige sola al anular, en lugar de arrastrar el error. De paso desaparece la
   resta en coma flotante del hallazgo 7 en este camino.

**La pantalla también cambió.** Un pago anulado que sobrevive en la tabla pero se
ve idéntico a uno vivo es peor que borrarlo: los tres `select` de pagos ahora
exponen `isReversed`/`reversedAt`, y
[PaymentHistoryTable.tsx](../frontend/src/features/accounts-payable/components/PaymentHistoryTable.tsx)
muestra el monto tachado con un chip «Anulado» y esconde el botón de anular.

Se borró `AccountsPayableRepository.deletePayment`, que quedó sin uso: dejarlo
era invitar a repetir el patrón viejo.

**Siete pruebas nuevas**, incluidas las dos que atrapan el bug original (que se
anule el movimiento de caja, y que no se toque cuando el pago no tuvo
movimiento) y la de recálculo del saldo partiendo de una CP descuadrada.

**Nota**: en producción hay **0 pagos de CP anulados** hasta hoy, así que no hay
datos que sanear. El flujo de reversión con aprobación tampoco se ha usado nunca.

---

## 4. El dashboard financiero corta el último día a las 6:59 p. m. — **Media** · ✅ Corregido

[dashboard.service.ts:80](../backend/src/modules/dashboard/dashboard.service.ts#L80)
hace `lte.setHours(23, 59, 59, 999)`. `setHours` trabaja en la zona horaria **del
servidor**, que en Railway es UTC: 23:59 UTC son las 18:59 de Colombia. El rango
también empieza 5 horas antes de lo pedido, incluyendo la tarde del día anterior.

**Impacto real hoy, medido**: la operación es de 8 a 18 horas, así que solo 7
órdenes de 2779 en todo 2026 caen después de las 19:00 y quedarían fuera. Es un
bug real de corrección, no una urgencia — pero muerde el día que alguien facture
de noche o cambien los horarios.

### Corrección aplicada

`startOfDay`/`endOfDay` para el rango explícito y `businessToday()` para el mes
por defecto, en
[dashboard.service.ts](../backend/src/modules/dashboard/dashboard.service.ts).

**Apareció un segundo problema en el mismo método**: el mes por defecto se
calculaba con `new Date(now.getFullYear(), now.getMonth(), 1)`, o sea el
calendario del servidor. En UTC, la última tarde de cada mes —a partir de las
7:00 p. m. de Colombia— el dashboard ya mostraba el mes siguiente, vacío. Eso
tenía más impacto que el corte del último día: pasaba una vez al mes, a la hora
en que se cierra.

Dos pruebas: una fija los límites en instantes absolutos (para no depender de la
zona donde corran los tests) y otra comprueba que una venta de las 8 de la noche
del último día caiga dentro del rango.

---

## 5. Un controlador muerto expone los registros de auditoría sin ningún guard — **Media** · ✅ Corregido

[audit-logs.example.controller.ts](../backend/src/modules/audit-logs/audit-logs.example.controller.ts)
declara `@Controller('audit-logs')` con **cero guards** y consulta Prisma
directamente.

**No está registrado en ningún módulo**, así que hoy no es una vulnerabilidad
activa: lo verifiqué buscando referencias en todo el `src`. Pero está a una línea
de `controllers: [...]` de publicar toda la auditoría sin autenticación, y el
nombre (`.example.`) invita a que alguien lo registre "para probar". El clon de
Zoom se lo llevaría igual.

**Corrección aplicada**: borrado.

---

## 6. Auditoría y notificaciones no verifican permisos — **Media** · ✅ Corregido

Ambos controladores tienen `JwtAuthGuard` pero ningún `@RequirePermissions`:

- **Auditoría**: el permiso `read_audit_logs` existe y solo lo tienen admin y
  contabilidad (7 usuarios). Como el controlador no lo pide, **los 36 usuarios
  pueden leer toda la auditoría del sistema**: quién cambió qué, en qué orden, con
  qué valores.
- **Notificaciones**: no hay permisos definidos para el módulo y las consultas se
  acotan por el usuario del token, así que el riesgo es menor.

### Corrección aplicada

**Auditoría**: `PermissionsGuard` + `read_audit_logs` en las cuatro rutas de
navegación global (`/`, `/latest`, `/user/:userId`, `/model/:modelName`).

**`/record/:recordId` va aparte, y esta es la decisión que importa.** Ese
endpoint alimenta la pestaña «Historial de Cambios» del detalle de orden, que
**no está tras ningún permiso en el frontend**: la ve cualquiera que pueda abrir
una orden. Ponerle `read_audit_logs` (solo admin y contabilidad, 7 usuarios)
habría dejado sin historial a los 8 comerciales que usan esa pantalla a diario.
Pide `read_orders`, el permiso de la entidad que se está mirando.

> **Queda un residuo, anotado en el código**: el endpoint es genérico y acepta
> cualquier `recordId`, así que con `read_orders` también se puede leer el
> historial de otros modelos. Cerrarlo del todo pide acotarlo por tipo de
> entidad, que es un refactor aparte.

**Notificaciones: revisado y sin cambios.** Las cinco rutas toman el `userId` de
`@CurrentUser`, nunca del cliente, y las escrituras usan `updateMany`/`deleteMany`
con `userId` en el `where`. No hay forma de leer ni tocar las notificaciones de
otro. No hacía falta tocar nada.

**Una prueba nueva para que esto no se pierda otra vez**:
[controller-permissions.spec.ts](../backend/src/common/guards/controller-permissions.spec.ts)
verifica el permiso declarado en cada ruta de Cotizaciones y Auditoría, y falla
si alguna se queda sin ninguno. Quitar un decorador no rompe ningún test de
comportamiento —solo abre la puerta— así que hacía falta algo que lo hiciera
ruidoso.

---

## 7. Aritmética de dinero en coma flotante en Cuentas por Pagar — **Baja** · ✅ Corregido

[accounts-payable.service.ts:482](../backend/src/modules/accounts-payable/accounts-payable.service.ts#L482)
y
[accounts-payable-payment-reversal-requests.service.ts:232](../backend/src/modules/accounts-payable-payment-reversal-requests/accounts-payable-payment-reversal-requests.service.ts#L232)
restan `Number(decimal) - Number(decimal)` en vez de usar `Prisma.Decimal`. Es
justo el patrón que produce `234567.88000000012`.

**No hay daño hoy**: cero filas en producción con más de 2 decimales en
`paid_amount` o `balance`. Pero la comparación `newPaidAmount <= 0` decide el
estado de la CP, y un residuo de `1e-10` la dejaría en PARTIAL para siempre.

### Corrección aplicada

`Prisma.Decimal` en los cuatro puntos donde el resultado **se guarda**:

- `executePayment` — la suma del pago y el saldo resultante, que es lo que
  decide si la CP queda PAID.
- Los dos recálculos de `balance` al cambiar el total de la CP
  (`update` y `syncFromExpenseOrder`).
- La reversión con aprobación de Caja.

Las comparaciones que solo validan (`dto.amount > currentBalance`, la suma de
cuotas) se dejaron en `Number`: no acumulan nada en la base.

**En la reversión aproveché para hacer el mismo cambio que en la anulación**: el
saldo se recalcula desde los pagos vivos en vez de restarle el monto al
acumulado. Con eso desaparecen los dos topes defensivos que había
(`newPaidAmount < 0 ? 0` y `newBalance > total ? total`), que existían justamente
para tapar la deriva que producía la resta.

**Verificado contra producción**: cero CP con `paid_amount` distinto de la suma
de sus pagos vivos, así que no hay nada que sanear.

Los tests tenían las cifras clavadas como números; se hicieron indiferentes al
tipo (comparan valor, no representación) y se agregó un caso de reversión con
otros pagos vivos, partiendo a propósito de una CP con el acumulado corrupto.

---

## 8. Las CP con centavos no pueden cerrarse — **Baja**

**68 de las cuentas por pagar tienen centavos en el total** (vienen de OG con
retenciones, que no aplican el redondeo comercial). Los pagos se registran en
pesos enteros, así que sobra un residuo que nadie puede saldar.

Ya hay una atrapada: **CP-2026-157, en OVERDUE por $0,20**.

```
  ap_number  | status  | total_amount | paid_amount | balance
 CP-2026-157 | OVERDUE |     16279.20 |    16279.00 |    0.20
```

**Corrección posible**: tolerancia de cierre (saldo < $1 se considera saldado) o
redondear el total de la CP a peso entero al crearla desde la OG. Es decisión del
cliente, no técnica — conviene preguntarle.

---

## Revisado sin hallazgos

- **Zona horaria en el resto del sistema**: órdenes, OG, OT, DTF y clientes usan
  `date-range.util.ts` correctamente, con offset fijo `-05:00` (Colombia no tiene
  horario de verano). El cron de expiración de aprobaciones también fija
  `timeZone`.
- **Guards en el resto de controladores**: los 40 restantes aplican
  `JwtAuthGuard` + `PermissionsGuard` con permisos por ruta.
- **Catch vacíos**: ninguno en los módulos de dinero.

---

## Orden sugerido

1. Hallazgo 1 (permisos de cotizaciones) — es control de acceso roto y hay 31
   usuarios de más con capacidad de borrar.
2. Hallazgo 3 (anulación de pago de CP) — descuadra la caja en silencio.
3. Hallazgo 2 (fechas de cotizaciones) — visible para el usuario todos los días.
4. Hallazgos 5 y 6 — borrar el controlador muerto y poner los permisos.
5. Hallazgos 4, 7 y 8 — correcciones de fondo, sin urgencia.
