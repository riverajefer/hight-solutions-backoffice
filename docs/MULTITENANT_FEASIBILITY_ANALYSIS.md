# Análisis de Factibilidad: Arquitectura Multitenant (Multitienda)

**Fecha:** 2026-05-12  
**Proyecto:** Hight Solutions Backoffice  
**Autor:** Análisis técnico automatizado  
**Estado:** Propuesta — No implementar aún

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Actual del Sistema](#2-estado-actual-del-sistema)
3. [Estrategia de Multitenancy Recomendada](#3-estrategia-de-multitenancy-recomendada)
4. [Diseño Propuesto](#4-diseño-propuesto)
5. [Impacto por Capa](#5-impacto-por-capa)
6. [Clasificación de Modelos](#6-clasificación-de-modelos)
7. [Cambios Requeridos por Módulo](#7-cambios-requeridos-por-módulo)
8. [Autenticación y Autorización](#8-autenticación-y-autorización)
9. [Configuración por Tenant](#9-configuración-por-tenant)
10. [Riesgos y Desafíos](#10-riesgos-y-desafíos)
11. [Plan de Implementación Gradual](#11-plan-de-implementación-gradual)
12. [Estimación de Esfuerzo](#12-estimación-de-esfuerzo)
13. [Conclusión de Viabilidad](#13-conclusión-de-viabilidad)

---

## 1. Resumen Ejecutivo

### Veredicto: ✅ VIABLE — con esfuerzo significativo pero manejable

El sistema actual es **100% single-tenant**. No existe ningún concepto de tenant, compañía o aislamiento de datos en ninguna capa (base de datos, backend, frontend). Sin embargo, la arquitectura existente (layered con repository pattern, guards centralizados, Prisma ORM) proporciona puntos de inyección naturales que facilitan la migración.

**Datos clave del sistema actual:**
- **78 modelos** Prisma en PostgreSQL
- **46 módulos** backend NestJS
- **~50 rutas** frontend con control de permisos
- **0 referencias** a tenantId, companyId u organización en todo el código

**Estimación:** 12-18 semanas de trabajo (1-2 desarrolladores), implementable en fases.

---

## 2. Estado Actual del Sistema

### 2.1 Base de Datos

```
PostgreSQL (Supabase dev / Railway staging+prod)
├── 78 modelos Prisma
├── 0 campos de tenantId
├── Modelo "Company" existe pero es singleton (1 registro, config global)
├── Modelo "Consecutive" maneja numeración global (no por tenant)
├── Datos geográficos: Department (32) + City (1,123) — datos de referencia Colombia
└── Prisma con adapter pg (Pool), audit log extension
```

### 2.2 Backend

```
NestJS 11.x + TypeScript 5.9
├── Arquitectura: Controller → Service → Repository → PrismaService
├── Auth: JWT (access + refresh tokens)
│   └── JwtPayload: { sub, username, roleId, type } — SIN tenantId
├── Guards globales: JwtAuthGuard + PermissionsGuard
├── Interceptors: AuditContextInterceptor, HeartbeatInterceptor
├── Middleware: MaintenanceMiddleware
├── PrismaService: extiende PrismaClient con auditLogExtension
└── 46 módulos registrados en AppModule
```

### 2.3 Frontend

```
React 18 + Vite 5 + MUI 5
├── Auth: Zustand store + localStorage
├── HTTP: Axios con Bearer token + auto-refresh
├── Routing: React Router 6 + PermissionGuard por ruta
├── ~50 items de menú en 6 secciones
└── 0 contexto de tenant en UI
```

### 2.4 Modelo Company Actual

El modelo `Company` actual es un **singleton** que almacena datos de UNA sola empresa:

```prisma
model Company {
  id                  String   @id @default(uuid())
  name                String
  logoLightId         String?
  logoDarkId          String?
  description         String?
  phone               String?
  mobilePhone         String?
  email               String?
  website             String?
  address             String?
  nit                 String?
  legalRepresentative String?
  foundedYear         Int?
  taxRegime           String?
  bankName            String?
  bankAccountNumber   String?
  bankAccountType     String?
}
```

Este modelo se convertirá en la base del modelo `Tenant`.

---

## 3. Estrategia de Multitenancy Recomendada

### 3.1 Comparativa de Estrategias

| Estrategia | Aislamiento | Complejidad | Costo Infra | Escalabilidad | Prisma Compatible |
|------------|-------------|-------------|-------------|---------------|-------------------|
| **DB por tenant** | 🟢 Máximo | 🔴 Alta (N databases) | 🔴 Alto | 🟡 Limitada | 🔴 Requiere conexión dinámica |
| **Schema por tenant** | 🟢 Alto | 🔴 Alta (migraciones N veces) | 🟡 Medio | 🟡 Limitada | 🔴 No soportado nativamente |
| **Shared DB + tenantId** | 🟡 Lógico | 🟢 Baja | 🟢 Bajo | 🟢 Alta | 🟢 Total |

### 3.2 Recomendación: **Shared Database con `tenantId` (Row-Level)**

**Razones:**

1. **Prisma ORM**: No soporta nativamente múltiples schemas ni conexión dinámica por tenant. El approach de `tenantId` funciona de forma nativa.
2. **Railway**: Hosting actual usa un solo PostgreSQL. Múltiples databases incrementarían costos significativamente.
3. **78 modelos**: Migrar schema o DB por tenant requeriría ejecutar migraciones N veces — operacionalmente complejo.
4. **Prisma Client Extensions**: Permiten inyectar automáticamente `tenantId` en TODAS las queries, reduciendo el riesgo de data leaks.
5. **Escala esperada**: Para decenas de tenants (no miles), shared DB es la opción más costo-efectiva.

### 3.3 Refuerzo de Seguridad: PostgreSQL RLS (Row-Level Security)

Como capa adicional de defensa, se recomienda implementar **RLS policies** en PostgreSQL para que, incluso si la aplicación tiene un bug que omita el filtro de `tenantId`, la base de datos misma impida el acceso cruzado.

```sql
-- Ejemplo de política RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 4. Diseño Propuesto

### 4.1 Nuevo Modelo: Tenant

```prisma
model Tenant {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique  // identificador URL-friendly
  nit         String?
  isActive    Boolean  @default(true)
  
  // Datos de compañía (migrados del modelo Company actual)
  logoLightId         String?
  logoDarkId          String?
  description         String?
  phone               String?
  mobilePhone         String?
  email               String?
  website             String?
  address             String?
  legalRepresentative String?
  foundedYear         Int?
  taxRegime           String?
  bankName            String?
  bankAccountNumber   String?
  bankAccountType     String?

  // Configuración específica
  config      TenantConfig?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relaciones con todas las entidades del tenant
  users       User[]
  roles       Role[]
  clients     Client[]
  suppliers   Supplier[]
  orders      Order[]
  // ... todas las demás entidades

  @@map("tenants")
}

model TenantConfig {
  id              String  @id @default(uuid())
  tenantId        String  @unique
  currency        String  @default("COP")
  timezone        String  @default("America/Bogota")
  dateFormat      String  @default("DD/MM/YYYY")
  taxRate         Float?  @default(19.0)
  whatsappConfig  Json?   // Configuración WhatsApp por tenant
  pdfTemplates    Json?   // Templates PDF personalizados
  brandColors     Json?   // Colores de marca
  consecutiveConfig Json? // Prefijos y formatos de numeración
  
  tenant          Tenant  @relation(fields: [tenantId], references: [id])
  
  @@map("tenant_configs")
}
```

### 4.2 Nuevo Rol: SuperAdmin

```prisma
// El SuperAdmin NO pertenece a ningún tenant
model User {
  // ... campos existentes
  tenantId    String?  // NULL para SuperAdmin
  isSuperAdmin Boolean @default(false)
  
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
}
```

### 4.3 Arquitectura de Filtrado Automático

```
Request HTTP
  │
  ├─ JwtAuthGuard → extrae JWT con { sub, tenantId, isSuperAdmin }
  │
  ├─ TenantGuard (NUEVO) → valida que tenant existe y está activo
  │    └─ SuperAdmin bypasea este guard
  │
  ├─ PermissionsGuard → valida permisos del usuario
  │
  ├─ TenantInterceptor (NUEVO) → inyecta tenantId en contexto de request
  │
  └─ PrismaService → Prisma Extension filtra automáticamente por tenantId
       └─ Todas las queries incluyen WHERE tenant_id = ?
```

### 4.4 Prisma Client Extension para Tenant Isolation

```typescript
// Concepto del filtrado automático en PrismaService
const tenantExtension = Prisma.defineExtension({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        const tenantId = getTenantContext();
        if (tenantId && !isSharedModel(model)) {
          args.where = { ...args.where, tenantId };
        }
        return query(args);
      },
      async create({ args, query }) {
        const tenantId = getTenantContext();
        if (tenantId && !isSharedModel(model)) {
          args.data = { ...args.data, tenantId };
        }
        return query(args);
      },
      // ... findUnique, update, delete, etc.
    }
  }
});
```

---

## 5. Impacto por Capa

### 5.1 Base de Datos (ALTO)

| Cambio | Detalle | Impacto |
|--------|---------|---------|
| Nuevo modelo `Tenant` | Reemplaza `Company` como entidad central | Migración de datos |
| Nuevo modelo `TenantConfig` | Configuración por tenant | Modelo nuevo |
| Campo `tenantId` en ~70 modelos | FK a Tenant en casi todas las tablas | Migración masiva |
| Constraints `@@unique` compuestos | `@unique` → `@@unique([field, tenantId])` | ~15+ constraints |
| `Consecutive` por tenant | `@@unique([type, tenantId])` en vez de `@unique type` | Cambio de lógica de numeración |
| Índices compuestos | Índices en `(tenantId, campo)` para performance | Performance |
| RLS Policies (opcional) | Capa adicional de seguridad en PostgreSQL | Seguridad |

**Constraints que cambian de `@unique` a `@@unique([campo, tenantId])`:**
- `User.username`, `User.email`
- `Role.name`
- `Permission.name`
- `Client.email`
- `Supplier.email`
- `Order.orderNumber`
- `Consecutive.type`
- `ProductCategory.name`
- `SupplyCategory.name`
- `ExpenseType.name`
- `ProductionArea.name`
- `CommercialChannel.name`
- `CashRegister.name`

### 5.2 Backend (ALTO)

| Componente | Cambio Requerido |
|------------|-----------------|
| `JwtPayload` interface | Agregar `tenantId?: string`, `isSuperAdmin?: boolean` |
| `AuthenticatedUser` interface | Agregar `tenantId?: string`, `isSuperAdmin: boolean` |
| `auth.service.ts` | Incluir `tenantId` en JWT, validar tenant activo al login |
| `PrismaService` | Agregar Prisma Extension para filtrado automático por tenant |
| **NUEVO** `TenantGuard` | Validar tenant activo, bypasear para SuperAdmin |
| **NUEVO** `TenantInterceptor` | Inyectar tenantId en AsyncLocalStorage context |
| **NUEVO** `tenant.module.ts` | CRUD de tenants (solo SuperAdmin) |
| Todos los repositories (~37) | NO requieren cambios si se usa Prisma Extension (filtrado automático) |
| Todos los services (~37) | Cambios mínimos — solo donde haya lógica especial |
| `consecutives.repository.ts` | Raw SQL debe incluir `tenant_id` manualmente |
| `whatsapp.module.ts` | Config por tenant en vez de env vars globales |
| `storage.module.ts` | Organizar archivos por tenant (folders separados) |
| Seed script | Crear tenant default + migrar datos existentes |

### 5.3 Frontend (MEDIO)

| Componente | Cambio Requerido |
|------------|-----------------|
| `authStore.ts` | Almacenar `tenantId`, `isSuperAdmin`, `tenantConfig` |
| `axios.ts` | Agregar header `X-Tenant-Id` (o incluirlo en JWT) |
| **NUEVO** Login flow | Selección/identificación de tenant al login |
| **NUEVO** Páginas SuperAdmin | Dashboard de tenants, CRUD de compañías |
| **NUEVO** `TenantContext` | React Context con config del tenant |
| `Sidebar.tsx` | Menú condicional: SuperAdmin vs usuario normal |
| `MainLayout.tsx` | Mostrar nombre/logo del tenant |
| Branding/Theme | Colores dinámicos según `tenantConfig.brandColors` |
| Todas las páginas existentes | **Sin cambios** si el filtrado es automático por backend |

---

## 6. Clasificación de Modelos

### 6.1 Modelos que REQUIEREN `tenantId` (70 modelos)

**Core / RBAC:**
- `User` (tenantId nullable — NULL = SuperAdmin)
- `Role`
- `Permission`
- `RolePermission`
- `Cargo`

**Clientes y Proveedores:**
- `Client`
- `Supplier`

**Comercial:**
- `Order`, `OrderItem`, `OrderItemProductionArea`
- `OrderDiscount`, `OrderEditRequest`, `OrderStatusChangeRequest`
- `EditableOrderStatus`
- `Quote`, `QuoteItem`, `QuoteItemProductionArea`
- `QuoteKanbanColumn`
- `Payment`

**Producción:**
- `ProductionArea`
- `ProductionOrder`, `ProductionOrderComponent`, `ProductionOrderStep`
- `ProductTemplate`, `TemplateComponent`, `TemplateComponentStep`
- `StepDefinition`
- `WorkOrder`, `WorkOrderItem`, `WorkOrderItemProductionArea`, `WorkOrderItemSupply`
- `WorkOrderTimeEntry`

**Inventario y Productos:**
- `Product`, `ProductCategory`
- `Supply`, `SupplyCategory`
- `UnitOfMeasure`
- `InventoryMovement`

**Finanzas:**
- `ExpenseOrder`, `ExpenseOrderItem`, `ExpenseOrderItemProductionArea`
- `ExpenseType`, `ExpenseSubcategory`
- `ExpenseOrderAuthRequest`
- `AccountPayable`, `AccountPayablePayment`, `AccountPayableAttachment`
- `AccountPayableInstallment`, `AccountPayableAuthRequest`
- `AccountPayablePaymentAuthRequest`
- `AdvancePaymentApproval`
- `DiscountApproval`
- `RefundRequest`

**Caja:**
- `CashRegister`, `CashSession`, `CashDenominationCount`
- `CashMovement`, `CashMovementVoidRequest`

**Operaciones:**
- `Employee`, `PayrollPeriod`, `PayrollItem`
- `AttendanceRecord`, `ActivityHeartbeat`
- `Consecutive`
- `CommercialChannel`

**Comunicación:**
- `Notification`
- `WhatsappActionContext`
- `Comment`
- `UploadedFile`

**Auditoría:**
- `AuditLog`
- `SessionLog`

**DTF:**
- `DtfRecord`, `DtfStatusHistory`

**Metas:**
- `SalesGoal`

**Clientes - Auth:**
- `ClientOwnershipAuthRequest`

### 6.2 Modelos COMPARTIDOS (sin tenantId) — 2 modelos

| Modelo | Razón |
|--------|-------|
| `Department` | Datos geográficos de Colombia — referencia nacional |
| `City` | Datos geográficos de Colombia — referencia nacional |

### 6.3 Modelo que se TRANSFORMA — 1 modelo

| Modelo Actual | Modelo Nuevo | Cambio |
|---------------|-------------|--------|
| `Company` | `Tenant` | Se convierte en la entidad central de multitenancy |

---

## 7. Cambios Requeridos por Módulo Backend

### 7.1 Módulos con Cambios Altos

| Módulo | Razón del Alto Impacto |
|--------|----------------------|
| `auth` | JWT payload, login flow, validación de tenant, SuperAdmin |
| `company` → `tenants` | Se transforma completamente en gestión de tenants |
| `consecutives` | Raw SQL + lógica de numeración debe ser por tenant |
| `whatsapp` | Config global → config por tenant |
| `storage` | Organización de archivos por tenant |
| `dashboard` | Métricas por tenant, dashboard SuperAdmin separado |

### 7.2 Módulos con Cambios Medios

| Módulo | Razón |
|--------|-------|
| `users` | Creación de usuarios asociados a tenant |
| `roles` | Roles por tenant (cada tenant tiene sus propios roles) |
| `permissions` | Permisos por tenant o permisos globales compartidos |
| `notifications` | Notificaciones scoped a tenant |
| `payroll` | Nómina completamente aislada por tenant |

### 7.3 Módulos con Cambios Bajos (solo `tenantId`)

Todos los demás módulos (~35) requieren únicamente:
1. Agregar `tenantId` al modelo Prisma
2. El filtrado automático vía Prisma Extension se encarga del resto
3. Actualizar constraints `@@unique` donde aplique

---

## 8. Autenticación y Autorización

### 8.1 Flujo de Login Propuesto

```
                        ┌─────────────────────────┐
                        │    Pantalla de Login     │
                        │                          │
                        │  ┌─────────────────────┐ │
  Opción A:             │  │ Tenant: [slug/NIT]  │ │
  Campo explícito       │  │ Email:  [________]  │ │
                        │  │ Pass:   [________]  │ │
                        │  └─────────────────────┘ │
                        └────────────┬────────────┘
                                     │
  Opción B:                          │
  Subdominio automático              │
  (tenant1.app.hight.com)            │
                                     ▼
                        ┌─────────────────────────┐
                        │   Backend Auth Flow      │
                        │                          │
                        │  1. Identificar tenant   │
                        │     (por slug, NIT, o    │
                        │      subdominio)         │
                        │  2. Validar tenant activo │
                        │  3. Buscar usuario en    │
                        │     ese tenant           │
                        │  4. Validar credenciales │
                        │  5. Generar JWT con      │
                        │     tenantId             │
                        └────────────┬────────────┘
                                     │
                                     ▼
                        ┌─────────────────────────┐
                        │   JWT Payload Nuevo      │
                        │                          │
                        │  {                       │
                        │    sub: "userId",        │
                        │    username: "user",     │
                        │    roleId: "roleId",     │
                        │    tenantId: "tenantId", │
                        │    isSuperAdmin: false,  │
                        │    type: "access"        │
                        │  }                       │
                        └─────────────────────────┘
```

### 8.2 Estrategia de Identificación de Tenant Recomendada

**Recomendación: Enfoque Híbrido**

| Método | Cuándo Usarlo | Ejemplo |
|--------|--------------|---------|
| **Slug en login** | MVP / Fase inicial | Campo "Empresa" en login form |
| **Subdominio** | Fase avanzada | `tenant1.app.hight-solutions.com` |
| **Selección post-login** | Usuarios multi-tenant | Selector de empresa después del login |

Para la **Fase 1**, se recomienda el **slug en el login** por simplicidad. El email por sí solo no es suficiente porque un mismo email podría existir en múltiples tenants.

### 8.3 Cambios en Interfaces de Auth

```typescript
// auth.interface.ts — CAMBIOS
export interface JwtPayload {
  sub: string;
  username: string;
  roleId: string;
  tenantId?: string;     // NUEVO — null para SuperAdmin
  isSuperAdmin?: boolean; // NUEVO
  type: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email?: string | null;
  roleId: string;
  tenantId?: string | null;  // NUEVO
  isSuperAdmin: boolean;     // NUEVO
  // ... demás campos existentes
}
```

### 8.4 SuperAdmin vs Usuario Normal

| Aspecto | SuperAdmin | Usuario Normal |
|---------|-----------|---------------|
| `tenantId` | `null` | UUID del tenant |
| JWT `isSuperAdmin` | `true` | `false` |
| Acceso a datos | Todos los tenants | Solo su tenant |
| Menú frontend | Panel de administración de plataforma | Menú actual |
| Permisos | Gestión de tenants, ver métricas globales | Permisos RBAC del tenant |
| Login | Sin tenant (acceso directo) | Con identificación de tenant |

---

## 9. Configuración por Tenant

### 9.1 Configuraciones que Deben ser por Tenant

| Categoría | Configuraciones | Almacenamiento |
|-----------|----------------|---------------|
| **Identidad** | Nombre, NIT, logo light/dark, dirección | Modelo `Tenant` |
| **Branding** | Colores primario/secundario, fuentes | `TenantConfig.brandColors` (JSON) |
| **Monetaria** | Moneda (COP/USD), formato, IVA % | `TenantConfig.currency`, `taxRate` |
| **Numeración** | Prefijos de consecutivos, formato | `Consecutive` con tenantId |
| **PDF** | Templates de cotización, orden, factura | `TenantConfig.pdfTemplates` (JSON) |
| **WhatsApp** | API key, número, templates | `TenantConfig.whatsappConfig` (JSON) |
| **Impuestos** | Régimen tributario, retenciones | `TenantConfig.taxRate` + JSON |
| **Horarios** | Zona horaria, horario laboral | `TenantConfig.timezone` |
| **Archivos** | Carpeta de storage | Prefijo: `tenants/{tenantId}/` |

### 9.2 Configuraciones que Permanecen Globales

| Configuración | Razón |
|--------------|-------|
| Datos geográficos (Departamentos/Ciudades) | Referencia nacional compartida |
| Definiciones de permisos del sistema | Catálogo base de permisos |
| Rate limiting | Política de plataforma |
| Configuración de infraestructura | Railway / deployment |

---

## 10. Riesgos y Desafíos

### 10.1 Riesgos Críticos 🔴

| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| **Data leak entre tenants** | Un bug en el filtrado expone datos de otro tenant | Prisma Extension automático + RLS en PostgreSQL como doble barrera |
| **Migración de datos existentes** | Datos actuales deben asignarse a un tenant inicial | Script de migración que crea tenant "default" y asigna todos los registros existentes |
| **Downtime en migración** | Agregar `tenantId` a 70+ tablas con datos existentes | Migración en fases con `DEFAULT` values y backfill |
| **Consecutivos duplicados** | Numeración global → por tenant puede colisionar | Migrar consecutivos existentes al tenant default, nuevos tenants empiezan desde 0 |

### 10.2 Riesgos Medios 🟡

| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| **Performance** | Queries con `WHERE tenant_id = ?` en tablas grandes | Índices compuestos `(tenant_id, campo_frecuente)` |
| **Raw SQL** | Queries manuales (consecutivos) no pasan por Prisma Extension | Auditar y actualizar manualmente todas las raw queries |
| **Unique constraints** | `email @unique` debe ser `@@unique([email, tenantId])` | Migración cuidadosa de constraints |
| **WhatsApp integration** | Config actual por env vars, debe ser por tenant | Refactorizar a config en DB con cache |
| **Storage/archivos** | Archivos actuales no tienen separación por tenant | Migrar archivos existentes a folder del tenant default |
| **Tests unitarios** | 100+ tests existentes asumen single-tenant | Actualizar mocks para incluir tenantId |

### 10.3 Riesgos Bajos 🟢

| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| **Frontend** | Cambios mínimos si el backend filtra automáticamente | Solo agregar contexto de tenant al login y layout |
| **API contracts** | Endpoints no cambian, solo se agrega filtrado invisible | Backward compatible |
| **Roles/Permisos** | Catálogo de permisos puede ser global con asignación por tenant | Seed crea permisos base para cada nuevo tenant |

---

## 11. Plan de Implementación Gradual

### Fase 0: Fundación (Semana 1-2)

**Objetivo:** Crear la infraestructura base sin romper nada existente.

```
Tareas:
├── Crear modelo Tenant en Prisma (evolución de Company)
├── Crear modelo TenantConfig
├── Crear migración: ALTER TABLE para agregar tenantId a User y Role
├── Crear TenantModule (CRUD solo SuperAdmin)
├── Crear TenantGuard y TenantInterceptor
├── Modificar JwtPayload y AuthenticatedUser interfaces
├── Implementar Prisma Extension para filtrado automático
├── Script de migración: crear tenant "default" con datos existentes
└── Tests del nuevo sistema de filtrado
```

**Entregable:** Sistema funciona igual que antes, pero con tenant "default" asignado internamente.

### Fase 1: Auth + Core RBAC (Semana 3-4)

**Objetivo:** Login con tenant, SuperAdmin funcional.

```
Tareas:
├── Modificar login flow para aceptar tenant identifier
├── Agregar tenantId a JWT tokens
├── Crear páginas SuperAdmin (lista tenants, crear/editar/activar)
├── Roles y permisos por tenant
├── Migrar tenantId a: Permission, RolePermission, Cargo
├── Frontend: campo tenant en login, menú SuperAdmin
├── Seed: crear SuperAdmin user + tenant default
└── Tests e2e del flujo de login multitenant
```

**Entregable:** SuperAdmin puede crear tenants. Usuarios se autentican contra su tenant.

### Fase 2: Entidades de Negocio Core (Semana 5-7)

**Objetivo:** Aislar los módulos principales por tenant.

```
Tareas:
├── Migrar tenantId a:
│   ├── Client, Supplier
│   ├── Order, OrderItem, OrderItemProductionArea, Payment
│   ├── Quote, QuoteItem, QuoteItemProductionArea
│   ├── OrderDiscount, EditableOrderStatus
│   ├── Product, ProductCategory
│   ├── Consecutive (+ lógica de numeración por tenant)
│   └── CommercialChannel
├── Actualizar unique constraints compuestos
├── Actualizar raw SQL en ConsecutivesRepository
└── Tests de aislamiento de datos
```

**Entregable:** Clientes, órdenes y cotizaciones aislados por tenant.

### Fase 3: Módulos Financieros (Semana 8-9)

**Objetivo:** Aislar finanzas y caja.

```
Tareas:
├── Migrar tenantId a:
│   ├── ExpenseOrder, ExpenseOrderItem, ExpenseType, ExpenseSubcategory
│   ├── AccountPayable, AccountPayablePayment, AccountPayableInstallment
│   ├── CashRegister, CashSession, CashMovement
│   ├── AdvancePaymentApproval, DiscountApproval
│   └── RefundRequest
├── Todos los auth requests (ExpenseOrderAuthRequest, etc.)
└── Dashboard financiero por tenant
```

**Entregable:** Todo el módulo financiero aislado por tenant.

### Fase 4: Operaciones y Producción (Semana 10-11)

**Objetivo:** Aislar producción, inventario, nómina.

```
Tareas:
├── Migrar tenantId a:
│   ├── ProductionArea, ProductionOrder, ProductionOrderStep
│   ├── ProductTemplate, TemplateComponent, StepDefinition
│   ├── WorkOrder, WorkOrderItem, WorkOrderTimeEntry
│   ├── Supply, SupplyCategory, InventoryMovement, UnitOfMeasure
│   ├── Employee, PayrollPeriod, PayrollItem
│   ├── AttendanceRecord, ActivityHeartbeat
│   └── DtfRecord, DtfStatusHistory, SalesGoal
└── Tests de producción multitenant
```

**Entregable:** Módulos operativos completamente aislados.

### Fase 5: Comunicaciones e Integraciones (Semana 12-13)

**Objetivo:** WhatsApp, notificaciones, storage por tenant.

```
Tareas:
├── Migrar tenantId a:
│   ├── Notification, Comment, UploadedFile
│   ├── WhatsappActionContext
│   ├── AuditLog, SessionLog
│   └── OrderEditRequest, OrderStatusChangeRequest, ClientOwnershipAuthRequest
├── WhatsApp config por tenant (DB en vez de env vars)
├── Storage: organizar por tenant folders
├── Notificaciones scoped a tenant
└── Branding por tenant en frontend (colores, logo)
```

**Entregable:** Integraciones externas funcionando por tenant.

### Fase 6: Hardening y Polish (Semana 14-16)

**Objetivo:** Seguridad, performance, onboarding.

```
Tareas:
├── Implementar RLS policies en PostgreSQL (defensa en profundidad)
├── Índices compuestos para performance
├── Dashboard SuperAdmin (métricas cross-tenant)
├── Flujo de onboarding de nuevo tenant (wizard)
├── Seed automático para nuevo tenant (roles base, permisos, config)
├── Documentación actualizada
├── Tests e2e completos
└── Load testing multitenant
```

**Entregable:** Sistema multitenant production-ready.

### Diagrama de Fases

```
Semana  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16
        ├───┤───┤───┤───┤───┤───┤───┤───┤───┤───┤───┤───┤───┤───┤───┤
Fase 0  ████████                                                        Fundación
Fase 1          ████████                                                Auth + RBAC
Fase 2                  ████████████                                    Negocio Core
Fase 3                              ████████                            Finanzas
Fase 4                                      ████████                    Operaciones
Fase 5                                              ████████            Integraciones
Fase 6                                                      ████████████ Hardening
        ├───────────────┤
         MVP funcional (Sem 7)
```

---

## 12. Estimación de Esfuerzo

### 12.1 Por Fase

| Fase | Descripción | Semanas | Complejidad |
|------|-------------|---------|-------------|
| 0 | Fundación | 2 | Alta |
| 1 | Auth + RBAC | 2 | Alta |
| 2 | Negocio Core | 3 | Alta |
| 3 | Finanzas | 2 | Media |
| 4 | Operaciones | 2 | Media |
| 5 | Integraciones | 2 | Media-Alta |
| 6 | Hardening | 3 | Media |
| **Total** | | **16 semanas** | |

### 12.2 Por Tipo de Trabajo

| Tipo | Estimación |
|------|-----------|
| Modelos Prisma + migraciones | ~3 semanas |
| Backend (guards, interceptors, auth) | ~4 semanas |
| Backend (servicios y repos) | ~3 semanas |
| Frontend (auth, SuperAdmin, branding) | ~3 semanas |
| Testing + QA | ~2 semanas |
| DevOps + migración de datos | ~1 semana |

### 12.3 MVP vs Full

| Alcance | Fases | Semanas | Qué incluye |
|---------|-------|---------|-------------|
| **MVP** | 0-2 | 7 | Auth multitenant, SuperAdmin, clientes/órdenes/cotizaciones aislados |
| **Completo** | 0-6 | 16 | Todo el sistema multitenant con hardening |

---

## 13. Conclusión de Viabilidad

### ✅ La migración a multitenant ES VIABLE

**Factores a favor:**
1. **Arquitectura limpia**: El patrón Controller → Service → Repository con PrismaService centralizado permite inyectar filtrado en un solo punto.
2. **Prisma Extensions**: Mecanismo nativo para interceptar todas las queries y agregar `tenantId` automáticamente — reduce drásticamente el riesgo de data leaks.
3. **Guards centralizados**: JwtAuthGuard + PermissionsGuard ya existen como punto de inyección global — agregar TenantGuard es natural.
4. **Frontend desacoplado**: El frontend no necesita saber de multitenancy si el backend filtra automáticamente. Cambios limitados a login + layout.
5. **Sin breaking changes en API**: Los endpoints no cambian, el filtrado es transparente.

**Factores de precaución:**
1. **78 modelos** requieren migración — volumen de trabajo alto pero repetitivo.
2. **Raw SQL** en consecutivos y posiblemente otros módulos debe actualizarse manualmente.
3. **Tests existentes** necesitan actualización para incluir contexto de tenant.
4. **Migración de datos en producción** requiere planificación cuidadosa para evitar downtime.

### Recomendación Final

Proceder con la **estrategia de Shared Database + `tenantId`** usando **Prisma Client Extensions** para filtrado automático. Implementar en **fases incrementales**, comenzando con un MVP (Fases 0-2, ~7 semanas) que demuestre el concepto con los módulos core, antes de extender al sistema completo.

La clave del éxito está en la **Fase 0**: una implementación sólida del Prisma Extension de filtrado automático y el TenantGuard garantiza que las fases posteriores sean mecánicas (agregar `tenantId` + migración) en vez de riesgosas.

---

*Documento generado como análisis de factibilidad. No se han realizado cambios al código.*
