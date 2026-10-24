# Facturación electrónica en el CRM — Análisis y requerimientos

**Fecha:** 2026-10-22
**Estado:** borrador para revisión con el cliente y su contador
**Alcance:** emitir desde el CRM la factura electrónica de venta y sus notas (crédito y débito) conforme a la regulación colombiana (DIAN), y dejar trazados los documentos relacionados (documento soporte, recepción de facturas de proveedores, nómina electrónica).

> **Aviso.** Este documento es un análisis técnico y funcional. Los puntos tributarios (régimen, retenciones, momento de causación del IVA, anticipos) deben validarse con el contador de la empresa antes de construir. Donde la norma admite interpretación se marca con **⚖️ Validar con contador**.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Situación actual (datos de PRD)](#2-situación-actual-datos-de-prd)
3. [Marco legal](#3-marco-legal)
4. [Implicaciones fiscales propias de este negocio](#4-implicaciones-fiscales-propias-de-este-negocio)
5. [Decisión de arquitectura: cómo transmitir a la DIAN](#5-decisión-de-arquitectura-cómo-transmitir-a-la-dian)
6. [Qué evento del CRM produce qué documento](#6-qué-evento-del-crm-produce-qué-documento)
7. [Requerimientos funcionales](#7-requerimientos-funcionales)
8. [Requerimientos de datos](#8-requerimientos-de-datos)
9. [Requerimientos técnicos y no funcionales](#9-requerimientos-técnicos-y-no-funcionales)
10. [Flujos](#10-flujos)
11. [Habilitación ante la DIAN (paso a paso)](#11-habilitación-ante-la-dian-paso-a-paso)
12. [Alcance relacionado (fases posteriores)](#12-alcance-relacionado-fases-posteriores)
13. [Plan por fases](#13-plan-por-fases)
14. [Riesgos](#14-riesgos)
15. [Preguntas abiertas para el cliente y el contador](#15-preguntas-abiertas-para-el-cliente-y-el-contador)
16. [Fuentes](#16-fuentes)

---

## 1. Resumen ejecutivo

- **Hoy el CRM no factura.** La factura se hace en otro sistema y en la OP solo se escribe a mano su número (`PATCH /orders/:id/electronic-invoice`). Ese registro casi no se usa: de 394 OP con IVA en los últimos 12 meses, solo 10 tienen número de factura.
- **El CRM hoy solo permite registrar factura si la OP tiene IVA.** Esa regla no coincide con la ley: la obligación de facturar depende de que haya una venta, no de que la venta lleve IVA. El 92 % de las OP (4.455 de 4.849) no tiene IVA. **Este es el hallazgo de mayor riesgo legal del análisis** y debe revisarse con el contador antes que cualquier desarrollo (ver [§4.1](#41-toda-venta-se-factura-no-solo-las-que-llevan-iva)).
- **La empresa figura en el CRM como "Régimen Simple de Tributación"**, que obliga a facturar electrónicamente *todas* las ventas (art. 915 E.T.) y cambia cómo se le aplican las retenciones (art. 911 E.T.). El NIT registrado en PRD es un marcador (`900000000-0`), así que el régimen también debe confirmarse con el RUT.
- **Recomendación de arquitectura:** integrar un **proveedor tecnológico (PT) autorizado por la DIAN vía API**, no construir la firma y transmisión propias. El CRM sigue siendo dueño de la venta; el PT arma el XML UBL 2.1, firma, transmite, devuelve el CUFE y envía al cliente.
- **Lo que más trabajo implica no es la integración, sino los datos y las reglas:** clientes sin dirección (95 %), municipios sin código DANE, NIT con y sin dígito de verificación mezclados, IVA a nivel de OP en lugar de por ítem, el total de la OP descontando retenciones (la factura no lo hace) y todos los flujos que hoy editan una OP después de confirmada (descuentos, anulaciones, devoluciones), que tras facturar solo pueden expresarse con notas.
- **Volumen esperado:** ~1.000–1.340 OP por mes en los últimos tres meses. Si se factura todo, el plan del PT debe cubrir del orden de 1.500 documentos al mes contando notas.

---

## 2. Situación actual (datos de PRD)

Consultas de solo lectura contra producción el 2026-10-22.

### 2.1 Órdenes de pedido (últimos 12 meses)

| Indicador | Valor |
|---|---|
| OP totales | 4.849 |
| OP con IVA (19 %) | 394 (8 %) |
| OP sin IVA (0 %) | 4.455 (92 %) |
| OP con número de factura registrado | 10 |
| OP con IVA, confirmadas, sin número de factura | 337 |
| OP con alguna retención (fuente, ICA o IVA) | 24 |
| OP con descuento | 5 |
| OP anuladas | 30 |
| Tasas de IVA usadas | solo 0 % y 19 % |

Crecimiento mensual de OP: abr 104 → may 166 → jun 408 → jul 706 → ago 1.054 → sep 1.336 → oct (al 22) 972.

Estados en los últimos 3 meses: `DELIVERED` 2.539, `DRAFT` 451, `READY` 416, `CONFIRMED` 172, `IN_PRODUCTION` 122, `PAID` 64, `ANULADO` 25. El estado «Entregada» ya es el estado normal de cierre, lo que lo hace candidato a disparar la factura (ver [§4.4](#44-momento-de-emisión-cuándo-se-factura)).

Métodos de pago (12 meses): transferencia 3.860, efectivo 1.063, crédito 577, saldo a favor 135, tarjeta 19.

### 2.2 Calidad de datos de clientes (1.341 activos)

| Dato | Estado | ¿Lo exige la factura? |
|---|---|---|
| Documento (NIT/cédula) | Empresas: 0 sin NIT. Personas naturales: 50 sin documento | Sí (o identificación de consumidor final) |
| Dígito de verificación | 245 NIT traen `-DV` pegado, el resto no; no hay campo DV | Sí, para NIT |
| Tipo de documento DIAN | No existe (solo `personType` NATURAL/EMPRESA) | Sí |
| Responsabilidades fiscales / régimen IVA | No existe | Sí |
| Dirección | 1.272 sin dirección (95 %) | Sí para adquirentes identificados ⚖️ confirmar con el PT |
| Municipio con código DANE | El modelo `City` no tiene código; solo hay 152 ciudades (Colombia tiene ~1.120 municipios); `Department.code` es alfabético (`ANT`), no DANE (`05`) | Sí |
| Correo | 39 sin correo; `Client.email` es `@unique` | Sí (para el envío) |

De los 171 clientes que compraron con IVA en 12 meses, 2 no tienen correo y todos tienen documento: el subconjunto que hoy se factura está razonablemente completo, salvo dirección y municipio DANE.

### 2.3 Empresa emisora (`company`)

- Nombre: High Solutions S.A.S.
- NIT: `900000000-0` (marcador, **no es real**).
- Régimen registrado: «Régimen Simple de Tributación».
- Faltan: DV separado, responsabilidades fiscales, actividad económica (CIIU), municipio DANE, matrícula mercantil, datos de la resolución de numeración.

### 2.4 Catálogo de productos

- 248 productos no tienen unidad; los demás usan texto libre (`Und`, `UND`, `por unidad`, `Metro`, `M2`, `por millar`…). La DIAN exige un código de unidad estándar (tabla UN/ECE Rec. 20 del anexo técnico).
- Los productos no tienen tarifa de IVA propia: el IVA se define por OP (`Order.taxRate`).

### 2.5 Lo que ya existe y se aprovecha

- `Order.electronicInvoiceNumber` y `ExpenseOrder.electronicInvoiceNumber` (número de factura, OP y OG).
- Consecutivos con bloqueo (`Consecutive`), idempotencia de creación de OP (`Order.idempotencyKey`), bloqueo de fila al escribir saldos (`lockOrderForUpdate`).
- Anulación parcial por ítems con `annulledQuantity` (el ítem no se borra): encaja con una nota crédito parcial.
- Auditoría (`audit_logs`), almacenamiento de archivos con URLs prefirmadas, logs estructurados en Loki.
- Módulo de nómina con empleados, periodos y pagos (base para nómina electrónica, [§12.3](#123-nómina-electrónica)).

---

## 3. Marco legal

### 3.1 Normas que aplican

| Norma | Qué regula |
|---|---|
| **Estatuto Tributario, arts. 615, 616-1, 617** | Obligación de facturar, sistema de facturación, requisitos de la factura |
| **E.T. art. 771-2** | Sin factura electrónica el comprador no puede soportar costos, deducciones ni IVA descontable → presión comercial de los clientes empresa |
| **E.T. arts. 903–916 (Régimen SIMPLE)** | Art. 915: el SIMPLE obliga a factura electrónica. Art. 911: no sujeto a retención en la fuente (salvo laborales) |
| **E.T. art. 437-2 num. 9** | Los responsables de IVA que compran a un contribuyente del SIMPLE **sí** practican reteIVA |
| **E.T. art. 429** | Momento de causación del IVA (venta: emisión de factura o, en su defecto, entrega) |
| **Ley 2155 de 2021** | Ajustes al sistema de facturación (factura como soporte de costos, documento soporte) |
| **Decreto 1625 de 2016 (DUR tributario)** y **Decreto 358 de 2020** | Reglamentación del sistema de facturación |
| **Resolución DIAN 000165 de 2023** | Sistema de facturación vigente; adopta el **Anexo Técnico 1.9** de factura electrónica de venta y el anexo de documento equivalente electrónico. Exigible desde el 1 de mayo de 2024 (Res. 000008 de 2024) |
| **Resolución DIAN 000227 de 2025** | Compila la normativa tributaria de la DIAN, incluida la de facturación (arts. 1.5.x). **Es la referencia actual**: la 000165 sigue vigente en su contenido, pero compilada aquí |
| **Resolución DIAN 000167 de 2021** | Documento soporte en adquisiciones a no obligados a facturar |
| **Resolución DIAN 000013 de 2021** | Documento soporte de pago de nómina electrónica |
| **Resolución DIAN 000085 de 2022** | RADIAN: factura electrónica como título valor y sus eventos |
| **Ley 527 de 1999** | Validez de los mensajes de datos y la firma digital |
| **Código de Comercio art. 60 y Ley 962 de 2005 art. 28** | Conservación de libros y papeles del comerciante (10 años) |
| **Ley 1581 de 2012** | Protección de datos personales de los clientes |

> El anexo técnico vigente es la **versión 1.9**. Circula en sitios de terceros una posible versión 2.0, sin resolución que la adopte a la fecha de este documento. El diseño debe aislar el formato en el PT para que un cambio de anexo no toque el CRM.

### 3.2 Obligaciones que se derivan

1. **Facturar toda venta** de bienes o servicios, con o sin IVA.
2. **Validación previa:** la factura solo tiene validez cuando la DIAN la valida. Se entrega al cliente después de validada (salvo contingencia).
3. **Numeración autorizada:** prefijo y rango autorizados por resolución de la DIAN, con vigencia.
4. **Firma digital** con certificado emitido por una entidad de certificación acreditada por ONAC (la puede poner el PT por mandato).
5. **CUFE** (código único de factura electrónica, hash SHA-384) y **código QR** en la representación gráfica.
6. **Entrega al adquirente** del XML (contenedor `AttachedDocument`, con la respuesta de validación de la DIAN) y del PDF, por correo o el medio acordado.
7. **No se anula una factura:** se corrige con **nota crédito** (disminuye) o **nota débito** (aumenta), cada una con su **CUDE** y referencia a la factura.
8. **Contingencia:** si no se puede transmitir, se expide en contingencia y se transmite dentro de las 48 horas siguientes a superar el inconveniente.
9. **Conservación** del XML, la respuesta de la DIAN y la representación gráfica: mínimo 5 años por norma tributaria; **10 años** por Código de Comercio.

### 3.3 Sanciones (referencia)

- **E.T. art. 652:** expedir facturas sin requisitos.
- **E.T. art. 657:** clausura del establecimiento por no expedir factura o expedirla sin requisitos.
- **E.T. art. 771-2:** los clientes empresa pierden el costo y el IVA descontable si no reciben factura electrónica, lo que en la práctica también es una sanción comercial.

⚖️ Validar con contador los montos vigentes en UVT.

---

## 4. Implicaciones fiscales propias de este negocio

### 4.1 Toda venta se factura, no solo las que llevan IVA

El servicio `registerElectronicInvoice` rechaza registrar factura si la OP no tiene IVA:

> «La factura electrónica solo aplica para órdenes que incluyan IVA.»

Con el 92 % de las OP sin IVA, hay dos posibilidades, y el CRM debe modelar la que sea cierta:

- **(a)** La empresa no es responsable de IVA (o la actividad no está gravada) y el 19 % se cobra solo en algunos casos. Entonces la regla del CRM es incorrecta en las dos direcciones: no debería cobrar IVA en ninguna OP, y sí debería facturar todas.
- **(b)** La empresa sí es responsable de IVA. Entonces toda venta gravada debe llevar IVA y factura, y las OP sin IVA son un riesgo tributario actual que no depende del CRM.

**Requisito:** antes de construir, el contador confirma con el RUT: responsabilidad de IVA (código 48 responsable / 49 no responsable), si está en el SIMPLE y en qué grupo de actividad, y qué productos están gravados, exentos o excluidos. El CRM deja de decidir el IVA por OP y lo decide por producto o ítem, a partir de esa configuración.

### 4.2 Régimen SIMPLE y retenciones

Si la empresa está en el SIMPLE:

- **Retención en la fuente:** sus clientes **no** deben practicársela (art. 911 E.T.). Hoy 24 OP tienen `retefuenteRate > 0`.
- **ReteIVA:** sí aplica si el cliente es responsable de IVA (art. 437-2 num. 9).
- **ReteICA:** depende del municipio y de cómo integra el ICA en el SIMPLE. ⚖️ Validar con contador.

**Requisito:** el CRM debe advertir (o bloquear, según decida el contador) cuando se intenta registrar una retención que no aplica al régimen de la empresa.

### 4.3 El total de la OP no es el total de la factura

Hoy `Order.total` descuenta las retenciones:

```
total = subtotal − retenciones + IVA − reteIVA − descuento + prueba de color   (redondeado a 100)
```

En la factura electrónica las retenciones **no** reducen el total: el vendedor factura `subtotal − descuentos + impuestos`, y el comprador retiene al pagar. En el XML las retenciones pueden informarse (`WithholdingTaxTotal`), pero no cambian el valor a pagar de la factura.

**Requisito:** separar en la OP dos conceptos:

| Concepto | Para qué |
|---|---|
| **Total facturado** | Lo que va en la factura (`LegalMonetaryTotal/PayableAmount`) |
| **Neto esperado a recibir** | Total facturado menos retenciones; es lo que usan caja, saldo y cartera |

Esto toca `computeOrderBalance()` y todos los cálculos de saldo, que hoy parten de `total`. Es el cambio de modelo más delicado del proyecto.

### 4.4 Momento de emisión (cuándo se factura)

Para venta de bienes, el IVA se causa en la fecha de la factura o, si no hay, en la entrega (art. 429 E.T.). Las opciones para el CRM:

| Opción | Pros | Contras |
|---|---|---|
| **Al pasar a «Entregada» / «Entregada a crédito»** (recomendada) | Coincide con la causación; la OP ya no cambia; «Entregada» es hoy el estado normal de cierre (2.539 de 3.795 OP en 3 meses) | Si se entrega sin pasar por el estado, no se factura |
| Al confirmar la OP | Simple; el cliente recibe la factura temprano | Toda edición posterior (que hoy es frecuente) obliga a notas |
| Manual, con botón «Facturar» | Control total | Depende de la disciplina del usuario; hoy ese hábito no existe (10 de 394) |

**Recomendación:** emisión automática al marcar «Entregada», más un botón manual para facturar antes (cliente que lo pide o pago total anticipado). ⚖️ Validar con contador.

### 4.5 Anticipos

Muchas OP reciben abono antes de la entrega. El anexo permite informar anticipos en la factura (`PrepaidPayment`), restándolos del valor a pagar. ⚖️ Validar con contador si los anticipos se facturan al recibirlos o solo se informan en la factura final.

### 4.6 Redondeo comercial a 100

El total de la OP se redondea a múltiplos de 100. El anexo admite el ajuste en `LegalMonetaryTotal/PayableRoundingAmount`, pero la DIAN valida que las sumas de líneas, impuestos y totales cuadren con tolerancias estrictas. **Requisito:** el redondeo va como ajuste explícito, nunca escondido en el precio de un ítem; validar el caso con el PT en el set de pruebas.

### 4.7 IVA por línea, descuentos y prueba de color

- La DIAN exige los impuestos **por línea** (`InvoiceLine/TaxTotal`) y totalizados. Hoy el IVA es una tasa única por OP.
- El descuento global (`OrderDiscount`) reduce la base del IVA; debe prorratearse a las líneas o enviarse como descuento a nivel de documento con su efecto en la base.
- La prueba de color (`colorProofPrice`) es un cobro: debe ir como línea de factura (o cargo) con su IVA.

### 4.8 Consumidor final y personas sin documento

50 personas naturales no tienen documento. La norma permite facturar a consumidor final con la identificación genérica `222222222222`, pero el cliente puede pedir factura a su nombre, y en ese caso deben pedirse sus datos. ⚖️ Validar con contador si conviene usar documento equivalente POS electrónico para ventas de mostrador.

---

## 5. Decisión de arquitectura: cómo transmitir a la DIAN

| Opción | Descripción | Veredicto |
|---|---|---|
| **A. Proveedor tecnológico con API** | El CRM envía JSON al PT; el PT genera el UBL 2.1, firma, transmite, conserva, envía al cliente y devuelve CUFE, XML y PDF | **Recomendada** |
| B. Software propio | El CRM genera el XML UBL 2.1, firma XAdES-EPES con certificado propio, consume el web service SOAP de la DIAN, arma el `AttachedDocument`, gestiona respuestas y contingencias | Descartada para esta etapa: alto costo, mantenimiento de cada cambio de anexo, compra y renovación del certificado, y responsabilidad total por rechazos |
| C. Facturador gratuito de la DIAN | Portal web de la DIAN, manual | Descartada: no se integra; a 1.000+ OP/mes es inviable |
| D. Seguir con el sistema externo actual | Facturar fuera y registrar el número | Es la situación actual; sirve como respaldo de contingencia |

### 5.1 Criterios para elegir el PT

1. Autorizado por la DIAN como proveedor tecnológico (listado público de la DIAN).
2. API REST documentada, con ambiente de pruebas (sandbox) y **webhooks** de estado.
3. Soporte de factura de venta, nota crédito, nota débito; idealmente también documento soporte, nómina electrónica, recepción de facturas y eventos RADIAN (para crecer sin cambiar de proveedor).
4. Firma por mandato (el PT pone el certificado) o carga del certificado propio.
5. Gestiona el set de pruebas de habilitación y la contingencia.
6. Devuelve XML, PDF personalizable (logo, textos) y CUFE/CUDE por API.
7. Conservación de documentos al menos 10 años y exportación masiva.
8. Precio por documento acorde a ~1.500 documentos/mes con crecimiento.
9. Clave de idempotencia por solicitud (para no emitir dos veces la misma factura).
10. SLA y soporte en Colombia.

Candidatos a evaluar (sin preferencia): Alegra, Siigo, Factus, Dataico, MATIAS API, The Factory HKA, Facturatech, Carvajal. La decisión se toma con una prueba en sandbox de los casos de [§11](#11-habilitación-ante-la-dian-paso-a-paso).

La evaluación detallada (tipos de proveedor, precios, modalidad ante la DIAN, diseño del backend y prueba de concepto) está en [EVALUACION_PROVEEDOR_FACTURACION_API.md](./EVALUACION_PROVEEDOR_FACTURACION_API.md).

### 5.2 Diseño en el CRM

- **Puerto y adaptador:** interfaz `ElectronicInvoicingProvider` en el backend (`emit`, `emitCreditNote`, `emitDebitNote`, `getStatus`, `downloadXml`, `downloadPdf`) y un adaptador por PT. Cambiar de proveedor no toca la lógica de negocio.
- **El CRM es dueño de los números de negocio** (totales, impuestos por línea, cliente); el PT es dueño del formato y la transmisión.
- **Instantánea inmutable:** al facturar se guarda una copia de los datos del cliente y de las líneas tal como se enviaron. Editar después el cliente o el producto no cambia una factura emitida.

---

## 6. Qué evento del CRM produce qué documento

| Evento en el CRM | Documento DIAN | Notas |
|---|---|---|
| OP pasa a «Entregada» / «Entregada a crédito», o botón «Facturar» | **Factura electrónica de venta** | Forma de pago 1 (contado) o 2 (crédito, con fecha de vencimiento) |
| Descuento aprobado después de facturar | **Nota crédito** (concepto: rebaja o descuento) | Hoy el descuento edita la OP; tras facturar no puede |
| Anulación total de la OP (`ANULADO`) facturada | **Nota crédito total** (concepto: anulación) | Lo que retiene la empresa al anular, si se cobra, se factura aparte o se descuenta del valor de la nota ⚖️ |
| Anulación parcial por ítems (`RefundRequest` con ítems) | **Nota crédito parcial** por las líneas y cantidades anuladas | Encaja con `annulledQuantity` |
| Devolución de mercancía (`RETURNED`) | **Nota crédito** (concepto: devolución) | |
| Devolución de dinero sin anular la venta | Ninguno | Es un movimiento de caja, no cambia la venta |
| Edición que **aumenta** el valor de una OP facturada | **Nota débito**, o nota crédito total + factura nueva | Definir con el contador cuál prefiere |
| Edición que **disminuye** el valor | **Nota crédito** | |
| Pago con saldo a favor, por nómina, efectivo, transferencia | Ninguno (solo el medio de pago en la factura) | |
| Garantía (`WARRANTY`) sin cobro | Ninguno | Si hay cobro, factura nueva |
| Cotización | Ninguno | |

**Regla de oro:** una OP con factura aceptada por la DIAN queda **congelada** en sus valores. Toda edición posterior pasa por una solicitud que termina en nota. Esto obliga a revisar todos los flujos de edición existentes (`OrderEditRequest`, descuentos, anulaciones, devoluciones, cambio de cliente).

---

## 7. Requerimientos funcionales

### Emisión

- **RF-01** Emitir factura electrónica de venta desde una OP, automática al pasar a «Entregada»/«Entregada a crédito» y manual con botón «Facturar».
- **RF-02** Antes de emitir, validar que el cliente y los ítems tengan todos los datos obligatorios, y mostrar al usuario exactamente qué falta, con enlace para completarlo. Una OP con datos incompletos no se envía al PT.
- **RF-03** Mostrar en la OP el estado de la factura: *Pendiente*, *Enviada*, *Aceptada*, *Rechazada* (con el motivo de la DIAN en lenguaje claro), *En contingencia*.
- **RF-04** Reintentar automáticamente los errores transitorios (red, PT caído) y permitir reenvío manual tras corregir un rechazo, **sin generar una segunda factura** de la misma OP.
- **RF-05** Descargar desde la OP el PDF y el XML, y reenviarlos al correo del cliente o a otro correo.
- **RF-06** Informar en la factura los anticipos ya recibidos y la forma y medio de pago según los pagos registrados.
- **RF-07** Facturar a consumidor final cuando el cliente no tiene o no da documento.
- **RF-08** Permitir facturar varias OP del mismo cliente en una sola factura (cliente corporativo con corte mensual). *Deseable, fase 2.*

### Notas

- **RF-09** Emitir nota crédito total o parcial desde los flujos de anulación, anulación parcial, devolución y descuento posterior, con el concepto de corrección DIAN correspondiente.
- **RF-10** Emitir nota débito por aumentos de valor sobre una OP facturada.
- **RF-11** Bloquear la edición directa de valores en una OP con factura aceptada; las ediciones se canalizan a notas.

### Numeración y configuración

- **RF-12** Administrar resoluciones de numeración: número de resolución, prefijo, rango desde/hasta, fecha de vigencia, ambiente (pruebas/producción).
- **RF-13** Alertar a administración cuando el rango llegue al 80 % de uso o falte un mes para vencer la resolución.
- **RF-14** Configurar los datos fiscales de la empresa (NIT + DV, razón social, régimen, responsabilidades fiscales, CIIU, municipio DANE, dirección, correo) en «Empresa».
- **RF-15** Configurar el tratamiento de IVA por producto (gravado 19 %, 5 %, exento, excluido) y la unidad de medida DIAN.

### Consulta y reportes

- **RF-16** Listado de documentos electrónicos con filtros por fecha, cliente, tipo, estado, asesor; exportación a Excel (paginada, como el resto de exportaciones).
- **RF-17** Reporte de OP entregadas sin factura aceptada (control de que no quede venta sin facturar).
- **RF-18** Reporte mensual de IVA generado y notas para el contador.

### Permisos (RBAC)

- **RF-19** Permisos nuevos: `create_electronic_invoices`, `read_electronic_invoices`, `create_credit_notes`, `create_debit_notes`, `manage_invoicing_settings`. Recordar que cada permiso nuevo va en `sync-permissions.ts`, `permission-labels.ts` y `PermissionsSelector.tsx`.
- **RF-20** Las notas crédito que reducen el valor de una venta requieren la misma autorización que hoy exige el flujo que las origina (anulación, descuento, devolución) y respetan la regla contra autoaprobación (`self-review.util.ts`).

---

## 8. Requerimientos de datos

### 8.1 Cliente (adquirente)

| Campo nuevo o ajuste | Detalle |
|---|---|
| `identificationType` | Tipos DIAN: 13 cédula, 31 NIT, 22 cédula de extranjería, 41 pasaporte, 42 documento extranjero, 47 PEP, 48 PPT, 50 NIT de otro país |
| `identificationNumber` + `verificationDigit` | Un solo campo de documento, sin guiones, con el DV aparte y **validado con el algoritmo de la DIAN** (módulo 11). Migrar los 245 NIT con `-DV` pegado y los que vienen sin DV |
| `legalOrganizationType` | 1 persona jurídica, 2 persona natural (hoy `personType`) |
| `firstName` / `lastName` | Para persona natural; razón social para jurídica |
| `taxLevelCodes` | Responsabilidades fiscales del RUT (p. ej. O-13 gran contribuyente, O-15 autorretenedor, O-23 agente de retención IVA, O-47 régimen simple, R-99-PN no aplica) |
| `vatResponsibility` | 48 responsable de IVA / 49 no responsable |
| `cityId` → municipio con **código DANE** (DIVIPOLA) | Ver 8.4 |
| `address` | Obligatoria para facturar a adquirentes identificados (hoy 95 % vacío) ⚖️ confirmar exigencia con el PT |
| `billingEmail` | Correo de recepción de facturas, **sin restricción de unicidad**. Hoy `email` es `@unique` y un mismo correo de facturación lo comparten varias razones sociales |

Los duplicados de clientes ya conocidos (el documento no es llave de identidad) deben sanearse antes: una factura a un cliente duplicado es correcta, pero ensucia la cartera y los reportes. Script existente: `detect-duplicate-parties.ts` / `merge-duplicate-parties.ts`.

### 8.2 Empresa (emisor)

NIT real + DV, razón social, nombre comercial, régimen, responsabilidades fiscales, CIIU, municipio DANE, dirección, teléfono, correo, matrícula mercantil, logo para el PDF, textos legales del pie (resolución de numeración, condiciones), cuentas bancarias.

### 8.3 Productos e ítems

- Producto: `taxCategory` (IVA 19 / 5 / exento / excluido), `unitCode` DIAN (`94` unidad, `MTR` metro, `MTK` metro cuadrado, `MIL` millar…), código interno.
- Ítem de OP: tasa y valor de IVA **por línea**, descuento por línea si se prorratea, unidad DIAN.
- Normalizar los `priceUnit` de texto libre al catálogo de unidades.

### 8.4 Catálogos DIAN

- **Municipios DIVIPOLA** completos (~1.120) con código DANE de 5 dígitos y departamentos con código de 2 dígitos. Migrar las 152 ciudades actuales a su código.
- Tipos de documento, responsabilidades fiscales, unidades de medida, medios de pago, conceptos de corrección de notas, tributos.

### 8.5 Mapeo de métodos de pago

| `PaymentMethod` | Medio de pago DIAN |
|---|---|
| `CASH` | 10 Efectivo |
| `TRANSFER` | 42 Consignación / 47 Transferencia débito bancaria |
| `CARD` | 48 Tarjeta crédito / 49 Tarjeta débito (hoy no se distingue) |
| `CHECK` | 20 Cheque |
| `CREDIT` | Forma de pago 2 (crédito) con fecha de vencimiento |
| `CREDIT_BALANCE` | ZZZ Acuerdo mutuo / anticipo ⚖️ |
| `PAYROLL_DEDUCTION` | ZZZ Acuerdo mutuo |
| `OTHER` | ZZZ |

Un método de pago nuevo hoy toca 4 archivos; con facturación serán 5 (se suma este mapeo).

### 8.6 Modelo nuevo (borrador)

```prisma
enum ElectronicDocumentType   { INVOICE CREDIT_NOTE DEBIT_NOTE }
enum ElectronicDocumentStatus { DRAFT PENDING SENT ACCEPTED REJECTED CONTINGENCY FAILED }

model NumberingRange {
  id               String   @id @default(uuid())
  documentType     ElectronicDocumentType @map("document_type")
  resolutionNumber String   @map("resolution_number")
  prefix           String
  rangeFrom        Int      @map("range_from")
  rangeTo          Int      @map("range_to")
  lastNumber       Int      @default(0) @map("last_number")
  validFrom        DateTime @map("valid_from")
  validTo          DateTime @map("valid_to")
  environment      String   // "test" | "production"
  isActive         Boolean  @default(true) @map("is_active")
  @@map("numbering_ranges")
}

model ElectronicDocument {
  id               String   @id @default(uuid())
  type             ElectronicDocumentType
  status           ElectronicDocumentStatus @default(DRAFT)
  orderId          String   @map("order_id")
  referencedDocId  String?  @map("referenced_doc_id") // factura que corrige una nota
  correctionCode   String?  @map("correction_code")   // concepto DIAN de la nota
  numberingRangeId String?  @map("numbering_range_id")
  prefix           String?
  number           Int?
  cufe             String?  @unique                    // CUFE o CUDE
  issuedAt         DateTime? @map("issued_at")
  subtotal         Decimal
  discountTotal    Decimal  @map("discount_total")
  taxTotal         Decimal  @map("tax_total")
  roundingAmount   Decimal  @default(0) @map("rounding_amount")
  payableAmount    Decimal  @map("payable_amount")
  buyerSnapshot    Json     @map("buyer_snapshot")     // datos del cliente tal como se enviaron
  linesSnapshot    Json     @map("lines_snapshot")
  provider         String
  providerDocId    String?  @map("provider_doc_id")
  idempotencyKey   String   @unique @map("idempotency_key")
  xmlFileId        String?  @map("xml_file_id")
  pdfFileId        String?  @map("pdf_file_id")
  dianMessages     Json?    @map("dian_messages")
  createdById      String   @map("created_by_id")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  @@unique([prefix, number])
  @@index([orderId])
  @@index([status])
  @@map("electronic_documents")
}

model ElectronicDocumentEvent {          // historial de intentos y respuestas
  id         String   @id @default(uuid())
  documentId String   @map("document_id")
  kind       String   // SENT, ACCEPTED, REJECTED, RETRY, WEBHOOK, EMAIL_SENT…
  payload    Json?
  createdAt  DateTime @default(now()) @map("created_at")
  @@map("electronic_document_events")
}
```

Debe existir un **índice único parcial** que impida dos facturas activas (no rechazadas) para la misma OP. El `findFirst` antes de crear no basta: el doble clic ya demostró que crea dos registros con milisegundos de diferencia.

---

## 9. Requerimientos técnicos y no funcionales

- **RNF-01 Idempotencia.** Cada emisión lleva una llave de idempotencia propia que se envía al PT. Un reintento nunca produce una segunda factura. Botones con `LoadingButton` y formularios con `useSingleFlight`.
- **RNF-02 Asíncrono y con reintentos.** La emisión se encola y se procesa fuera de la petición HTTP, con reintentos exponenciales para errores transitorios. Los rechazos de la DIAN (errores de datos) **no** se reintentan: se muestran.
- **RNF-03 Seguro con más de una instancia.** El backend hoy no aguanta réplicas (los crons se duplican). El procesador de la cola debe tomar trabajos con bloqueo en base de datos (`SELECT … FOR UPDATE SKIP LOCKED`) para no emitir dos veces si algún día hay dos instancias.
- **RNF-04 Consecutivo sin carreras.** Si el CRM asigna el número, se toma con bloqueo de fila sobre `NumberingRange`. Si lo asigna el PT, el CRM guarda el que devuelve.
- **RNF-05 Fechas y zona horaria.** La fecha y hora de emisión van en hora de Colombia (UTC−05:00). Hoy las fechas se guardan en UTC sin zona; la conversión se hace en un solo lugar. La DIAN rechaza fechas fuera de la ventana permitida respecto a la recepción.
- **RNF-06 Aislamiento de ambientes.** Desarrollo y staging usan solo el ambiente de pruebas del PT/DIAN. Una guarda en el arranque impide que un ambiente que no sea producción tenga credenciales de producción del PT.
- **RNF-07 Secretos.** API key del PT y, si aplica, certificado y su contraseña, como variables en Railway; nunca en el repositorio ni en logs.
- **RNF-08 Webhooks autenticados.** El endpoint que recibe el estado desde el PT valida firma o secreto compartido y es idempotente.
- **RNF-09 Conservación.** XML, respuesta DIAN y PDF guardados en el almacenamiento propio (además del PT) por 10 años, con respaldo. No se borran nunca, ni siquiera al anular una OP.
- **RNF-10 Auditoría.** Toda emisión, nota, reenvío y cambio de configuración queda en `audit_logs` y en `ElectronicDocumentEvent`.
- **RNF-11 Observabilidad.** Logs estructurados por documento en Loki y alerta si hay documentos en *Pendiente* por más de 30 minutos o rechazos repetidos.
- **RNF-12 Precisión numérica.** Todo cálculo en `Decimal`, con la misma regla de redondeo que exige el anexo (2 decimales por línea) y pruebas unitarias de cuadre (líneas = subtotal, impuestos = suma por línea, total = subtotal − descuentos + impuestos + redondeo).
- **RNF-13 Invariantes en base.** Agregar a `db-invariants.sh`: OP entregada sin factura aceptada después de N horas; factura aceptada cuyo total no cuadra con la OP; nota sin factura referenciada.
- **RNF-14 Datos personales.** Los datos del cliente viajan solo al PT; se documenta en la política de tratamiento de datos.

---

## 10. Flujos

### 10.1 Emisión normal

```
OP → «Entregada»
   ↓
Validar datos (cliente, ítems, empresa, resolución vigente)
   ├─ falta algo → estado «Datos incompletos», aviso al asesor con lo que falta
   ↓
Crear ElectronicDocument (PENDING) + llave de idempotencia
   ↓
Cola → PT: emitir
   ↓
DIAN valida
   ├─ Aceptada → guardar CUFE, XML, PDF; OP congelada; PT envía correo al cliente
   ├─ Rechazada → guardar mensajes; aviso; corregir dato → reenviar (mismo documento)
   └─ Error transitorio → reintento automático
```

### 10.2 Nota crédito por anulación parcial

```
Solicitud de anulación parcial (ítems + cantidades) → autorización gerencia
   ↓
¿La OP tiene factura aceptada?
   ├─ No → flujo actual sin cambios
   └─ Sí → crear nota crédito por esas líneas, referenciando la factura
            ↓
         Aceptada → aplicar `annulledQuantity` y `reversedAmount` como hoy
```

La nota y el efecto en la OP deben quedar en la misma operación lógica: si la nota es rechazada, la anulación no se aplica.

### 10.3 Contingencia

Si el PT o la DIAN no responden por un tiempo prolongado: se emite en contingencia según el procedimiento del PT, se entrega la representación al cliente y el sistema transmite automáticamente al restablecerse, dentro de las 48 horas. El sistema externo actual queda como respaldo operativo documentado.

---

## 11. Habilitación ante la DIAN (paso a paso)

1. **RUT actualizado** con la responsabilidad «52 – Facturador electrónico» y correo de notificaciones.
2. **Firma electrónica** para los trámites en el portal de la DIAN (MUISCA) del representante legal.
3. **Elegir el PT** y firmar el contrato y el mandato de firma.
4. **Registrarse en el portal de habilitación** de la DIAN e indicar el modo de operación «a través de proveedor tecnológico» con el software del PT.
5. **Superar el set de pruebas:** el PT envía los documentos de prueba (facturas, notas crédito, notas débito) y la DIAN los acepta. Aprovecharlo para probar los casos propios: redondeo a 100, IVA mixto, descuento global, anticipos, consumidor final, retenciones informativas.
6. **Solicitar la resolución de numeración** (formulario 1876 en MUISCA): prefijo (p. ej. `FE`) y rango. Asociarla al software del PT.
7. **Pasar a producción** y emitir la primera factura real controlada.
8. **Comunicar** a los clientes empresa el nuevo correo de envío de facturas.

Tiempo típico de los pasos 1–7: de 2 a 4 semanas, mayormente de trámite. Puede correr en paralelo con el desarrollo.

---

## 12. Alcance relacionado (fases posteriores)

### 12.1 Documento soporte en compras a no obligados a facturar

Las OG a proveedores que no facturan (personas naturales, informales) necesitan **documento soporte electrónico** para que el gasto sea deducible (Res. 000167 de 2021, art. 771-2 E.T.). Requiere los mismos datos fiscales del proveedor que del cliente; los NIT de proveedores hoy suelen ser marcadores, así que el saneamiento de datos de proveedores es prerrequisito.

### 12.2 Recepción de facturas de proveedores y eventos RADIAN

- Buzón de recepción que lea los `AttachedDocument` que envían los proveedores, valide el CUFE contra la DIAN y los asocie a la OG o cuenta por pagar (hoy `ExpenseOrder.electronicInvoiceNumber` se escribe a mano).
- Eventos sobre las facturas recibidas: acuse de recibo (030), recibo del bien o servicio (032), aceptación expresa (033) o reclamo (031). Son necesarios cuando el proveedor quiere usar la factura como título valor y conviene tenerlos para soportar el costo. El SIMPLE además obliga a exigir factura a los proveedores.

### 12.3 Nómina electrónica

El módulo de nómina ya calcula periodos, deducciones y pagos. Para que el costo laboral sea deducible, la DIAN exige el **documento soporte de pago de nómina electrónica** (Res. 000013 de 2021) mensual por empleado, con sus notas de ajuste. Varios PT lo ofrecen con la misma API. Confirmar si hoy lo transmite el contador por otro medio.

### 12.4 Varias sedes (clon para Zoom)

Si el CRM opera varias sedes, cada una puede necesitar su propio prefijo o resolución. El modelo de `NumberingRange` debe admitir asociarse a una sede cuando ese concepto exista.

---

## 13. Plan por fases

| Fase | Contenido | Dependencias |
|---|---|---|
| **0. Decisiones fiscales** | Reunión con el contador: régimen, IVA por producto, retenciones, momento de emisión, anticipos, consumidor final (preguntas de [§15](#15-preguntas-abiertas-para-el-cliente-y-el-contador)) | Ninguna. **Bloquea todo lo demás** |
| **1. Datos maestros** | Datos fiscales de la empresa; campos fiscales del cliente con validación de DV; DIVIPOLA; unidades e IVA por producto; saneamiento (NIT+DV, duplicados, direcciones de clientes facturables); pantalla de «cliente listo para facturar» | Fase 0 |
| **2. Cálculo** | IVA por línea, prueba de color como línea, prorrateo de descuento, separación «total facturado» / «neto a recibir» y ajuste de `computeOrderBalance()` con pruebas de cuadre | Fase 0 |
| **3. Elección del PT y habilitación** | Evaluación en sandbox, contrato, habilitación DIAN, resolución de numeración | Fase 0; corre en paralelo con 1 y 2 |
| **4. Emisión de facturas** | Módulo `electronic-invoices`, adaptador del PT, cola, webhooks, estados en la OP, PDF/XML, correo, reportes y permisos | Fases 1–3 |
| **5. Notas crédito y débito** | Integración con anulación total y parcial, devoluciones, descuentos y ediciones; congelamiento de OP facturada | Fase 4 |
| **6. Piloto y salida** | Piloto con OP con IVA (el flujo que ya se factura), luego todas | Fase 5 |
| **7. Compras y nómina** | Documento soporte, recepción de facturas y eventos, nómina electrónica | Fase 6 |

---

## 14. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La regla «solo se factura si hay IVA» refleja una práctica actual de no facturar ventas sin IVA | Alto (legal) | Fase 0 con el contador antes de construir |
| Cambiar el total de la OP rompe saldos, caja y comisiones | Alto | Separar conceptos sin cambiar el significado de `balance`; pruebas de invariantes antes y después |
| Clientes sin datos completos bloquean la entrega | Medio | Validar al crear o confirmar la OP, no al entregar; pantalla de datos faltantes |
| Factura doble por doble clic o reintento | Alto | Llave de idempotencia + índice único parcial |
| Rechazos por cuadre (redondeo, descuentos) | Medio | Probar esos casos en el set de pruebas antes de producción |
| Caída del PT el día de muchas entregas | Medio | Cola con reintentos, contingencia, sistema externo de respaldo |
| Vencimiento del rango o la resolución | Alto (no se puede facturar) | Alertas RF-13 |
| Flujos de edición existentes que siguen modificando una OP facturada | Alto | Inventario de todos los caminos que escriben en `orders` y `order_items` y bloqueo central |
| Cambio de anexo técnico (posible 2.0) | Bajo con PT | El PT absorbe el formato |
| Dependencia de un PT | Medio | Puerto/adaptador y copia propia de todos los documentos |

---

## 15. Preguntas abiertas para el cliente y el contador

1. ¿Cuál es el NIT real y qué dice el RUT: responsabilidades (¿52 facturador electrónico?), régimen (¿SIMPLE?), responsabilidad de IVA (48/49) y CIIU?
2. ¿Por qué el 92 % de las OP no lleva IVA? ¿Qué productos o clientes están gravados, exentos o excluidos?
3. ¿Con qué software se factura hoy? ¿Hay resolución de numeración vigente, con qué prefijo y rango? ¿Se migra o se pide una nueva?
4. ¿En qué momento se debe facturar: confirmación, entrega o pago? ¿Cómo se tratan los anticipos?
5. Siendo del SIMPLE, ¿qué retenciones deben aceptarse de los clientes (fuente, IVA, ICA)?
6. Al anular una OP en que la empresa retiene parte del dinero, ¿esa retención se factura aparte?
7. Ante una edición que aumenta el valor: ¿nota débito o nota crédito más factura nueva?
8. ¿Ventas de mostrador a consumidor final: factura con `222222222222` o documento equivalente POS electrónico?
9. ¿Hay clientes corporativos que piden una sola factura mensual por varias OP?
10. ¿El contador transmite hoy la nómina electrónica y los documentos soporte? ¿Por qué medio?
11. ¿Qué textos legales y qué diseño debe llevar el PDF?
12. ¿Presupuesto mensual para el PT?

---

## 16. Fuentes

- DIAN — [Anexo técnico de la factura electrónica de venta, versión 1.9](https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta-vr-1-9.pdf)
- DIAN — [Documentación técnica del sistema de facturación electrónica](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/)
- DIAN Normograma — [Resolución 000165 de 2023](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0165_2023.htm)
- DIAN Normograma — [Resolución 000227 de 2025 (compilación)](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm)
- DIAN Normograma — [Oficio 903789 de 2020 (SIMPLE y factura electrónica)](https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_903789_2020.htm)
- DIAN Normograma — [Oficio 915593 de 2021](https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_915593_2021.htm)
- Actualícese — [Retenciones en operaciones con contribuyentes del régimen simple](https://actualicese.com/archivo/retenciones-y-autorretenciones-en-operaciones-donde-participe-alguien-del-regimen-simple/)
- SAI — [Facturación electrónica en Colombia 2026: Resolución 000227](https://www.sai-open.com/nueva/facturacion-electronica-colombia-2026-resolucion-000227/)
- Facele — [Resolución 000165: cambios en facturación](https://facele.co/resolucion-000165-dian-facturacion-electronica-colombia/)
- Datos de PRD: consultas de solo lectura con `backend/scripts/db-query.sh` el 2026-10-22.
