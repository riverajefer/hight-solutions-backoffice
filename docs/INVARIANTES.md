# Invariantes de datos

## Qué es esto

Un conjunto de afirmaciones que **siempre** deben ser verdad en la base, y un
script que las verifica.

```bash
cd backend && ./scripts/db-invariants.sh              # producción
cd backend && ./scripts/db-invariants.sh --env=development
```

No prueba el código: revisa el resultado. Es de solo lectura — se apoya en
`db-query.sh`, que abre la sesión con `default_transaction_read_only=on`, así
que apuntarlo a producción es seguro por construcción, no por disciplina.

## Por qué hace falta si hay 2582 tests

Porque **ninguno toca una base de datos**. De los 171 archivos de spec, 62
mockean Prisma directamente y el resto mockea repositorios, que es lo mismo un
nivel más arriba. No hay pruebas end-to-end.

Eso deja fuera dos clases enteras de error, que son justamente las que más ha
sufrido este sistema:

1. **Lo que solo existe en la base**: consecutivos desincronizados, índices
   únicos que faltan, `timestamp` sin zona horaria, `Decimal` contra coma
   flotante.
2. **Lo que pasa entre capas**: el frontend mandaba `includeInactive=false` y el
   backend lo leía como `true`. Cada lado, por separado, se comportaba bien.

Y hay algo peor que la falta de cobertura: en la auditoría del 6 de septiembre
aparecieron **dos tests que certificaban el bug** —uno afirmaba
`lte.getHours() === 23`, que es hora del servidor, y otro mockeaba un error de
Prisma con una forma que el adaptador de Postgres no produce—. Más tests
escritos igual habrían agregado confianza falsa, no seguridad.

Cada invariante de `scripts/sql/invariants.sql` está modelada sobre un bug real
que este sistema ya tuvo.

## Cómo leer la salida

| Estado | Significa |
|---|---|
| `OK` | Cero violaciones |
| `FALLA` | Hay violaciones **en los últimos 30 días**: algo se está rompiendo ahora |
| `DEUDA` | Solo hay violaciones viejas: datos inconsistentes que nadie ha saneado |

Códigos de salida, pensados para cron o CI: `0` todo bien o solo deuda, `1`
violaciones recientes, `2` error de ejecución. Con `--all`, la deuda histórica
también falla.

**La distinción entre FALLA y DEUDA es deliberada.** Un script que queda en rojo
permanente por datos viejos se deja de mirar, y ahí se pierde la alarma. Lo que
tiene que doler es lo que se rompió esta semana.

## Estado al 6 de septiembre de 2026

```
FALLA    Pagos que mueven dinero sin rastro en caja                    808        106
FALLA    Montos guardados con más de dos decimales                       3          3
FALLA    Cuentas por pagar atrapadas por centavos                        1          1
DEUDA    Órdenes cuyo saldo pagado no cuadra con sus pagos               1          0
OK       (las otras seis)
```

Qué significa cada una, verificado:

- **808 pagos sin rastro en caja**: es deuda histórica, no una fuga abierta. El
  último se creó el **14 de agosto**; de los 905 pagos registrados desde el 15 de
  agosto, **los 905 tienen rastro**. Las tres causas ya estaban corregidas; lo
  que nunca se hizo fue sanear los datos viejos. Los 106 «recientes» son los del
  7 al 14 de agosto, que todavía caen dentro de la ventana de 30 días y saldrán
  solos.
- **3 montos con más de dos decimales**: OP-2026-2041, OP-2026-1465 y
  OP-2026-1907 tienen saldos como `-0.304000000000670`. **Rastreado hasta el
  origen y corregido en el código**: el residuo no estaba en el cálculo del
  saldo —que ya usaba `Decimal`— sino en la **tasa**. El formulario manda
  `1.104 / 100`, que en coma flotante es `0.011040000000000001`, y esa tasa se
  guardaba tal cual y multiplicaba el subtotal. Ahora las tasas se normalizan a
  seis decimales al guardarlas (`normalizeRate`), en órdenes, órdenes de gasto y
  cuentas por pagar. Las 3 filas viejas siguen ahí: ver *Pendiente*.
- **CP-2026-157**: la cuenta atrapada por $0,20, pendiente de decisión del
  cliente.
- **1 orden descuadrada**: OP-2026-0306 marca `paid_amount = 0` con un pago vivo
  de $9.000.

En la base de desarrollo el script encontró además **3 consecutivos por detrás
del último documento emitido** — exactamente el escenario que el generador
corregido ahora resuelve solo, y el que va a encontrarse el clon de Zoom apenas
se siembre la base.

## Agregar una invariante

Se editan las CTE de `scripts/sql/invariants.sql` y se suma una línea al
`SELECT` final. Dos reglas:

- **El nombre dice qué se rompió, no qué se midió.** «Pagos sin movimiento de
  caja» sirve; «chequeo 7» no.
- **Cada una nace de un bug real.** Si no puedes nombrar el incidente que la
  motivó, probablemente estés midiendo por medir.

Cuando la invariante tiene una marca de tiempo útil, se agrega también la cuenta
de los últimos 30 días (`n30`); si no, se repite el total.

## Pendiente

- Ponerlo en cron (diario) y mandar el resultado a donde se lea. Hoy hay que
  correrlo a mano.
- Sanear los 3 totales con residuo. El redondeo al peso entero deja
  OP-2026-2041 y OP-2026-1465 en saldo exactamente cero (hoy muestran un saldo a
  favor de $0,30 que nadie puede entregar) y a OP-2026-1907 con su saldo a favor
  real de $21.314 sin la cola de decimales. Es una escritura sobre totales
  históricos, así que **la decide el cliente, no nosotros**.
- Sanear los 808 pagos huérfanos. La decisión de cómo ya está tomada —sesiones
  de ajuste cerradas en una caja aparte, sin reabrir las originales— pero en
  producción nunca se ejecutó: solo existe la caja principal.
