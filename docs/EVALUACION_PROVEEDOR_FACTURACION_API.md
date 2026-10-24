# Integración con un proveedor de facturación electrónica por API — Evaluación

**Fecha:** 2026-10-23
**Estado:** borrador para decisión
**Complementa:** [ANALISIS_FACTURACION_ELECTRONICA.md](./ANALISIS_FACTURACION_ELECTRONICA.md) (marco legal, datos y requerimientos). Este documento solo trata la opción de **integrarse por API con un proveedor**: qué tipos de proveedor hay, cuánto cuestan, cómo quedaría la integración en el backend y cómo elegir.

> Los precios y funciones de los proveedores salen de sus sitios públicos, consultados el 2026-10-23. Son información comercial que cambia; hay que confirmarla por escrito con cada uno antes de firmar.

---

## Índice

1. [Conclusión](#1-conclusión)
2. [Los dos tipos de proveedor con API](#2-los-dos-tipos-de-proveedor-con-api)
3. [Modalidad ante la DIAN: proveedor tecnológico o software propio](#3-modalidad-ante-la-dian-proveedor-tecnológico-o-software-propio)
4. [Proveedores revisados](#4-proveedores-revisados)
5. [Costo estimado para nuestro volumen](#5-costo-estimado-para-nuestro-volumen)
6. [Qué hace el proveedor y qué sigue haciendo el CRM](#6-qué-hace-el-proveedor-y-qué-sigue-haciendo-el-crm)
7. [Diseño de la integración en el backend](#7-diseño-de-la-integración-en-el-backend)
8. [Prueba de concepto antes de elegir](#8-prueba-de-concepto-antes-de-elegir)
9. [Esfuerzo estimado](#9-esfuerzo-estimado)
10. [Riesgos propios de depender de un proveedor](#10-riesgos-propios-de-depender-de-un-proveedor)
11. [Qué hay que decidir](#11-qué-hay-que-decidir)
12. [Fuentes](#12-fuentes)

---

## 1. Conclusión

**Sí, integrarse por API con un proveedor es la opción correcta.** Construir el XML UBL, la firma digital y la conexión con la DIAN dentro del CRM sería meses de trabajo y obligaría a seguir cada cambio del anexo técnico. Con un proveedor, el CRM envía un JSON y recibe el CUFE, el XML y el PDF.

La decisión real no es *si* usar API, sino **de qué tipo de proveedor**, y eso depende de una pregunta que solo puede responder el cliente:

> **¿Qué software contable usa hoy el contador de High Solutions?**

- **Si usa Siigo o Alegra** (o piensa pasarse a uno), conviene facturar **a través de ese software por su API**: la factura cae directamente en la contabilidad, la cartera y los informes de IVA, y el contador no tiene que volver a digitar nada.
- **Si usa otro sistema o lleva la contabilidad aparte**, conviene una **API de facturación dedicada** (Factus, MATIAS u otra): es más barata, más simple de integrar y no obliga a sincronizar clientes ni productos.

Mientras no haya respuesta, el diseño del backend ([§7](#7-diseño-de-la-integración-en-el-backend)) sirve igual para ambos: la lógica de negocio no depende del proveedor y cada proveedor es un adaptador.

---

## 2. Los dos tipos de proveedor con API

| | **A. API de facturación dedicada** | **B. Software contable con API** |
|---|---|---|
| Ejemplos | Factus, MATIAS API, Nextpyme, Plemsi, Bilidox | Siigo Nube, Alegra, World Office |
| Qué envía el CRM | La factura completa en un JSON: cliente, ítems, impuestos, pagos | La factura con referencias a cliente y producto **que deben existir antes en el software contable** |
| Datos maestros | No se sincronizan; viajan dentro de cada factura | Hay que crear o buscar el cliente y el producto en el software antes de facturar, y mantenerlos al día |
| Contabilidad | No la hace. El contador importa las facturas (XML o Excel) a su sistema | La factura genera el asiento contable, la cuenta por cobrar y el IVA |
| Pagos | Solo se informan en la factura | Se pueden registrar como recibos de caja en el software |
| Precio | Por paquete de documentos al año; del orden de $30 a $400 por documento según el volumen | Suscripción mensual del software (que el cliente quizás ya paga) más, en algunos casos, el costo de acceso a la API |
| Complejidad de integración | Baja | Media: sincronización de clientes y productos, límites de peticiones, configuración del software |
| Encaje con este CRM | El CRM ya es el sistema de ventas, caja y cartera | Duplica la cartera: el saldo vive en el CRM **y** en el software contable, y hay que decidir cuál manda |

**Lectura para este proyecto:** el CRM ya lleva caja, pagos, saldos a favor, devoluciones y cartera, con reglas propias que se han afinado durante meses. Un software contable con API aporta sobre todo la contabilidad. Si el contador ya trabaja en Siigo o Alegra, ese beneficio pesa mucho. Si no, el tipo A es más directo.

---

## 3. Modalidad ante la DIAN: proveedor tecnológico o software propio

La DIAN reconoce tres formas de facturar: el facturador gratuito de la DIAN, **a través de un proveedor tecnológico** y con **software propio**. Los proveedores con API trabajan en una de las dos últimas, y no todos dicen claramente en cuál:

| | Proveedor tecnológico (PT) | Software propio con API de terceros |
|---|---|---|
| Quién está habilitado ante la DIAN | El proveedor, autorizado por la DIAN (art. 616-4 E.T.), que factura **por mandato** de la empresa | La propia empresa, que se habilita como facturador con software propio; el proveedor solo le presta el motor |
| Contrato | Contrato de mandato | Licencia o suscripción de software |
| Responsabilidad por la transmisión y la conservación | Compartida con el PT, que tiene obligaciones propias ante la DIAN | De la empresa |
| Verificación | Debe aparecer en el **catálogo oficial de proveedores tecnológicos** de la DIAN | No aparece en ese catálogo; se verifica que el software esté registrado en el portal de habilitación de la empresa |

Las dos son legales. La diferencia importa para saber **quién responde** si un documento no se transmite o se pierde, y quién conserva los XML. **Requisito:** antes de firmar, el proveedor confirma por escrito en qué modalidad opera, y si dice ser PT, se verifica en el catálogo de la DIAN.

Lo que se encontró:
- **MATIAS API** dice en su propuesta comercial 2026 que opera en modalidad **software propio**, aunque otra página suya lo asocia a la de proveedor tecnológico. Hay que aclararlo con ellos.
- **Factus** indica que el rango de numeración se asocia «con tu proveedor tecnológico (Factus)» en la plataforma de la DIAN.

---

## 4. Proveedores revisados

### 4.1 API dedicada

#### Factus

| Aspecto | Lo que se encontró |
|---|---|
| Documentos | Factura, nota crédito, nota débito, documento soporte y sus notas de ajuste, nómina electrónica y sus notas, recepción de documentos con eventos RADIAN |
| API | REST, OAuth2 (token con refresco), colecciones de Postman y Bruno, documentación pública en `developers.factus.com.co` |
| Sandbox | Gratis e ilimitado (compartido); sandbox privado al comprar un plan. Las pruebas no consumen documentos |
| Idempotencia | **Sí.** Si se reenvía una factura con un `reference_code` ya usado, devuelve la factura existente en lugar de crear otra |
| Respuesta | Síncrona: la llamada devuelve la validación de la DIAN (~2,5 s con pocos ítems) |
| Webhooks | **No tiene.** Para documentos que queden pendientes hay que consultar el estado |
| Anticipos y pago mixto | Sí (`prepayment_details`, varios `payment_details` con forma y medio de pago) |
| PDF y correo | Envía PDF y XML por correo sin costo adicional; permite PDF propio (`send_email: false` y luego envío con PDF en base64) |
| Certificado digital | Cada empresa necesita el suyo (Factus ayuda con la habilitación y vende certificados) |
| Activación | 1–3 días hábiles tras el pago. Pide Cámara de Comercio (≤30 días), cédula del representante legal, RUT y rango de numeración |
| Vigencia | Paquetes con vigencia de 1 año |
| Precios | **No son públicos**; se cotizan por WhatsApp |
| Catálogos | Usa sus propias tablas de referencia (municipios, tributos, unidades); el adaptador debe traducir desde los códigos DANE/DIAN del CRM |

#### MATIAS API (LOPEZSOFT S.A.S.)

| Aspecto | Lo que se encontró |
|---|---|
| Documentos | Factura, notas, documento soporte, POS electrónico, nómina electrónica (incluida en todos los planes), eventos de recepción RADIAN |
| API | REST con documentación OpenAPI en `docs.matias-api.com`; ejemplos en Node.js entre otros |
| Webhooks | **Sí**, de aceptación, rechazo y errores de la DIAN |
| Certificado digital | Incluido en los planes PYME y en los paquetes por NIT |
| Conservación | Custodia del XML por 5 años. Los PDF, QR y ZIP temporales se borran a diario y se regeneran por API, así que **el CRM debe guardar su propia copia** (la norma comercial pide 10 años) |
| SLA | 99,9 % mensual, sujeto a la disponibilidad de la DIAN; soporte estándar de 1 a 8 horas hábiles |
| Trayectoria | Desde 2020; dicen tener más de 800 empresas activas y 8 millones de documentos procesados en 2025 |
| Modalidad | Software propio (por aclarar, ver [§3](#3-modalidad-ante-la-dian-proveedor-tecnológico-o-software-propio)) |
| IVA del servicio | Excluido de IVA según su propuesta (art. 476 num. 21 E.T.) |

Precios publicados (2026, por año):

| Plan | Documentos/año | Precio anual | Costo por documento |
|---|---|---|---|
| PYME Pro | 500 | $196.000 | $392 |
| PYME Pro | 1.200 | $265.000 | $221 |
| PYME Pro | 3.000 | $365.000 | $122 |
| PYME Pro | 8.000 | $560.000 | $70 |
| Paquete por NIT | 15.000 | $750.000 | $50 |
| Paquete por NIT | 30.000 | $1.140.000 | $38 |
| Paquete por NIT | 50.000 | $1.700.000 | $34 |

Los paquetes por NIT incluyen el certificado digital y el soporte para la habilitación ante la DIAN. Si el paquete se agota antes del año, hay que comprar otro.

#### Otros que vale la pena cotizar

| Proveedor | Lo que se encontró |
|---|---|
| Nextpyme Plus | Plan para desarrolladores a $60 por documento, SDK para Node.js, sandbox gratis y certificado incluido |
| Plemsi | Planes desde $20.000 al mes |
| Bilidox | Planes desde $24.000 al año por 15 documentos (insuficiente para nuestro volumen, pero muestra su escala de precios) |

No se encontraron datos públicos suficientes de Dataico, The Factory HKA, Facturatech ni Carvajal; se pueden cotizar si los anteriores no convencen.

### 4.2 Software contable con API

#### Alegra

| Aspecto | Lo que se encontró |
|---|---|
| API | REST con autenticación básica (usuario + token), documentación OpenAPI en `developer.alegra.com` |
| Módulos relevantes | Facturas de venta, notas crédito, pagos, contactos, ítems, numeraciones, impuestos, retenciones, comprobantes recibidos (buzón de recepción con respuesta a eventos), nómina por API |
| Webhooks | **Sí**, con suscripción por evento |
| Modelo de factura | Referencia el `id` del contacto y del ítem en Alegra → hay que crear o buscar el cliente y el producto en Alegra antes de facturar |
| Retenciones | Se pueden enviar en la factura, igual que los pagos |
| Precios | Planes desde unos $18.000 hasta unos $180.000 al mes según fuentes de terceros; no se confirmó qué plan incluye la API para Colombia |

#### Siigo Nube

| Aspecto | Lo que se encontró |
|---|---|
| API | Credenciales «Usuario API» + «Access Key» que se generan en *Configuraciones → Alianzas e integraciones → Credenciales de integración* |
| Uso típico | Crear facturas y notas crédito, gestionar clientes y productos, registrar pagos y consultar la contabilidad. Hay integraciones de terceros (Shopify y otras) que lo hacen con reintento automático |
| Modelo de factura | Como en Alegra: cliente y producto deben existir en Siigo, y la factura usa el tipo de comprobante configurado en Siigo |
| Errores conocidos | Rechazos por parámetros inactivos en la cuenta de Siigo: la configuración del lado de Siigo también falla |
| Precios | No se encontró la tarifa de la API; se cotiza con Siigo |

---

## 5. Costo estimado para nuestro volumen

Volumen actual: 972 a 1.336 OP al mes en agosto, septiembre y octubre, y creciendo.

| Escenario | Documentos/año aprox. (con ~10 % de notas) | Plan MATIAS que encaja | Costo anual aprox. |
|---|---|---|---|
| Solo las OP con IVA (lo que se factura hoy, ~100/mes) | ~1.300 | PYME Pro 3.000 | $365.000 |
| Todas las OP al ritmo de hoy (~1.300/mes) | ~17.000 | Paquete por NIT 30.000 | $1.140.000 |
| Todas las OP si el crecimiento sigue (~2.500/mes) | ~33.000 | Paquete por NIT 50.000 | $1.700.000 |

Con un precio de $60 por documento (Nextpyme), los mismos escenarios cuestan $78.000, $1.020.000 y $1.980.000 al año.

**Lectura:** en cualquier escenario el costo del proveedor es pequeño frente al riesgo de no facturar; lo que pesa es el desarrollo y el saneamiento de datos. Si se elige un software contable (Siigo o Alegra), el costo es la suscripción mensual del software, que el cliente quizás ya paga.

---

## 6. Qué hace el proveedor y qué sigue haciendo el CRM

| Responsabilidad | Proveedor | CRM |
|---|---|---|
| XML UBL 2.1, firma digital, CUFE/CUDE, QR | ✔ | |
| Transmisión a la DIAN y validación previa | ✔ | |
| Correo al cliente con PDF y XML | ✔ (o el CRM con su propio PDF) | |
| Custodia de los XML | ✔ (5 años según el proveedor) | ✔ copia propia por 10 años |
| Cálculo de subtotales, IVA por línea, descuentos, redondeo | | ✔ El proveedor **valida**, no corrige |
| Datos fiscales del cliente (tipo de documento, DV, municipio, responsabilidades) | | ✔ |
| Decidir cuándo se factura y qué nota corresponde a cada evento | | ✔ |
| No facturar dos veces la misma OP | Ayuda (idempotencia de Factus) | ✔ responsable final |
| Bloquear ediciones de una OP facturada | | ✔ |
| Cartera, saldos, caja | | ✔ |

**Lo que el proveedor no resuelve:** todo lo de la Fase 0 a la Fase 2 del análisis (régimen, IVA por producto, total facturado frente a neto a recibir, datos de clientes, DIVIPOLA). El proveedor rechaza la factura si los números no cuadran o falta un dato; no los inventa.

---

## 7. Diseño de la integración en el backend

### 7.1 Estructura

Un módulo nuevo `backend/src/modules/electronic-invoicing/`, siguiendo el patrón controller → service → repository del proyecto:

```
electronic-invoicing/
├── electronic-invoicing.module.ts
├── electronic-invoicing.controller.ts        # emitir, reintentar, descargar PDF/XML, listar
├── electronic-invoicing.service.ts           # reglas: cuándo se factura, qué nota, bloqueos
├── electronic-invoicing.repository.ts        # ElectronicDocument, NumberingRange, eventos
├── electronic-invoicing.worker.ts            # procesa la cola (@Cron cada minuto)
├── mappers/
│   └── order-to-invoice.mapper.ts            # OP → documento neutral (función pura, con tests)
├── providers/
│   ├── electronic-invoicing-provider.interface.ts
│   ├── factus.provider.ts                    # un adaptador por proveedor
│   └── matias.provider.ts
└── dto/
```

### 7.2 Contrato del adaptador

```ts
export interface ElectronicInvoicingProvider {
  /** Emite y espera la validación de la DIAN. Idempotente por `referenceCode`. */
  emit(doc: NeutralDocument): Promise<ProviderResult>;
  /** Consulta por referencia; se usa tras un timeout, antes de reintentar. */
  findByReference(referenceCode: string): Promise<ProviderResult | null>;
  downloadXml(providerDocId: string): Promise<Buffer>;
  downloadPdf(providerDocId: string): Promise<Buffer>;
}

export type ProviderResult =
  | { status: 'ACCEPTED'; providerDocId: string; prefix: string; number: number; cufe: string; issuedAt: Date }
  | { status: 'REJECTED'; messages: string[] }   // error de datos: no se reintenta
  | { status: 'PENDING'; providerDocId?: string }; // el proveedor o la DIAN no respondieron
```

`NeutralDocument` usa los códigos oficiales (DANE, tipos de documento DIAN, UN/ECE para unidades). Cada adaptador traduce a las tablas del proveedor (Factus, por ejemplo, usa identificadores propios de municipio y tributo). Cambiar de proveedor es escribir otro adaptador, sin tocar el servicio.

### 7.3 Flujo con cola (patrón *outbox*)

```
OP pasa a «Entregada»
   │  misma transacción que el cambio de estado
   ▼
INSERT ElectronicDocument (PENDING, referenceCode = id del documento)
   │  commit — nunca se llama al proveedor dentro de la transacción de la OP
   ▼
Worker (cada minuto)
   SELECT … FROM electronic_documents
   WHERE status = 'PENDING' AND next_attempt_at <= now()
   FOR UPDATE SKIP LOCKED LIMIT 10
   │
   ├─ ACCEPTED → guardar CUFE, número; descargar XML y PDF al almacenamiento propio; OP congelada
   ├─ REJECTED → guardar mensajes, avisar al asesor; queda esperando corrección y reenvío manual
   └─ PENDING o timeout → findByReference(); si no existe, reintentar con espera exponencial
```

Por qué así:
- **No se llama a un servicio externo dentro de la transacción de la OP.** La OP se bloquea por fila al escribir su saldo; una llamada de 2–3 segundos (o un timeout de 30) dentro de esa transacción retendría el bloqueo y conexiones del pool.
- **`FOR UPDATE SKIP LOCKED`** evita que dos instancias del backend tomen el mismo documento. Hoy el backend no aguanta réplicas (los crons se duplican); este worker no debe sumar otro caso.
- **El `referenceCode` es estable**: el mismo documento siempre se envía con la misma referencia, así que un reintento tras un timeout no crea una segunda factura en el proveedor (Factus lo garantiza; con otros hay que confirmar).
- **Índice único parcial** en `electronic_documents (order_id) WHERE type = 'INVOICE' AND status <> 'REJECTED'`: aunque llegue un doble clic o dos cambios de estado seguidos, no pueden existir dos facturas vivas para la misma OP.

### 7.4 Cuándo se dispara

La recomendación sigue siendo emitir al pasar a «Entregada». Pero en el código hay una advertencia (`work-orders.service.ts`): *«en la práctica la OP se marca entregada antes de que alguien registre la OT»*. Es decir, a veces «Entregada» se marca antes de tiempo. Para no facturar OP que todavía se van a corregir, se propone un **retardo configurable**:

| Modo | Comportamiento |
|---|---|
| `IMMEDIATE` | Se emite en el siguiente ciclo del worker |
| `DELAYED` (por defecto en el piloto) | Se emite N horas después de marcar «Entregada» (p. ej. al cierre del día). Si la OP se edita o sale de «Entregada» antes, el documento pendiente se cancela |

Además, botón «Facturar ahora» para el cliente que pide la factura en el momento.

### 7.5 Configuración y secretos

| Variable | Uso |
|---|---|
| `EINVOICE_PROVIDER` | `factus` \| `matias` \| `none` (`none` desactiva todo el módulo) |
| `EINVOICE_ENV` | `sandbox` \| `production` |
| `EINVOICE_BASE_URL` | URL del proveedor según el ambiente |
| `EINVOICE_CLIENT_ID`, `EINVOICE_CLIENT_SECRET` / `EINVOICE_API_TOKEN` | Credenciales; solo en Railway, nunca en el repo ni en logs |
| `EINVOICE_EMIT_MODE`, `EINVOICE_EMIT_DELAY_HOURS` | Modo de disparo de [§7.4](#74-cuándo-se-dispara) |

**Guarda al arrancar:** si `NODE_ENV` no es `production` y `EINVOICE_ENV` es `production`, el backend no arranca. Desarrollo y staging nunca deben poder emitir facturas reales.

### 7.6 Lo demás

- **Cliente HTTP:** `fetch` nativo con timeout, igual que `whatsapp.service.ts`. Token OAuth2 en memoria con renovación antes de vencer (Factus).
- **Sin webhooks (Factus):** la respuesta síncrona cubre casi todo; el worker consulta los pendientes. **Con webhooks (MATIAS, Alegra):** endpoint `@Public()` que valida la firma o el secreto compartido y solo marca el documento para que el worker lo procese, de modo que un webhook repetido no cause nada.
- **Archivos:** XML y PDF descargados al almacenamiento propio (`UploadedFile`) y servidos con URLs prefirmadas.
- **Observabilidad:** logs estructurados por documento en Loki; alerta si hay documentos pendientes por más de 30 minutos o más de 3 rechazos en una hora.
- **Invariantes:** agregar a `db-invariants.sh` las OP entregadas hace más de 24 horas sin factura aceptada, y las facturas aceptadas cuyo total no cuadra con la OP.
- **Permisos:** los de RF-19 del análisis, registrados en `sync-permissions.ts`, `permission-labels.ts` y `PermissionsSelector.tsx`.
- **Pruebas:** el mapper (OP → documento) es una función pura con pruebas de cuadre; cada adaptador con respuestas grabadas del sandbox; el servicio con el adaptador simulado.

### 7.7 Si se elige un software contable (Siigo o Alegra)

El diseño es el mismo, con dos piezas más dentro del adaptador:
1. **Sincronización de terceros:** antes de facturar, buscar el cliente por número de documento; si no existe, crearlo; si cambió, actualizarlo. Guardar el `id` externo en el cliente del CRM.
2. **Sincronización de productos:** igual, con un producto genérico por categoría si el catálogo del CRM no se quiere replicar ítem por ítem (decisión con el contador, porque afecta las cuentas contables).

Y una decisión de negocio: **qué sistema manda en la cartera.** Si los pagos se siguen registrando en el CRM, hay que decidir si también se envían al software contable como recibos de caja o si el contador los concilia aparte.

---

## 8. Prueba de concepto antes de elegir

Una semana, con dos candidatos en paralelo (los dos sandboxes son gratis). Se usan **datos de staging, no de producción**, para no enviar datos reales de clientes a un proveedor que todavía no se ha contratado.

Casos que cada proveedor debe resolver:

| # | Caso | Qué se comprueba |
|---|---|---|
| 1 | Factura simple con IVA 19 % a empresa con NIT | Flujo básico, CUFE, PDF, correo |
| 2 | Factura a persona natural con cédula | Tipo de documento y nombres |
| 3 | Factura a consumidor final | Identificación genérica |
| 4 | Total con redondeo comercial a 100 | Que la DIAN acepte el ajuste de redondeo |
| 5 | Descuento global sobre varias líneas | Prorrateo y base del IVA |
| 6 | Prueba de color como línea adicional | Cargo con IVA |
| 7 | Anticipo + saldo a crédito (pago mixto) | Anticipos y formas de pago |
| 8 | Retenciones informativas | Que no alteren el total a pagar |
| 9 | Mezcla de línea gravada y línea excluida | IVA por línea |
| 10 | Nota crédito parcial por un ítem | Referencia a la factura y CUDE |
| 11 | Nota crédito total | Anulación |
| 12 | Nota débito | Aumento de valor |
| 13 | Reenvío con la misma referencia | Idempotencia real |
| 14 | Timeout simulado | Que `findByReference` evite el duplicado |
| 15 | Dato inválido (DV incorrecto) | Claridad del mensaje de rechazo |

Criterios de evaluación: casos superados, claridad de los errores, tiempo de respuesta, calidad de la documentación, respuesta del soporte durante la prueba, y precio confirmado por escrito.

---

## 9. Esfuerzo estimado

Estimación gruesa para una persona, **solo la integración** (sin las Fases 0–2 del análisis, que son datos y cálculo y siguen siendo prerrequisito):

| Bloque | Duración |
|---|---|
| Prueba de concepto con dos proveedores | 1 semana |
| Modelo de datos, módulo, cola, mapper y un adaptador | 1,5–2 semanas |
| Interfaz en la OP (estado, descargas, reintento, «Facturar ahora») y listado | 1 semana |
| Notas crédito y débito conectadas a anulación, anulación parcial, devoluciones y descuentos | 1,5–2 semanas |
| Piloto en producción con OP con IVA y ajustes | 1 semana |
| **Total integración** | **6–7 semanas** |
| Si es Siigo o Alegra: sincronización de clientes y productos | +1–1,5 semanas |

La habilitación ante la DIAN y la resolución de numeración (2–4 semanas de trámite) corren en paralelo.

---

## 10. Riesgos propios de depender de un proveedor

| Riesgo | Mitigación |
|---|---|
| El proveedor cae el día de muchas entregas | La cola reintenta sola; el sistema actual de facturación queda como respaldo documentado |
| El proveedor cierra, sube precios o cambia la API | Adaptador aislado; copia propia de todos los XML y PDF; contrato anual, no plurianual |
| Paquete de documentos agotado antes del año | Alerta al 80 % del paquete (consultable por API en Factus) |
| Proveedor que no es lo que dice ser | Verificación en el catálogo de la DIAN y modalidad por escrito |
| Custodia de solo 5 años | Copia propia por 10 años |
| Certificado digital que vence | Alerta 30 días antes; confirmar si lo renueva el proveedor |
| Datos personales de clientes en un tercero | Cláusula de tratamiento de datos en el contrato y mención en la política de datos |

---

## 11. Qué hay que decidir

1. **¿Qué software contable usa el contador?** Define si se va por el tipo A o el B.
2. **¿Quiénes pasan a la prueba de concepto?** Propuesta: Factus y MATIAS si es tipo A; Siigo o Alegra (el que use el contador) si es tipo B.
3. **¿Se factura todo o solo lo que lleva IVA?** Cambia el plan de 1.300 a 17.000 documentos al año. Es la misma pregunta legal del análisis, y la responde el contador, no el proveedor.
4. **¿Factura inmediata o al cierre del día?** ([§7.4](#74-cuándo-se-dispara))
5. **¿PDF del proveedor o PDF propio con el diseño de High Solutions?**

---

## 12. Fuentes

- Factus — [Sitio](https://www.factus.com.co/), [documentación para desarrolladores](https://developers.factus.com.co/), [preguntas frecuentes](https://developers.factus.com.co/buenas-practicas/preguntas-frecuentes)
- MATIAS API — [Sitio](https://matias-api.com/), [propuesta comercial 2026](https://matias-api.com/propuesta-comercial), [modalidad software propio](https://matias-api.com/software-propio), [casas de software](https://matias-api.com/casas-de-software/)
- Alegra — [Documentación de la API](https://developer.alegra.com/), [índice de endpoints](https://developer.alegra.com/llms.txt), [crear factura de venta](https://developer.alegra.com/reference/post_invoices.md)
- Siigo — [Credenciales de integración (guía de Treli)](https://intercom.help/treli/es/articles/10944642-como-integrar-treli-con-mi-cuenta-de-siigo), [integración con Jelou](https://docs.jelou.ai/en/guides/integraciones/facturacion/siigo), [motivos de rechazo](https://intercom.help/treli/es/articles/14472109-motivos-de-rechazo-de-facturas-o-recibos-de-caja-en-siigo)
- [Nextpyme Plus](https://nextpyme.plus/), [Plemsi](https://plemsi.com/), [Bilidox](https://bilidox.com/)
- DIAN — [Catálogo de proveedores tecnológicos](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/proveedores-tecnologicos/)
- Precios de Alegra (terceros) — [Guía de Software](https://www.guiadesoftware.com/software/alegra)
