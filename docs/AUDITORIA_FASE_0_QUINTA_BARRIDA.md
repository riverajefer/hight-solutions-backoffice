# Quinta barrida — Fase 0

Última barrida antes del fork hacia Zoom (previsto para el viernes). Se enfocó en
dos cosas:

1. **Que el clon pueda arrancar limpio**: una base vacía, el seed, los permisos,
   la marca y los datos de High escritos en el código.
2. **Los módulos que ninguna barrida había revisado**: usuarios y roles,
   almacenamiento, comentarios, prospectos y la restauración de cotizaciones
   (recién agregada).

Lo del punto 1 no se supuso: se levantó un **PostgreSQL 17 desechable en Docker**
(la misma versión mayor que producción, 17.11), se corrieron las 121
migraciones, el seed, `sync-permissions` y los invariantes, y se comparó el
resultado contra producción. El contenedor se eliminó al terminar.

Las cifras de producción salen de `scripts/db-query.sh` en solo lectura,
consultado el 2026-09-16.

Corregidos: los hallazgos **1, 2, 3, 4 y 7**. Los demás siguen en diagnóstico.

---

## Lo que ya está listo para el fork

Antes de los hallazgos, lo que salió bien, porque es la base del plan:

- **Las 121 migraciones aplican sin errores sobre una base vacía.** Las que
  modifican datos (limpiezas de solicitudes, backfills) no hacen nada cuando no
  hay filas.
- **El esquema resultante es idéntico al de producción.** Se comparó con
  `prisma migrate diff`: las diferencias contra `schema.prisma` son exactamente
  las mismas 69 líneas en la base nueva y en producción. Una base de Zoom creada
  desde las migraciones queda estructuralmente igual a la de High.
- **El seed corre sin errores desde cero** (18 s).
- **12 de los 13 invariantes pasan** en la base nueva, incluido el de
  consecutivos.
- **Los `.env.example` están completos**: todas las variables que lee el código
  están documentadas.

---

## 1. Quien crea usuarios o roles puede convertirse en admin — **Alta** · ✅ Corregido

Tres caminos permiten a un usuario sin permisos de administrador conseguirlos:

| Endpoint | Permiso que exige | Qué deja hacer |
|---|---|---|
| `POST /users` | `create_users` | Crear un usuario con **cualquier** `roleId`, incluido admin |
| `PUT /users/:id` | `update_users` | Cambiar el rol de **cualquier** usuario, incluido el propio |
| `POST /roles` | `create_roles` | Crear un rol con `permissionIds` = todos, sin pasar por `manage_permissions` |

Los servicios solo verifican que el rol exista
([users.service.ts:117](../backend/src/modules/users/users.service.ts#L117),
[users.service.ts:194](../backend/src/modules/users/users.service.ts#L194),
[roles.service.ts:68](../backend/src/modules/roles/roles.service.ts#L68)).

**En producción esto no es teórico.** El rol **contabilidad** tiene
`create_users` y `create_roles`, con 2 usuarios activos. Cualquiera de los dos
puede crear un rol con todos los permisos, o directamente una cuenta con rol
admin. El seed, además, le da `create_users` y `update_users` al rol manager,
así que en Zoom el problema nace desde el primer día.

**Corrección propuesta:** la regla estándar. Un usuario solo puede asignar un
rol cuyos permisos sean un subconjunto de los suyos, y `POST /roles` con
`permissionIds` exige `manage_permissions` o cumple la misma regla. Es una sola
comprobación compartida por los tres caminos, y se arregla una vez para los dos
sistemas si se hace antes del fork.

### Lo que apareció al corregirlo

Había **dos caminos más** que los tres de la tabla:

- `UpdateUserDto` acepta `password`, `email` y `username`. Con `update_users`
  se le podía **cambiar la contraseña al admin** y entrar con su cuenta, sin
  tocar ningún rol.
- `assertAdmin` compara el nombre del rol **en minúsculas**, pero el nombre
  único de la base distingue mayúsculas. Con `create_roles` se podía crear un
  rol «Admin», asignárselo a una cuenta, y esa cuenta pasaba como
  administradora.

### Corrección aplicada

Una sola regla,
[`RolePrivilegeService`](../backend/src/modules/roles/role-privilege.service.ts):
**solo puedes asignar, otorgar o modificar lo que ya está contenido en tus
propios permisos.** Se compara por conjunto de permisos, no por nombre, así que
un rol igual o menor al propio sigue siendo asignable. Se aplica en:

| Endpoint | Qué se valida |
|---|---|
| `POST /users` | El rol asignado |
| `PUT /users/:id` | El usuario editado (su rol no puede ser mayor) y, si cambia, el rol nuevo |
| `POST /roles` | Los permisos iniciales |
| `PUT /roles/:id` | El rol editado |
| `PUT`, `POST` y `DELETE /roles/:id/permissions` | El rol editado y los permisos que se otorgan |
| `DELETE /roles/:id` | El rol eliminado |

El rol `admin` es la excepción, en los dos sentidos:

- **Quien es admin no tiene restricción.** En producción al admin le faltan 6
  permisos que sí tienen otros roles (los heredados de `*_areas` y los de
  reversión de pagos de CP). Con la regla estricta, el admin no habría podido
  asignar caja, contabilidad ni operarios.
- **Tocar el rol admin exige ser admin**, sin importar sus permisos. Esto lo
  destapó una prueba: comparar solo conjuntos subestima al admin, que el sistema
  reconoce por nombre en 24 archivos. Con pocos permisos, un rol menor habría
  podido asignarlo.

Además, **«admin» queda reservado**: ningún rol puede crearse ni renombrarse
así, en ninguna combinación de mayúsculas; el rol admin no se puede renombrar
ni eliminar.

El alta de empleados desde nómina también crea usuarios, pero con un rol fijo
que elige el sistema, no quien hace la petición. Ahí la regla no aplica, y el
código lo dice explícitamente.

**Qué cambia para contabilidad en producción:** sigue pudiendo crear usuarios
de operarios, Comercial, diseño, user y contabilidad, que son los roles con los
que se crearon cuentas en los últimos 90 días (6 de operarios, 3 de Comercial).
Ya no puede asignar caja, Comercial Lider, manager ni admin.

### Verificación

Contra un backend real y la base de desarrollo, con un rol de prueba con los
permisos que tenía contabilidad (`create_users`, `update_users`,
`create_roles`) y luego también `manage_permissions`, `update_roles` y
`delete_roles`:

| Intento | Resultado |
|---|---|
| Crear una cuenta con rol admin | 403 |
| Crear un rol con todos los permisos | 403, con la lista de los que faltan |
| Crear un rol llamado «Admin» | 400 |
| Cambiarle la contraseña al admin | 403 |
| Darse a sí mismo el rol admin | 403 |
| Reemplazar o quitar permisos del rol admin | 403 |
| Renombrar o eliminar el rol admin | 403 / 400 |
| Agregarse un permiso que no tiene | 403 |
| Editar un rol mayor (caja) | 403 |
| Renombrar un rol propio a «ADMIN» | 400 |
| Crear una cuenta con su mismo rol | 201 |
| Crear un rol con un permiso propio | 201 |
| Editar su propio nombre | 200 |
| El admin edita a otros usuarios | 200 |

Al final el admin conservó su contraseña y su rol quedó igual (mismo nombre,
190 permisos). Las cuentas de prueba (`pruebaqa.escalamiento`,
`pruebaqa.subordinado`) quedaron desactivadas; los roles «PRUEBA QA …» quedan
en desarrollo.

Suite completa: 188 suites y 2.876 tests en verde, con 38 pruebas nuevas.

---

## 2. El seed crea credenciales conocidas y datos de demostración — **Alta para el fork** · ✅ Corregido

`seed.ts` no mira el entorno. Corriéndolo con `NODE_ENV=production` sobre la
base vacía, quedó esto:

| Qué | Cantidad |
|---|---|
| Usuarios con contraseña conocida (`adminsistema/admin123`, `managersistema/manager123`, `usuariosistema/user123`) | 3 |
| Clientes ficticios | 10 |
| Proveedores ficticios | 10 |
| Órdenes de demostración | 3 |
| **Pagos de demostración** | **4** |
| Cotizaciones de demostración | 2 |
| Empresa | «High Solutions S.A.S», `www.highsolutions.com`, NIT `900000000-0` |

Además crea las áreas de producción y los cargos de High (Papelería, Ploter gran
formato…), que no tienen por qué ser los de Zoom.

Los 4 pagos de demostración **ya rompen el invariante «Pagos que mueven dinero
sin rastro en caja»**: Zoom arrancaría con una alerta y con plata ficticia en la
cartera y los tableros.

Hay un riesgo más, para después del arranque:
[`assignPermissionsToRole`](../backend/prisma/seed.ts#L481) **borra** los
permisos de cada rol antes de volver a asignarlos. Si alguien corre el seed en
producción para agregar algo, deshace toda la configuración de roles que se
haya hecho desde la pantalla de Roles. `sync-permissions.ts` sí es seguro, y lo
dice en su encabezado; el seed no.

**Corrección propuesta:** partir el seed en dos.

- **Base**: roles, permisos, departamentos y ciudades, unidades de medida,
  consecutivos, columnas del kanban, tipos de gasto. Se puede correr en
  producción. La contraseña del admin sale de una variable obligatoria
  (`SEED_ADMIN_PASSWORD`) y no crea manager ni usuario de prueba. La empresa se
  deja vacía para llenarla desde la pantalla.
- **Demo**: clientes, proveedores, órdenes, pagos, cotizaciones, productos de
  ejemplo. Se niega a correr si `NODE_ENV=production`.

### Corrección aplicada

Se hizo con una bandera en vez de partir el archivo en dos: `seed.ts` tiene
3.090 líneas en una sola función, y partirlo la víspera del fork era arriesgar
más de lo que arreglaba.

`SEED_DEMO` decide si se siembra la demostración; **por defecto sí fuera de
producción y no en producción**, así que en desarrollo el seed funciona igual
que siempre. Envuelve el catálogo de ejemplo, los clientes, los proveedores, las
órdenes, las cotizaciones, las plantillas de producción, la empresa de High y
las cuentas `managersistema` / `usuariosistema`.

La contraseña del admin sale de `SEED_ADMIN_PASSWORD`. **En producción es
obligatoria** y se valida antes de escribir nada, para no dejar la base a
medias. Fuera de producción sigue siendo `admin123`.

Y `assignPermissionsToRole` dejó de borrar: **un rol que ya tiene permisos no se
toca**. Antes reescribía la lista del archivo y deshacía lo configurado desde la
pantalla de Roles, incluidos los permisos que alguien hubiera quitado a
propósito. Para publicar permisos nuevos en una base en uso, el camino sigue
siendo `npm run prisma:sync:permissions`.

El resumen final ahora cuenta filas contra la base en vez de sumar las listas
del archivo, así que dice la verdad con demo y sin ella.

Las dos variables quedaron documentadas en `backend/.env.example`.

---

## 3. Una base nueva no queda completa solo con el seed — **Media** · ✅ Corregido

`read_orders_dashboard` lo exige `GET /orders/dashboard-summary`, existe en
producción y está en `sync-permissions.ts`, pero **no en el seed**. Una base que
solo corrió el seed no lo tiene, y el tablero de órdenes responde 403 a todos,
incluido el admin.

Verificado en la base desechable: con seed solo, el admin tiene 189 permisos y
le falta ese. Con seed + `sync-permissions`, tiene todos los que exige el
código.

El convenio del repo ya dice que los permisos nuevos van en `sync-permissions`
y no en el seed, así que el seed se va quedando atrás con cada permiso.

**Corrección propuesta:** que el seed base (hallazgo 2) llame la misma lista de
`sync-permissions` en vez de mantener la suya. Mientras tanto, el procedimiento
de arranque de abajo incluye los dos pasos.

### Corrección aplicada

El catálogo salió a
[`prisma/permissions-catalog.ts`](../backend/prisma/permissions-catalog.ts) y
ahora lo usan los dos: `sync-permissions.ts` (sin cambio de comportamiento) y
`seed.ts`, que siembra la unión de su lista y la del catálogo. Una base nueva
queda completa con el seed solo: verificado, el admin sale con **190 de 190
permisos**, `read_orders_dashboard` incluido.

Correr `sync-permissions` después deja de ser obligatorio; sigue siendo el
camino para publicar permisos en una base que ya está en uso.

---

## Verificación de los hallazgos 2 y 3

Sobre un PostgreSQL 17 desechable, con una base vacía por escenario:

| Escenario | Resultado |
|---|---|
| Producción **sin** `SEED_ADMIN_PASSWORD` | Se detiene con el motivo; **0 filas escritas** |
| Producción **con** la contraseña | 1 usuario (`adminsistema`), 0 clientes, 0 proveedores, 0 órdenes, 0 pagos, 0 cotizaciones, 0 empresa |
| Contraseña del admin | La de la variable; `admin123` queda rechazada |
| Permisos | 190 de 190 al admin, `read_orders_dashboard` incluido |
| Invariantes | **13 de 13 OK** (antes fallaba el de pagos sin rastro en caja) |
| Desarrollo | Igual que siempre: 21 productos, 10 clientes, 10 proveedores, 3 órdenes, 2 cotizaciones y las 3 cuentas de prueba |
| Segundo seed tras configurar roles a mano | Respetó los permisos quitados y los agregados; no duplicó usuarios ni empresa |

Suite completa del backend: 189 suites y 2.892 tests en verde.

---

## 4. `schema.prisma` no coincide con las migraciones — **Media, trampa latente** · ✅ Corregido

La comparación dio 69 líneas de diferencia, las mismas en producción que en la
base nueva. Por eso el que está desalineado es `schema.prisma`:

| Diferencia | Detalle |
|---|---|
| 4 índices que existen en la base y no en el esquema | `payments(order_id, is_voided)` y tres de `refund_requests` |
| 8 llaves foráneas con otro `ON DELETE` | Las migraciones escritas a mano omiten la cláusula; el esquema dice `Restrict` o `SetNull`. Incluye la de `quote_restore_requests`, agregada hoy |
| Un tipo de columna | `expense_orders.electronic_invoice_number` es `VARCHAR(30)`; el esquema dice `TEXT` |
| Nombres truncados | Dos restricciones con el nombre que PostgreSQL cortó a 63 caracteres |

Hoy no rompe nada. **El problema es el próximo `prisma migrate dev`**: Prisma
mete estas 69 líneas en la migración nueva junto con el cambio que se quería
hacer, sin avisar. Entre ellas está `DROP INDEX payments_order_id_is_voided_idx`,
el índice que usan todos los cálculos de saldo de pagos. En Zoom eso pasaría
justo con la primera migración de sedes.

**Corrección propuesta:** alinear `schema.prisma` con la base real —agregar los
`@@index`, `@db.VarChar(30)`, los `map:` de los nombres y el `onDelete` que de
verdad tiene cada llave— hasta que `prisma migrate diff` salga vacío. No
requiere migración: solo cambia el esquema. Después, un chequeo en CI con
`migrate diff --exit-code` para que no vuelva a abrirse.

### Corrección aplicada

Casi todo se resolvió en el esquema, sin tocar la base:

- Los 4 índices que faltaban: `payments([orderId, isVoided])` —el que usan
  todos los recálculos de saldo— y tres de `refund_requests`.
- `@db.VarChar(30)` en `expense_orders.electronicInvoiceNumber` (en `orders` la
  columna equivalente sí es `TEXT`).
- El `onDelete` real de 8 llaves foráneas: `NoAction` donde la migración no
  declaró la cláusula, y `Restrict` en `expense_orders.authorizedTo`, donde
  Prisma asumía `SetNull` por ser opcional.

**La propuesta original no alcanzaba.** Los `map:` no se podían usar: la
migración que creó `account_payable_payment_reversal_requests` dejó la llave
foránea de `payment_auth_request_id` y su índice único **con el mismo nombre**,
truncado a los 63 caracteres de PostgreSQL. El motor lo permite; Prisma rechaza
el esquema entero («has to be unique in the following namespace»), así que
mientras estuvieran así `schema.prisma` no podía describir la base.

Por eso hubo una migración:
[`20260917010000_align_schema_with_migrations`](../backend/prisma/migrations/20260917010000_align_schema_with_migrations/migration.sql).
Renombra cuatro objetos de esa tabla a los nombres que Prisma genera por
convención. Solo cambia nombres: no toca datos, no reescribe la tabla y no
cambia comportamiento. Es idempotente, porque dev y staging comparten base.

Para que no se vuelva a abrir en silencio quedó `npm run prisma:drift`, que
compara la base apuntada por `DATABASE_URL` contra `schema.prisma` y sale con
código distinto de cero si hay diferencias. No hay CI en el repo, así que por
ahora se corre a mano (o se agrega al pipeline cuando exista).

### Verificación

Sobre una base vacía con las 123 migraciones aplicadas:

- `prisma migrate diff` → **«This is an empty migration»**, sin diferencias.
- `prisma generate` → cliente generado sin errores (antes el esquema no era
  válido).
- El SQL de la migración corrido dos veces sobre la misma base: la segunda no
  hace nada y no falla.
- `npm run prisma:drift` sale 0 contra la base alineada.
- Suite completa: 189 suites y 2.892 tests en verde; `tsc` limpio.

Producción tiene dos migraciones pendientes de aplicar, que entran en el próximo
despliegue: la de los estados de seguimiento de cotizaciones (de otra sesión) y
esta.

**Un detalle del proceso, por si sirve:** en el primer intento di por cerrado el
desalineado con un `migrate diff` que salía vacío. Salía vacío porque yo había
silenciado `stderr` y lo que en realidad ocurría era que Prisma **rechazaba el
esquema**. Las comprobaciones de arriba se repitieron con los errores visibles.

---

## 5. Los PDF que reciben los clientes llevan los datos de contacto de High — **Alta para el fork**

La tercera barrida dejó pendiente la marca escrita en código. El punto más
peligroso no estaba en su tabla:
[`pdfConstants.ts`](../frontend/src/utils/pdfConstants.ts) guarda **la dirección,
los dos teléfonos y el correo reales de High**, y se imprimen en los PDF de
órdenes, cotizaciones, OT y OG. Si el fork lo pasa por alto, los clientes de Zoom
reciben documentos con los datos de contacto de otra empresa. Es un error que
nadie ve desde adentro.

Inventario completo, de más a menos visible para el cliente final:

| Qué | Dónde |
|---|---|
| Dirección, teléfonos y correo en los PDF | `pdfConstants.ts` |
| Nombre y sitios web en el encabezado y pie de los PDF | `generateOrderPdf.ts`, `generateQuotePdf.ts`, `generateWorkOrderPdf.ts`, `generateExpenseOrderPdf.ts` |
| «…de High Solutions» en el texto que se comparte por WhatsApp | `OrderDetailPage.tsx:603`, `QuoteDetailPage.tsx:251` |
| Logo, favicon y título de la pestaña | `assets/logo.png`, `assets/logo-dark.webp`, `public/favicon.png`, `index.html` |
| Pantalla de login, barra superior y lateral | `LoginForm.tsx`, `Topbar.tsx`, `Sidebar.tsx` |
| Página de mantenimiento | `maintenance.middleware.ts:43` |
| Nombre por defecto si falta `VITE_APP_NAME` | `environment.ts:87`, `frontend/.env.example` |
| Empresa del seed | `seed.ts:2578` (ver hallazgo 2) |

**Corrección propuesta:** que los PDF y los textos de WhatsApp lean nombre,
dirección, teléfonos, correo y sitio web del módulo Company, que ya existe y ya
guarda los logos. Lo demás, de `VITE_APP_NAME`. Hecho en High antes del viernes,
el fork no cambia código de marca: solo llena la pantalla de Empresa y una
variable.

---

## 6. El rol admin se busca por nombre en 24 archivos — **Media para el fork**

La tercera barrida encontró 6 archivos que buscan el rol por su nombre
(`role.name === 'admin'`). **Hoy son 24** (28 apariciones), entre ellos las
aprobaciones por WhatsApp, las notificaciones a administradores, el guard de
edición de órdenes y varias pantallas.

En Zoom el rol tiene que llamarse **exactamente `admin`**. Si se renombra
—«Administrador», por ejemplo— dejan de llegar las solicitudes de aprobación y
los botones de admin desaparecen, sin ningún error.

**Corrección propuesta:** a mediano plazo, reemplazar la comparación por un
permiso. Para el viernes basta con dejarlo escrito en el procedimiento.

---

## 7. Dependencias con vulnerabilidades conocidas — **Media** · ✅ Corregido (en parte)

`npm audit` sobre las dependencias de producción:

| | Crítica | Alta | Moderada |
|---|---|---|---|
| Backend | 2 | 23 | 18 |
| Frontend | 1 | 5 | 9 |

La mayoría del backend viene de herramientas del CLI de Prisma que no corren en
el servidor, y su «arreglo» propuesto es bajar a Prisma 6: se ignora.

Las que tocan código que **sí** corre y tienen arreglo sin cambio de versión
mayor: `@nestjs/core`, `@nestjs/platform-express`, `multer` (la subida de
archivos), `path-to-regexp`, `socket.io-parser`, `engine.io`, `ws`, `axios`,
`form-data` y `jspdf` (crítica, en la generación de PDF).

`xlsx` (alta, sin arreglo en npm) solo afecta a quien **lee** hojas de cálculo;
el sistema solo las escribe, así que no es alcanzable.

**Corrección propuesta:** `npm audit fix` **sin** `--force` en los dos
proyectos, correr las suites y commitear los `package-lock.json`. Hecho antes
del fork, los dos sistemas heredan las dependencias parcheadas.

### Corrección aplicada

**En el frontend la receta funcionó tal cual.** `npm audit fix` sin `--force`:
de 1 crítica y 5 altas a **0 críticas y 1 alta**. Solo cambió el
`package-lock.json`. Se movieron `axios` (1.13.6 → 1.20.0), `jspdf` (4.2.0 →
4.2.1), `ws`, `socket.io-parser`, `form-data` y `js-yaml`.

Eso sí, `axios` cambió el tipo de los encabezados de respuesta y rompió el
chequeo de tipos en `storage.api.ts`: ahora un encabezado puede llegar como
`null` y `Blob` no lo acepta. Se corrigió en el código.

La alta que queda es `xlsx`, sin arreglo publicado en npm y **no alcanzable**:
el sistema solo escribe hojas de cálculo, nunca las lee.

**En el backend `npm audit fix` rompió el proyecto.** Cambió `@nestjs/schedule`
y dejó dos copias de `cron` (4.3.5 en la raíz y 4.4.0 anidada), que no son el
mismo tipo para TypeScript, y dejó `@prisma/client` inconsistente con su CLI:
`prisma generate` dejó de funcionar y fallaban dos suites. Se revirtió el
`package-lock.json` y se reinstaló limpio.

Lo que sí se aplicó, acotado a lo que corre en el servidor:

- `npm update` de los `@nestjs/*` dentro de su rango (11.1.11 → 11.2.5), sin
  tocar `schedule` ni `prisma`.
- `overrides` en `package.json` para cuatro paquetes transitivos, todos dentro
  de su misma versión mayor: `ws` 8.21.3, `engine.io` 6.6.10,
  `socket.io-parser` 4.2.7 y `fast-xml-parser` 5.11.1 (este último vive dentro
  del SDK de S3).

Backend: de 2 críticas y 23 altas a **1 crítica y 21 altas**. La crítica que
queda (`shell-quote`) entra por `cpx`, una herramienta de desarrollo que no se
despliega. `minimatch` y `brace-expansion` se dejaron fuera a propósito: hay dos
versiones mayores distintas en el árbol y un `override` plano rompería a quien
espera la otra.

**Lo que no se puede cerrar hoy**: el resto de las altas del backend exige
subir a NestJS 12 o cambiar de versión mayor de Prisma. Es un proyecto aparte,
para después del fork.

### Verificación

- Backend: `prisma generate` OK, `tsc` limpio, **189 suites y 2.892 tests** en
  verde.
- Backend en ejecución, contra una instancia propia: login, listado y detalle de
  órdenes (ruteo), **subida de archivo con multer**, **URL firmada de S3** y
  **websocket** (conecta con token válido y rechaza el inválido).
- Frontend: `tsc` limpio, 59 archivos y 497 tests, y `npm run build` completo.
- Interfaz: el listado de órdenes carga con datos (axios nuevo), se abre el
  detalle y el botón de PDF no produce errores; `jspdf` 4.2.1 genera un PDF
  válido.

---

## 8. Los archivos privados se sirven como caché pública — **Baja**

`GET /storage/:id/view` responde con `Cache-Control: public, max-age=3600`
([storage.controller.ts:265](../backend/src/modules/storage/storage.controller.ts#L265)).
Son comprobantes de pago y documentos de clientes que exigen sesión. Hoy no hay
una capa de caché compartida delante de Railway, pero si algún día la hay, esos
archivos quedarían guardados para cualquiera. Cambiarlo a `private` no cuesta
nada.

---

## Pendientes de la cuarta barrida

Siguen abiertos, sin cambios:

- **7.** Alias SQL repetido en stock bajo (`uom.abbreviation as unit_name`).
- **11.** Números de recibo que se pierden si falla la transacción.
- **12.** Mejoras menores.
- **9.** Omitir pasos de producción: apartado mientras el módulo esté pausado.

---

## Revisado sin hallazgos

- **Prospectos**: todas las operaciones (ver, editar, borrar, contactos,
  convertir) pasan por la comprobación de que el prospecto sea de la asesora,
  salvo quien tenga `read_all_prospects`.
- **Restauración de cotizaciones**: índice parcial contra el doble clic,
  alcance por asesor al solicitar, registro en el flujo de WhatsApp y backfill
  del estado previo desde auditoría. Su llave foránea sin `ON DELETE` cuenta
  dentro del hallazgo 4.
- **Comentarios**: solo el autor puede borrar un comentario.
- **Almacenamiento**: valida tipo y tamaño (10 MB). El tipo lo declara el
  cliente, pero el archivo se sirve con ese mismo tipo y no se aceptan SVG ni
  HTML, así que no abre una vía de XSS. El `Access-Control-Allow-Origin: *` es
  aceptable porque la autenticación va por encabezado y no por cookies.
- **Crons**: todos los que dependen de la hora de negocio fijan la zona
  horaria. Los dos que no la fijan (limpieza de heartbeats y expiración de
  permisos de edición) no dependen de la hora del día.

---

## Procedimiento de arranque de Zoom

Lo que la base desechable mostró que hace falta, en orden:

1. `prisma migrate deploy` — ya está en el `startCommand` de Railway.
2. `NODE_ENV=production SEED_ADMIN_PASSWORD='…' npm run prisma:seed`. Sin datos
   de demostración y sin cuentas de prueba; si falta la contraseña, se detiene
   sin escribir nada.
3. Entrar con `adminsistema` y cambiar la contraseña.
4. Llenar la pantalla de Empresa con los datos de Zoom (y, hasta que se corrija
   el hallazgo 5, cambiar `pdfConstants.ts` y los textos de marca).
5. Conservar el nombre `admin` para el rol de administrador (hallazgo 6).
6. Correr `scripts/db-invariants.sh` contra la base nueva: debe salir todo OK.
7. Para permisos nuevos sobre una base en uso, `npm run prisma:sync:permissions`.
   Volver a correr el seed ya no borra la configuración de roles, pero tampoco
   hace falta.

---

## Orden sugerido antes del viernes

1. ~~**Hallazgo 1** — el escalamiento de privilegios.~~ ✅ Hecho.
2. ~~**Hallazgos 2 y 3** — el seed.~~ ✅ Hecho.
3. ~~**Hallazgo 4** — alinear `schema.prisma`.~~ ✅ Hecho.
4. ~~**Hallazgo 7** — `npm audit fix`.~~ ✅ Hecho (lo que se puede sin cambio
   de versión mayor).
5. **Hallazgo 5** — centralizar la marca en el módulo Company. Si no alcanza el
   tiempo, se hace en la fase 1 del fork con el inventario de arriba.
6. **Hallazgo 8** y los pendientes de la cuarta barrida — cuando haya espacio.
