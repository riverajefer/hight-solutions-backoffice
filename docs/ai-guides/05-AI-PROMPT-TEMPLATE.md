# AI Prompt Template: Generar Nuevo Módulo

Usa este prompt como base para pedirle a la IA que genere un nuevo módulo siguiendo la arquitectura del proyecto.

---

## Prompt Base

```
Necesito crear un nuevo módulo para el proyecto Hight Solutions Backoffice (NestJS + Prisma + PostgreSQL).

**Nombre del módulo**: [NOMBRE_DEL_MODULO]

**Descripción**: [DESCRIPCIÓN_BREVE]

**Campos del modelo**:
- campo1: tipo (descripción)
- campo2: tipo (descripción)
- ...

**Relaciones**:
- [Relación con otro modelo si aplica]

**Permisos necesarios**:
- create_[modulo]
- read_[modulo]
- update_[modulo]
- delete_[modulo]

**Requisitos adicionales**:
- [Cualquier requisito especial]

---

Por favor genera:

1. **Schema de Prisma** para el modelo
2. **DTOs** (create, update y filter si aplica)
3. **Service** con métodos CRUD completos
4. **Controller** con Guards y decoradores de permisos
5. **Module** configurado
6. **Código para agregar permisos al seed**
7. **Documentación de endpoints**

Sigue estas guías del proyecto:
- Lee el archivo 00-ARCHITECTURE-OVERVIEW.md para entender la arquitectura
- Usa el template 01-CRUD-MODULE-TEMPLATE.md como base
- Aplica validaciones siguiendo 04-DTOS-VALIDATION-GUIDE.md
- Si hay relaciones, consulta 02-PRISMA-RELATIONS-GUIDE.md
- Para Guards y permisos, revisa 03-GUARDS-DECORATORS-GUIDE.md
```

---

## Ejemplo Específico: Módulo de Clientes

```
Necesito crear un nuevo módulo para el proyecto Hight Solutions Backoffice (NestJS + Prisma + PostgreSQL).

**Nombre del módulo**: Customers (Clientes)

**Descripción**: Gestión de clientes de la empresa

**Campos del modelo**:
- name: string (nombre completo del cliente)
- email: string (único)
- phone: string (opcional)
- address: string (opcional)
- city: string (opcional)
- country: string (opcional, default 'CO')
- taxId: string (NIT o cédula, único)
- isActive: boolean (default true)
- notes: string (opcional, notas adicionales)

**Relaciones**:
- Un cliente puede tener múltiples órdenes (orders)
- Un cliente puede tener múltiples cotizaciones (quotes)

**Permisos necesarios**:
- create_customers
- read_customers
- update_customers
- delete_customers

**Requisitos adicionales**:
- Validar que el email sea único
- Validar que el taxId sea único
- El campo email debe convertirse a minúsculas automáticamente
- Implementar soft delete (campo deletedAt)
- Incluir paginación y filtros de búsqueda
- Filtros: por nombre, email, ciudad, país, activo/inactivo

---

Por favor genera:

1. **Schema de Prisma** para el modelo Customer
2. **DTOs** (create-customer.dto, update-customer.dto, filter-customer.dto)
3. **Service** con métodos CRUD completos incluyendo soft delete
4. **Controller** con Guards y decoradores de permisos
5. **Module** configurado
6. **Código para agregar permisos al seed**
7. **Documentación de endpoints**

Sigue estas guías del proyecto:
- Lee el archivo 00-ARCHITECTURE-OVERVIEW.md para entender la arquitectura
- Usa el template 01-CRUD-MODULE-TEMPLATE.md como base
- Aplica validaciones siguiendo 04-DTOS-VALIDATION-GUIDE.md
- Si hay relaciones, consulta 02-PRISMA-RELATIONS-GUIDE.md
- Para Guards y permisos, revisa 03-GUARDS-DECORATORS-GUIDE.md
```

---

## Ejemplo con Relaciones Complejas: Módulo de Órdenes

```
Necesito crear un nuevo módulo para el proyecto Hight Solutions Backoffice (NestJS + Prisma + PostgreSQL).

**Nombre del módulo**: Orders (Órdenes de Pedido)

**Descripción**: Gestión de órdenes de pedido de clientes

**Campos del modelo principal (Order)**:
- orderNumber: string (generado automáticamente, único)
- customerId: string (relación con Customer)
- status: enum (PENDING, PROCESSING, COMPLETED, CANCELLED)
- subtotal: decimal
- tax: decimal
- total: decimal
- notes: string (opcional)
- deliveryDate: DateTime (opcional)
- deliveryAddress: string (opcional)

**Modelo relacionado (OrderItem)**:
- orderId: string
- productId: string (relación con Product)
- quantity: number
- unitPrice: decimal
- subtotal: decimal

**Relaciones**:
- Order pertenece a Customer (many-to-one)
- Order tiene múltiples OrderItems (one-to-many)
- OrderItem pertenece a Order (many-to-one)
- OrderItem pertenece a Product (many-to-one)

**Permisos necesarios**:
- create_orders
- read_orders
- update_orders
- delete_orders
- approve_orders (permiso especial para aprobar)
- cancel_orders (permiso especial para cancelar)

**Requisitos adicionales**:
- Generar orderNumber automáticamente (formato: ORD-YYYYMMDD-XXXX)
- Calcular subtotal, tax y total automáticamente
- Validar que el cliente existe antes de crear la orden
- Validar que los productos existen y tienen stock
- Actualizar stock de productos al crear la orden
- Solo permitir cancelar órdenes en estado PENDING o PROCESSING
- Implementar transacciones para crear orden + items atómicamente
- Filtros: por cliente, estado, rango de fechas, número de orden

---

Por favor genera:

1. **Schema de Prisma** para Order y OrderItem
2. **DTOs** completos con validación de nested objects
3. **Service** con lógica de negocio y transacciones
4. **Controller** con Guards y permisos especiales
5. **Module** configurado
6. **Código para agregar permisos al seed** (incluyendo approve_orders y cancel_orders)
7. **Documentación de endpoints** con ejemplos de requests

Sigue estas guías del proyecto:
- Lee el archivo 00-ARCHITECTURE-OVERVIEW.md para entender la arquitectura
- Usa el template 01-CRUD-MODULE-TEMPLATE.md como base
- Aplica validaciones siguiendo 04-DTOS-VALIDATION-GUIDE.md
- Para relaciones one-to-many, consulta 02-PRISMA-RELATIONS-GUIDE.md
- Para Guards y permisos, revisa 03-GUARDS-DECORATORS-GUIDE.md
- Implementa transacciones para operaciones atómicas
```

---

## Variables del Template

Cuando uses el prompt, reemplaza estas variables:

- `[NOMBRE_DEL_MODULO]`: Nombre del módulo en plural y en inglés (ej: products, customers, orders)
- `[DESCRIPCIÓN_BREVE]`: Descripción corta del propósito del módulo
- `[campo1, campo2, ...]`: Lista de campos con su tipo y descripción
- `[Relaciones]`: Descripción de relaciones con otros modelos
- `[Requisitos especiales]`: Cualquier lógica de negocio específica

## Checklist Post-Generación

Después de que la IA genere el módulo, verificar:

- [ ] Schema de Prisma sigue convenciones (@@map, timestamps)
- [ ] DTOs tienen validaciones apropiadas
- [ ] Service incluye validaciones de relaciones
- [ ] Controller usa JwtAuthGuard y PermissionsGuard
- [ ] Permisos están definidos en el código del seed
- [ ] Module está exportando el service si es necesario
- [ ] Documentación de endpoints está completa
- [ ] Relaciones están correctamente definidas en ambos lados
- [ ] Transacciones se usan donde son necesarias
- [ ] Manejo de errores es apropiado

## Tips para Mejores Resultados

1. **Sé específico**: Proporciona todos los detalles de campos y validaciones
2. **Menciona las guías**: Siempre referencia los archivos .md del proyecto
3. **Relaciones claras**: Describe explícitamente todas las relaciones
4. **Lógica de negocio**: Menciona cualquier regla especial del dominio
5. **Ejemplos**: Proporciona ejemplos de datos si ayuda a clarificar
6. **Revisar**: Siempre revisa el código generado antes de integrarlo


### Opción 2: Usar directamente con IA
Cuando necesites crear un nuevo módulo, dale este prompt a Claude:
```
Lee los archivos en la carpeta docs/ai-guides/ y genera un nuevo módulo de [NOMBRE] 
siguiendo la arquitectura del proyecto.

Campos del modelo:
- campo1: tipo
- campo2: tipo

[resto de especificaciones]