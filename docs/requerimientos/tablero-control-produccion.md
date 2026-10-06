# Tablero de Control de Producción

**Requerimiento refinado y preguntas pendientes** · 5 de octubre de 2026

---

## 1. Qué entendimos

Quieres una pantalla muy visual donde todo el equipo vea, de un vistazo, qué órdenes van primero, cuáles están
retrasadas y en qué parte de la cadena de producción está cada una. El objetivo es que ningún trabajo se quede
"colgado" y que se cumplan los tiempos de entrega al cliente.

La idea es viable y casi toda la información de la tarjeta ya está en el sistema: número de OP, cliente, valor,
productos y asesor. Lo que sigue son los ajustes que proponemos para que el tablero funcione con el volumen real
de trabajo, y las preguntas que necesitamos resolver contigo antes de construirlo.

## 2. Lo que ya quedó definido

| Tema | Definición |
|---|---|
| Columnas del tablero | Por **asesor**. |
| Tarjeta | Una por **OP**, con el detalle de cada producto adentro. Si una OP tiene varios productos, cada uno puede ir en una etapa distinta y la tarjeta muestra el resumen (por ejemplo, "2 de 3 listos"). |
| Estado de diseño | Dos valores por ahora: **Pendiente de diseño** y **Diseño aprobado**. |
| Ventas de mostrador | **Sí entran** al tablero. |
| Valor de la orden | Lo ve todo el que tenga acceso al tablero. |
| Fecha para el semáforo | La **fecha de entrega de la OP**, que es la que ya existe y aplica para todas las órdenes. Si la orden no la tiene, la tarjeta sale en **gris ("sin fecha")**. |
| Fecha de entrega de la OP | Recomendamos que sea **obligatoria al confirmar la OP** (ver pregunta 1). Sin ese cambio, casi todo el tablero saldría en gris. |
| Fecha interna de producción | Queda para una segunda etapa: una fecha opcional en la misma OP, anterior a la del cliente, para que producción tenga un margen. El sistema la sugeriría sola y, si nadie la toca, el semáforo usa la del cliente. |

## 3. Lo que encontramos al revisar los datos reales

Revisamos cómo se está usando el sistema hoy, y hay cuatro hallazgos que cambian el diseño del tablero:

1. **El volumen es mucho mayor que el de la imagen de referencia.** En septiembre se crearon más de 1.300 OP:
   unas 55 por día hábil y cerca de 300 por semana. La imagen muestra 5 tarjetas en toda la semana. Además, la
   carga está concentrada en pocas personas: una sola asesora puede tener entre 20 y 40 órdenes en un mismo día.
2. **Casi ninguna OP tiene fecha de entrega.** Cerca del 98 % se crea sin fecha. Sin fecha no hay forma de ubicar
   la orden en un día ni de calcular el semáforo.
3. **Muchas órdenes no se cierran en el sistema.** Hay alrededor de 1.500 OP con más de 30 días que siguen
   figurando como abiertas (en borrador, confirmadas, en producción o listas). La mayoría ya están pagadas por
   completo, así que seguramente se entregaron y nadie cambió el estado.
4. **La OT se usa poco.** Solo alrededor del 6 % de las OP tiene una OT, y casi nunca se le asigna diseñador ni se
   le cambia el estado. Por eso el tablero se apoya en la OP y no en la OT: si dependiera de la OT, la gran
   mayoría de las órdenes (incluido todo el mostrador) quedaría por fuera.

Y una buena noticia: **prácticamente todas las OP sí tienen el área de producción** (DTF UV, DTF Textil,
Sublimación, Rígidos, Plotter…). Ese dato es confiable y lo vamos a aprovechar.

**Qué significa esto:** si construimos el tablero exactamente como en la imagen, el primer día mostraría cientos
de tarjetas, casi todas sin fecha y muchas en rojo por órdenes viejas que en realidad ya se entregaron. Por eso
proponemos los ajustes de las secciones 4 y 5.

## 4. Cómo proponemos que se vea

**Dos vistas que se alternan con un botón**

- **Por etapa (vista principal):** una columna por cada etapa de la cadena (diseño, producción, acabados, listo
  para entrega…). Responde directamente la pregunta "¿dónde se están colgando los trabajos?".
- **Por día y asesor:** la matriz de la imagen de referencia, con los días en filas y los asesores en columnas.

**Tarjetas pensadas para muchas órdenes**

- **Tarjeta compacta** de una línea: número de OP, cliente, valor, fecha, área de producción y color del semáforo.
  Al hacer clic se abre con los productos, el estado de diseño y la etapa de cada uno.
- **Orden por urgencia:** primero las vencidas, luego las más próximas a vencer y luego las de mayor valor.
- **Límite por casilla:** se muestran las más urgentes y un "+15 más" que abre la lista completa.
- **Mostrador agrupado:** las ventas rápidas de mostrador aparecen como un solo renglón resumen ("Mostrador de
  hoy: 32 órdenes, 4 vencidas") que se puede abrir, en lugar de 32 tarjetas sueltas.

**Semáforo**

- 🔴 **Rojo:** vencida y sin entregar.
- 🟡 **Amarillo:** al límite (el criterio exacto está en las preguntas).
- 🟢 **Verde:** en tiempo.
- ⚪ **Gris:** sin fecha. Nunca verde, para que la falta de fecha no se vea como "todo bien".

**Resumen y filtros**

- **Resumen en la parte de arriba:** En tiempo / Al límite / Vencidas / Sin fecha. Cada número es un botón que filtra el tablero.
- **Contadores en cada columna**, por ejemplo "Acabados · 12 órdenes · 3 vencidas".
- **Filtros que se recuerdan:** asesor, área de producción, rango de valor, "ocultar mostrador" y "solo vencidas".
  Con el filtro por área, cada puesto de trabajo puede ver únicamente lo suyo.
- **Bandeja "Por confirmar"** como pestaña aparte, porque al principio será la más grande.

**Un cambio frente a la imagen:** la barra de avance ("70 %") no tiene de dónde calcularse. Proponemos mostrar en
su lugar la etapa actual y cuánto tiempo lleva la orden en ella, que es lo que de verdad indica si está colgada.

## 5. Qué hacer con las órdenes antiguas sin cerrar

Las cerca de 1.500 OP abiertas con más de 30 días se dividen así:

| Grupo | Órdenes | Qué son probablemente | Qué recomendamos |
|---|---|---|---|
| Pagadas por completo | ~1.090 | Entregadas que nunca se marcaron | Cerrarlas como "Entregadas" de una sola vez, **con una lista que tú apruebes antes**. |
| Sin ningún abono | ~225 | Pedidos que no se concretaron | Entregar la lista a cada asesor para que anule o reactive. |
| Con abono parcial | ~225 (unos $89 millones de saldo) | Cartera por cobrar o trabajos realmente colgados | **No tocarlas.** Son justo lo que el tablero debe destapar; requieren revisión una por una. |

**Nuestra recomendación, en dos pasos:**

1. **El tablero arranca mostrando solo las órdenes recientes** (los últimos 30 días), con un aviso de "órdenes
   antiguas sin cerrar" que abre la lista. Así no se modifica ningún dato y el tablero no nace lleno de rojo.
2. **La limpieza se hace aparte**, con tu aprobación sobre la lista exacta.

**Un punto a tener en cuenta:** las comisiones se liquidan sobre órdenes entregadas y pagadas. Marcar de golpe
más de mil órdenes como entregadas puede inflar la comisión del mes en que se haga. Antes de ejecutar la limpieza
hay que definir a qué mes se asignan esas órdenes.

## 6. Preguntas pendientes

**Sobre los tiempos**

1. ¿Estás de acuerdo con que la fecha de entrega sea obligatoria al confirmar la OP? ¿Quién la define: el asesor o producción?
2. ¿Cuándo consideras que una orden está "al límite" (amarillo)? ¿Cuando se entrega hoy, cuando falta un día, dos días?
3. ¿Los sábados, domingos y festivos cuentan para los tiempos?
4. ¿Hay tiempos estándar por tipo de trabajo (por ejemplo, DTF un día, rígidos tres días)? Con eso el sistema
   podría sugerir la fecha automáticamente y dejaría de haber tantas órdenes sin fecha.

**Sobre las etapas**

5. ¿Cuál es la lista exacta de etapas, en orden? ¿"Acabados" aplica para todos los trabajos? ¿Hay un paso de control de calidad?
6. ¿Quién cambia la orden de etapa: el asesor, el diseñador, el operario o un jefe de producción?
7. ¿Lo harían desde un computador o desde el celular en la planta?
8. Cuando el diseño queda aprobado, ¿quién lo marca? ¿Hace falta guardar la evidencia de la aprobación del cliente (archivo, pantallazo de WhatsApp)?

**Sobre quién ve qué**

9. ¿Qué asesores deben aparecer como columnas? Hoy hay 11 usuarios que crean órdenes. ¿El usuario de mostrador tiene columna propia?
10. ¿Un operario de un área (Sublimación, DTF UV…) debe ver solo las órdenes de su área?
11. ¿El tablero se va a proyectar en un televisor o pantalla en producción?

**Sobre el alcance**

12. ¿Necesitas crear pedidos y exportar desde el tablero (los botones de la imagen), o es solo para consultar y mover etapas?
13. ¿La OT sigue como documento aparte, o prefieres que su información (diseñador, archivo) se
    maneje directamente en la OP? Lo preguntamos porque hoy la mayoría de las órdenes no tiene OT.
14. ¿Apruebas arrancar solo con las órdenes de los últimos 30 días y hacer la limpieza de las antiguas por aparte?
15. Para esa limpieza, ¿a qué mes se asignan las comisiones de las órdenes que se marquen como entregadas?

**Una tarea de orden que recomendamos de paso:** la lista de áreas de producción tiene nombres repetidos
(por ejemplo "diseño" y "Diseño", "dtf uv" y "DTF UV") y está mezclada con áreas administrativas (Caja, Finanzas,
Recursos Humanos). Conviene depurarla antes, porque el tablero va a filtrar y agrupar por área.

## 7. Fases propuestas

| Fase | Qué incluye | Qué se logra |
|---|---|---|
| **1. Tablero de consulta** | Tablero con la información que ya existe: órdenes por estado y por asesor, área de producción, semáforo donde haya fecha y bandeja de "sin fecha". Sin cambios en la forma de trabajar. | Ver de inmediato el estado real de la operación y cuántas órdenes están sin fecha o sin cerrar. |
| **2. Etapas y fechas** | Fecha de entrega obligatoria, fecha interna de producción (opcional), etapas de producción por producto, estado de diseño, mover tarjetas arrastrándolas e historial de cuándo pasó cada orden por cada etapa. | Trazabilidad completa de la cadena y semáforo confiable. |
| **3. Vistas avanzadas** | Matriz por día y asesor, modo pantalla para planta y reportes de tiempos por etapa (dónde se demoran más los trabajos). | Planeación semanal y detección de cuellos de botella. |

Con las respuestas de la sección 6 podemos entregar la estimación de tiempos de cada fase.
