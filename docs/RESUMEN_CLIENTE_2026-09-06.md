# Resumen para el cliente — 6 de septiembre de 2026

## 🐛 Corrección de errores

- **Doble clic en botones de dinero.** Registrar un pago, autorizar una orden de
  gasto o aprobar desde Caja podía ejecutarse dos veces si se hacía doble clic:
  el sistema alcanzaba a procesar las dos. Ahora solo entra la primera. Se
  aplicó en pagos, abonos, órdenes de pedido, cuentas por pagar, anulaciones y
  apertura y cierre de caja.

- **Solicitudes duplicadas y notificaciones de WhatsApp repetidas.** El mismo
  doble clic creaba dos solicitudes de autorización idénticas, con dos mensajes
  de WhatsApp, y la que nadie aprobaba se quedaba para siempre en «Solicitudes
  Pendientes». Se corrigió en las diez clases de solicitud del sistema.

- **Numeración consecutiva.** Bajo ciertas condiciones el sistema podía intentar
  asignar un número de orden o de recibo ya usado y fallar. Ahora el número se
  toma siempre contra los documentos que existen de verdad.

- **Filtro de fechas en Cotizaciones.** Al filtrar por rango, el último día
  elegido no aparecía. Buscar «del 24 al 24 de julio» devolvía cero, aunque ese
  día hubiera 10 cotizaciones. Ya se ven completas.

- **Dashboard financiero.** El rango de fechas terminaba a las 7:00 p. m. en vez
  de a la medianoche, y —más importante— **la última tarde de cada mes el
  dashboard mostraba el mes siguiente, en blanco**. Corregido: todo se calcula en
  hora de Colombia.

- **Listas de clientes con inactivos.** Al escoger cliente en una orden o
  cotización, la lista incluía clientes inactivos. Hoy hay 35 inactivos sobre
  1.046, y ya no aparecen.

- **Editar una Orden de Trabajo.** La lista de órdenes de pedido excluía
  justamente las que ya tenían OT, que son las que hacen falta al editar.

- **Filtro «solo cuentas sin OG».** En Cuentas por Pagar devolvía exactamente lo
  contrario: las que sí tenían orden de gasto.

- **Rango de fechas en «Mi Asistencia».** El último día del rango no se
  contabilizaba.

- **Anular un pago de Cuenta por Pagar descuadraba la caja.** Al anularlo, la
  cuenta volvía a deber pero la caja seguía registrando la salida del dinero, sin
  ninguna señal de por qué. Ahora la anulación también reversa el movimiento de
  caja. Además el pago ya no se borra: queda registrado como anulado, con quién
  lo hizo y cuándo, y se ve tachado en el historial.

- **Totales con decimales de más.** El porcentaje de retención se guardaba con
  un arrastre mínimo (0,01104 quedaba como 0,011040000000000001), y eso hacía que
  el total de la orden terminara con decimales imposibles. Afectó a 3 órdenes.
  Corregido de raíz: el porcentaje ahora se guarda limpio, en órdenes de pedido,
  órdenes de gasto y cuentas por pagar.

## ⚙️ Mejoras y seguridad

- **Permisos en Cotizaciones.** El módulo no estaba verificando permisos en el
  servidor: la pantalla escondía los botones, pero la operación se podía hacer
  igual. Quedó alineado con el resto del sistema. Esto tiene consecuencias que
  hay que decidir; están abajo.

- **Permisos en Registros de Auditoría.** El historial completo de cambios del
  sistema podía consultarlo cualquier usuario conectado. Ahora requiere el
  permiso correspondiente. El «Historial de Cambios» dentro de cada orden se
  mantiene visible como hasta hoy.

- **Protección contra pagos y órdenes duplicados.** Además del bloqueo del doble
  clic, órdenes de pedido y abonos llevan ahora un identificador que evita que se
  dupliquen si se pierde la conexión y la pantalla reintenta.

- **Revisión automática de la coherencia de los datos.** Se creó una
  herramienta que verifica, contra la base real, diez cosas que siempre deben
  cuadrar: que todo pago deje rastro en caja, que el saldo de una orden coincida
  con sus pagos, que la numeración no se repita, que no haya dos cajas abiertas a
  la vez. Se puede correr cuando se quiera y no modifica nada. Las decisiones 4 y 5
  de abajo salieron de ahí.

---

## 📌 Cinco decisiones que necesitamos de ustedes

### 1. ¿Los operarios deben poder crear cotizaciones?

Al activar los permisos quedó a la vista que el rol **operarios (12 usuarios)**
solo tiene permiso de *ver* cotizaciones, no de crearlas. En la práctica crearon
**2 cotizaciones en toda la historia del sistema**, la última el 8 de julio.

- Si fue algo puntual, no hay que hacer nada.
- Si quieren que puedan seguir creándolas, les habilitamos el permiso.

### 2. El rol «user» pierde el acceso a Cotizaciones

Ese rol **(2 usuarios)** no tiene ningún permiso de cotizaciones asignado, así
que al activar la verificación deja de ver el módulo. Hay que revisar si a esos
dos usuarios les corresponde otro rol, o si se les asignan los permisos.

### 3. Cuentas por Pagar con centavos que no se pueden cerrar

**68 cuentas por pagar tienen centavos en el total** (vienen de órdenes de gasto
con retenciones). Como los pagos se registran en pesos enteros, siempre queda un
residuo de menos de un peso que nadie puede saldar, y la cuenta se queda abierta.

Ya hay una así: **CP-2026-157, vencida por $0,20**.

Dos caminos, y es decisión de ustedes porque cambia lo que dice el documento:

- **Tolerancia de cierre**: un saldo menor a $1 se considera saldado y la cuenta
  se cierra sola.
- **Redondear el total** de la cuenta por pagar a peso entero cuando se crea
  desde la orden de gasto.

### 4. Tres órdenes con un saldo a favor que no existe

Por el problema de los decimales de arriba, tres órdenes quedaron con el total
mal guardado:

| Orden | Muestra hoy | Debería mostrar |
|---|---|---|
| OP-2026-2041 | Saldo a favor de $0,30 | Saldada, en cero |
| OP-2026-1465 | Saldo a favor de $0,32 | Saldada, en cero |
| OP-2026-1907 | Saldo a favor de $21.314,000000000003 | Saldo a favor de $21.314 |

Corregirlo significa ajustar el total de tres facturas ya cobradas. El cliente
pagó exactamente lo que se le cobró; lo que está mal es el número guardado, no la
plata. **No lo tocamos sin su visto bueno.**

### 5. Pagos antiguos sin registro en caja

**808 pagos registrados entre marzo y el 14 de agosto no quedaron reflejados en
el arqueo de caja.** El error que los causaba ya está corregido: de los 905 pagos
registrados desde el 15 de agosto, los 905 quedaron bien.

Lo que falta es decidir qué hacer con los viejos. La forma de arreglarlo ya está
definida —registrarlos en sesiones de caja de ajuste, cerradas, en una caja
aparte, sin tocar los arqueos ya firmados— pero nunca se ejecutó. Mientras tanto,
cualquier cuadre histórico de caja anterior al 15 de agosto va a dar corto.

---

## Resumen general

Esta jornada no agregó funcionalidades nuevas: fue una revisión completa del
sistema buscando errores, con foco en los flujos donde se mueve dinero. Se
revisaron uno por uno los puntos donde el sistema registra pagos, mueve caja,
numera documentos y filtra por fechas, y se corrigieron catorce problemas, varios
de ellos invisibles hasta que se comparan las cifras con lo que hay en la base de
datos.

El resultado es un sistema que no puede cobrar dos veces por un clic, que no
descuadra el arqueo al anular un pago, y cuyos filtros muestran lo que uno pide.
Además quedó una herramienta que revisa la coherencia de los datos cuando se
quiera, así que este tipo de problemas ya no dependen de que alguien los note.

Las cinco decisiones de arriba son las únicas que no podemos tomar nosotros:
tres son de operación —quién puede hacer qué— y dos son sobre corregir datos
históricos, que es plata ya cobrada y arqueos ya firmados.
