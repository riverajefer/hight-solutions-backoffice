# Novedades de nómina — Análisis del requerimiento

**Fecha:** 2026-10-24
**Estado:** borrador para revisión con el cliente y su contador
**Requerimiento del cliente (textual):**

> "En el módulo de nómina deberíamos tener un submódulo de novedades, es decir:
> *incapacidades - ya que no se paga subsidio de transporte
> *Liquidación por terminación de contrato"

> **Aviso.** Este es un análisis técnico y funcional. Las cifras legales (salario mínimo, auxilio de transporte, porcentajes de incapacidad, fórmulas de prestaciones) deben confirmarse con el contador antes de construir. Donde la norma admite interpretación o la empresa tiene una política propia se marca con **⚖️ Validar con contador**.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Situación actual (código y datos de PRD)](#2-situación-actual-código-y-datos-de-prd)
3. [Marco legal resumido](#3-marco-legal-resumido)
4. [Propuesta: submódulo «Novedades»](#4-propuesta-submódulo-novedades)
5. [Propuesta: liquidación por terminación de contrato](#5-propuesta-liquidación-por-terminación-de-contrato)
6. [Modelo de datos propuesto](#6-modelo-de-datos-propuesto)
7. [Plan por fases](#7-plan-por-fases)
8. [Riesgos](#8-riesgos)
9. [Preguntas abiertas para el cliente y el contador](#9-preguntas-abiertas-para-el-cliente-y-el-contador)

---

## 1. Resumen ejecutivo

- **Son dos cosas distintas** y conviene construirlas en ese orden:
  1. **Novedades** (incapacidades, y por extensión licencias, vacaciones, ausencias): eventos con fecha de inicio y fin que cambian *cómo se liquida la quincena* — menos días pagados por la empresa, valor de incapacidad, y **sin auxilio de transporte** en esos días.
  2. **Liquidación por terminación**: un documento aparte, de una sola vez, que calcula salario pendiente, cesantías, intereses, prima, vacaciones y, si aplica, indemnización.
- **Hallazgo principal: el CRM hoy no registra auxilio de transporte.** En los 129 registros de nómina en PRD el campo «Auxilio de transporte» está en $0 o vacío. Sin embargo, todos los empleados con salario en el sistema ganan entre $1,7M y $3M, por debajo del tope de 2 SMMLV, así que en principio todos tendrían derecho. Antes de construir la regla «en incapacidad no se paga auxilio» hay que saber **dónde se paga hoy el auxilio** (¿fuera del CRM?, ¿sumado al salario?). Si va dentro del salario, la regla no se puede aplicar porque el sistema no sabe cuánto es auxilio.
- **El campo actual «Días no remunerados / incapacidad» nunca se ha usado** (0 de 129 registros) y mezcla dos cosas que la ley trata distinto: un día no remunerado se descuenta completo; un día de incapacidad se paga, pero al 66,67 % y a veces por la EPS.
- **La liquidación depende de historia que el CRM no tiene**: vacaciones ya disfrutadas, primas ya pagadas, cesantías ya consignadas al fondo, fecha y motivo de retiro. Los 2 empleados inactivos en PRD no tienen fecha de retiro ni motivo. La primera versión debe pedir esos datos a mano y precargar lo que sí sabe.
- **Recomendación:** hacer primero Novedades (Fase 1, valor inmediato en cada quincena), después Liquidación (Fase 2). Ambas quedan listas para la nómina electrónica DIAN, que reporta exactamente estos conceptos (ver [análisis de facturación electrónica §12.3](./ANALISIS_FACTURACION_ELECTRONICA.md#123-nómina-electrónica)).

---

## 2. Situación actual (código y datos de PRD)

### 2.1 Cómo funciona hoy la nómina

- `PayrollPeriod` (quincena) → un `PayrollItem` por empleado → `PayrollPayment` (abonos).
- El `PayrollItem` es **una fila de valores digitados a mano**: días trabajados, salario base, horas extra, comisiones, descanso, auxilio de transporte, descuento de jornada, préstamos, anticipos, «días no remunerados / incapacidad», EPS/pensión, fondo de empleados, descuento de OP.
- El único cálculo automático es el salario base: `(salario mensual / 30) × días trabajados` ([PayrollItemFormPage.tsx](../frontend/src/features/payroll/pages/PayrollItemFormPage.tsx)). El total suma ingresos y resta descuentos en el frontend.
- Al clonar un periodo, el auxilio de transporte se copia como «valor fijo» ([payroll-periods.service.ts](../backend/src/modules/payroll/periods/payroll-periods.service.ts)) — es decir, el sistema asume que el auxilio no cambia entre quincenas, que es justo lo que una incapacidad rompe.
- No existe ningún registro de eventos con rango de fechas (incapacidad, vacaciones, licencia) ni de retiro del empleado.

### 2.2 Datos de producción (consulta del 2026-10-24)

| Dato | Valor |
|---|---|
| Empleados activos | 25 (18 «indefinido», 7 sin tipo de contrato) |
| Empleados inactivos | 2, sin fecha ni motivo de retiro |
| Empleados con salario $1 (marcador) | 5 |
| Rango de salarios reales | $1.700.000 – $3.000.000 |
| Periodos | 10, todos quincenales; 4 pagados (ago–oct 2026) |
| Registros de nómina | 129 |
| Con auxilio de transporte > 0 | **0** |
| Con «días no remunerados / incapacidad» > 0 | **0** |
| Con observaciones que mencionen incapacidad, licencia, vacaciones o retiro | **0** |

**Observaciones que el contador debería ver** (no son parte del requerimiento, pero salen al revisar):

- El descuento de EPS + pensión es $70.036 por quincena para casi todos, sin importar si ganan $2M o $3M. Eso equivale al 8 % sobre la mitad de un salario mínimo, es decir, se está cotizando sobre el mínimo. Puede ser correcto si parte del pago no es salarial, pero afecta directamente la base de las incapacidades y de la liquidación. **⚖️ Validar con contador.**
- Hay un salario de $1.700.000, por debajo del SMMLV 2026. Puede ser un dato desactualizado.

---

## 3. Marco legal resumido

Cifras 2026 de referencia (**⚖️ confirmar con contador**): SMMLV $1.750.905; auxilio de transporte $249.095 mensual; tope para tener derecho al auxilio: hasta 2 SMMLV ($3.501.810).

### 3.1 Auxilio de transporte

- Se paga **solo por los días efectivamente trabajados** (Ley 15 de 1959). En días de incapacidad, vacaciones y licencias el trabajador no se desplaza, así que **no se paga**. Esto es lo que pide el cliente.
- Sí entra en la base de **cesantías, intereses y prima** (no en vacaciones). Importa para la liquidación.

### 3.2 Incapacidades

| Origen | Quién paga | Cuánto |
|---|---|---|
| Común (enfermedad general), días 1–2 | Empresa | 66,67 % del salario |
| Común, días 3–90 | EPS (la empresa paga y recobra) | 66,67 % |
| Común, días 91–180 | EPS | 50 % |
| Común, día 181 en adelante | Fondo de pensiones | 50 % |
| Laboral (accidente o enfermedad laboral) | ARL (el día del accidente, la empresa) | 100 % |
| Licencia de maternidad (18 semanas) | EPS | 100 % |
| Licencia de paternidad (2 semanas) | EPS | 100 % |

- El valor diario de una incapacidad **no puede ser inferior al salario mínimo diario**.
- Es habitual que el empleador pague al trabajador directamente y luego **recobre a la EPS/ARL**. Ese recobro es una cuenta por cobrar de la empresa que hoy no se registra en ningún lado.
- Muchas empresas pagan el 100 % por política propia. **⚖️ Preguntar cuál es la política de la empresa.**
- Las prórrogas (una incapacidad que continúa a otra) suman días para los tramos de la tabla.

### 3.3 Liquidación por terminación de contrato

| Concepto | Fórmula | Base |
|---|---|---|
| Salario pendiente | salario/30 × días del último periodo sin pagar | Salario |
| Cesantías | (salario + auxilio) × días trabajados en el año / 360 | Salario + auxilio (promedio si es variable) |
| Intereses sobre cesantías | cesantías × días × 12 % / 360 | — |
| Prima de servicios | (salario + auxilio) × días del semestre / 360 | Salario + auxilio |
| Vacaciones no disfrutadas | salario × días trabajados sin vacaciones / 720 | Salario sin auxilio |
| Indemnización (despido sin justa causa, indefinido, salario < 10 SMMLV) | 30 días el primer año + 20 días por cada año adicional (proporcional) | Salario |
| Indemnización (término fijo) | salarios que faltan para terminar el contrato | Salario |

- Si el salario es variable (comisiones, horas extra frecuentes), la base de cesantías y prima es el **promedio del último año** (o de lo trabajado, si es menos). El CRM tiene comisiones y horas extra por quincena, así que puede calcular ese promedio para los periodos que tenga.
- Las cesantías de años anteriores ya debieron consignarse al fondo antes del 14 de febrero; en la liquidación solo va el año en curso.
- **Deducciones** de la liquidación (préstamos, anticipos, descuentos de OP pendientes) requieren autorización escrita del trabajador.
- **Plazo:** se paga al terminar. El retraso sin justificación genera indemnización moratoria (un día de salario por cada día de mora, art. 65 CST). Por eso el sistema debe mostrar claramente las liquidaciones pendientes de pago.
- Contratos de prestación de servicios y aprendices SENA no se liquidan con estas reglas (el enum ya los contempla; en PRD no hay ninguno).

---

## 4. Propuesta: submódulo «Novedades»

### 4.1 Qué es una novedad

Un evento de un empleado con **tipo, fecha de inicio, fecha de fin y soporte**. Al liquidar la quincena, el sistema cruza las novedades con las fechas del periodo y calcula solo.

Tipos propuestos (la primera versión puede limitarse a los dos primeros):

| Tipo | ¿Paga salario la empresa? | ¿Auxilio de transporte? | ¿Recobro? |
|---|---|---|---|
| Incapacidad común | Días 1–2 al 66,67 % (o política) | No | Sí, días 3+ a EPS |
| Incapacidad laboral | Paga y recobra 100 % | No | Sí, a ARL |
| Licencia maternidad / paternidad | Paga y recobra 100 % | No | Sí, a EPS |
| Vacaciones | Sí, 100 % | No | No |
| Licencia remunerada (luto, calamidad) | Sí, 100 % | No | No |
| Licencia no remunerada / ausencia injustificada | No | No | No |

### 4.2 Requerimientos funcionales

1. **RF-N1 Registrar novedad**: empleado, tipo, fecha inicio, fecha fin (días calculados), origen (común/laboral), diagnóstico opcional, número de incapacidad de la EPS, adjunto del soporte (reusar storage existente), si es prórroga de otra.
2. **RF-N2 Listado** en Nómina › Novedades con filtros por empleado, tipo, rango de fechas y estado; vista en la ficha del empleado.
3. **RF-N3 Efecto en la quincena**: al abrir o recalcular el registro del empleado en un periodo, el sistema toma los días de novedad que caen dentro del periodo y:
   - descuenta esos días de los **días trabajados** (y por tanto del salario base);
   - calcula una línea **«Incapacidad / licencia»** con el valor según tipo y tramo;
   - calcula el **auxilio de transporte solo por los días trabajados**: `auxilio mensual / 30 × días trabajados`;
   - muestra en el formulario de qué novedades salió cada número, con enlace.
4. **RF-N4 Auxilio de transporte automático**: dejar de digitarlo y calcularlo a partir del valor vigente (parámetro anual) y del salario (solo si ≤ 2 SMMLV). Se puede dejar sobreescribir a mano con motivo. Sin este punto, la regla del cliente no tiene dónde aplicarse.
5. **RF-N5 Una novedad que cruza dos quincenas** se reparte sola entre ambas.
6. **RF-N6 Recobro**: la parte que paga la EPS/ARL queda como «por recobrar» con su estado (radicada, pagada, rechazada). Fase 1 puede ser solo el reporte; el registro del pago de la EPS puede esperar.
7. **RF-N7 Bloqueo**: no se puede crear ni editar una novedad que afecte un periodo ya **Pagado** sin la misma autorización que hoy se pide para cambios sobre lo pagado; la corrección se hace en la siguiente quincena como ajuste.
8. **RF-N8 Permisos**: `create_payroll_novelties`, `read_payroll_novelties`, `update_payroll_novelties`, `delete_payroll_novelties` (recordar los 3 archivos de permisos).
9. **RF-N9 Desprendible**: el PDF de nómina ([generatePayrollSlipPdf.ts](../frontend/src/features/payroll/utils/generatePayrollSlipPdf.ts)) muestra los días de incapacidad y su valor como línea aparte.

### 4.3 Qué pasa con el campo actual «Días no remunerados / incapacidad»

Nunca se ha usado, así que se puede reemplazar sin migrar datos: queda como **«Días no remunerados»** (descuento) y la incapacidad pasa a una línea de ingreso propia que llena el sistema.

---

## 5. Propuesta: liquidación por terminación de contrato

### 5.1 Flujo

1. Desde la ficha del empleado: **«Terminar contrato»** → fecha de retiro, motivo (renuncia, despido con justa causa, despido sin justa causa, mutuo acuerdo, fin de término fijo, periodo de prueba), observaciones, carta adjunta.
2. El sistema arma un **borrador de liquidación** con:
   - días trabajados desde el ingreso (o desde el 1 de enero para cesantías, desde el inicio del semestre para prima);
   - base salarial (salario actual + auxilio, o promedio si hay comisiones/horas extra en los últimos 12 meses);
   - cada concepto de la tabla del §3.3, con su fórmula visible;
   - deducciones sugeridas: anticipos y préstamos sin descontar, descuentos de OP aprobados sin aplicar (ya existen en `payroll-deductions`).
3. **Datos que el usuario completa o corrige**, porque el CRM no los tiene: días de vacaciones ya disfrutados, si la prima del semestre ya se pagó, si las cesantías del año anterior ya se consignaron, días no remunerados del periodo (que no cuentan para prestaciones).
4. **Aprobación** por gerencia (reusar el patrón de aprobaciones existente) → estado **Aprobada**.
5. **Pago**: registrar el pago (uno o varios, efectivo/transferencia) igual que hoy los `PayrollPayment`. Al quedar pagada, el empleado pasa a **Inactivo** con su fecha de retiro.
6. **PDF de liquidación** firmable por el trabajador (paz y salvo).

### 5.2 Requerimientos funcionales

1. **RF-L1** Fecha y motivo de retiro en el empleado; no se puede inactivar sin ellos.
2. **RF-L2** Cálculo automático con fórmulas visibles y todos los valores editables con motivo (el contador manda).
3. **RF-L3** Estados: Borrador → Aprobada → Pagada (o Anulada con motivo).
4. **RF-L4** Alerta de liquidaciones aprobadas sin pagar con los días transcurridos (por la indemnización moratoria).
5. **RF-L5** El empleado liquidado no aparece al generar registros en quincenas posteriores (hoy se filtra por `ACTIVE`, se mantiene).
6. **RF-L6** Permisos `create_payroll_settlements`, `read_payroll_settlements`, `approve_payroll_settlements`.

### 5.3 Pregunta de alcance

¿Quieren también **primas semestrales y vacaciones** como novedades normales (fuera de la liquidación)? Con ellas el CRM tendría la historia que hoy falta y la liquidación dejaría de pedir datos a mano. Se recomienda al menos registrar **vacaciones como novedad** desde la Fase 1.

---

## 6. Modelo de datos propuesto

Nombres tentativos, tablas nuevas en snake_case con `@map` (no son `payroll_items` ni `users`).

```prisma
enum PayrollNoveltyType {
  SICK_LEAVE_COMMON       // Incapacidad común
  SICK_LEAVE_WORK         // Incapacidad laboral (ARL)
  MATERNITY_LEAVE
  PATERNITY_LEAVE
  VACATION
  PAID_LEAVE              // Licencia remunerada (luto, calamidad)
  UNPAID_LEAVE            // Licencia no remunerada / ausencia
}

model PayrollNovelty {
  id           String             @id @default(uuid())
  employeeId   String             @map("employee_id")
  type         PayrollNoveltyType
  startDate    DateTime           @db.Date @map("start_date")
  endDate      DateTime           @db.Date @map("end_date")
  extendsId    String?            @map("extends_id")      // prórroga de otra incapacidad
  externalRef  String?            @map("external_ref")    // número de incapacidad EPS
  diagnosis    String?
  attachmentKey String?           @map("attachment_key")
  notes        String?
  createdById  String             @map("created_by_id")
  isVoided     Boolean            @default(false) @map("is_voided")
  voidReason   String?            @map("void_reason")
  // … recobro: status, monto, fecha (fase 1b)
  @@map("payroll_novelties")
}

// En PayrollItem: línea calculada, no digitada
//   leaveDays     Decimal?   días de novedad en el periodo
//   leaveValue    Decimal?   valor pagado por incapacidad/licencia

// En Employee
//   terminationDate   DateTime?
//   terminationReason TerminationReason?

model PayrollSettlement { … }       // cabecera: empleado, fechas, base, estado, aprobación
model PayrollSettlementLine { … }   // concepto, días, base, valor calculado, valor final, motivo de ajuste
```

Parámetros anuales (SMMLV, auxilio de transporte) en una tabla de configuración con vigencia por año, para que el cálculo de una quincena de diciembre no cambie cuando se cargue el valor de enero. Puede ir en la misma idea de `production_settings`.

**Recordatorio:** el repositorio de `PayrollItem` usa `select` explícito; los campos nuevos deben agregarse ahí o no llegan al frontend.

---

## 7. Plan por fases

| Fase | Contenido | Depende de |
|---|---|---|
| **0. Aclarar** | Respuestas del §9, sobre todo cómo se paga hoy el auxilio y la política de incapacidades | Cliente + contador |
| **1. Novedades** | Modelo `PayrollNovelty`, CRUD, auxilio de transporte automático, efecto en la quincena, línea en el desprendible. Tipos: incapacidad común, laboral, vacaciones, no remunerada | Fase 0 |
| **1b. Recobros** | Reporte y estado de lo que debe la EPS/ARL | Fase 1 |
| **2. Liquidación** | Retiro en el empleado, cálculo, aprobación, pago, PDF | Fase 1 (usa vacaciones y días no remunerados) |
| **3. Nómina electrónica** | Transmisión DIAN de nómina, que ya incluye incapacidades, licencias y liquidaciones | Proveedor del análisis de facturación |

---

## 8. Riesgos

- **Regla sobre un dato que no existe.** Si el auxilio va hoy dentro del salario o fuera del CRM, la Fase 1 obliga a separarlo; eso cambia el valor que ven los empleados en el desprendible aunque el neto sea igual. Hay que comunicarlo.
- **Base de cotización.** Si la EPS/pensión se calcula sobre el mínimo y el salario es mayor, las incapacidades que pague la EPS serán menores que el salario y la empresa tendrá que decidir si cubre la diferencia.
- **Liquidaciones con datos incompletos.** Sin historia de vacaciones ni primas, la primera liquidación depende de lo que el usuario digite. Las fórmulas deben ser visibles para que el contador las revise.
- **Riesgo legal del cálculo.** Un error en una liquidación es reclamable por el trabajador. Recomendación: que el contador valide las primeras liquidaciones en paralelo con su cálculo actual.
- **Periodos ya pagados.** Una incapacidad que llega tarde (se reporta después de pagar la quincena) no debe reabrir el periodo; se ajusta en la siguiente.

---

## 9. Preguntas abiertas para el cliente y el contador

**Sobre incapacidades**

1. ¿Dónde se paga hoy el auxilio de transporte? En el CRM está en $0 en todos los registros.
2. ¿La empresa paga las incapacidades al 66,67 % de ley o al 100 % por política? ¿Desde qué día?
3. ¿La empresa le paga al trabajador y después recobra a la EPS, o el trabajador cobra directamente?
4. ¿Quieren llevar el control de los recobros a EPS/ARL en el CRM?
5. ¿Qué otras novedades manejan con frecuencia: vacaciones, licencias, permisos, ausencias?
6. ¿Quién registra la novedad (el empleado, su jefe, nómina) y quién la aprueba?

**Sobre liquidación**

7. ¿Cómo liquidan hoy? ¿El contador entrega el cálculo o lo hace la empresa?
8. ¿Los empleados con comisiones o horas extra frecuentes se liquidan con promedio?
9. ¿Cómo saben hoy cuántos días de vacaciones tiene pendientes cada empleado?
10. ¿Las primas de junio y diciembre se pagan por el CRM o por fuera?
11. ¿Quién aprueba una liquidación antes de pagarla?

**Para el contador**

12. Cifras 2026 de SMMLV y auxilio de transporte a usar.
13. Base de cotización a EPS/pensión: hoy sale el 8 % sobre el mínimo para salarios de $2M–$3M (§2.2).
14. Tipos de contrato reales: 7 empleados activos no tienen tipo de contrato en el CRM.
