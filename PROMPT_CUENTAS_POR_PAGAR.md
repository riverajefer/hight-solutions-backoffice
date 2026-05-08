# Prompt: Módulo de Cuentas por Pagar

> **Proyecto:** High Solutions Backoffice  
> **Stack:** NestJS 11 + Prisma 7 + PostgreSQL (backend) · React 18 + MUI 5 + React Query + Zustand (frontend)  
> **Guías obligatorias a leer antes de generar código:**
> - `backend/docs/ai-guides/ARCHITECTURE.md`
> - `backend/docs/ai-guides/01-CRUD-MODULE-TEMPLATE.md`
> - `backend/docs/ai-guides/02-PRISMA-RELATIONS-GUIDE.md`
> - `backend/docs/ai-guides/03-GUARDS-DECORATORS-GUIDE.md`
> - `backend/docs/ai-guides/04-DTOS-VALIDATION-GUIDE.md`
> - `CLAUDE.md` (raíz del proyecto)

---

## 1. Descripción general

Crear el módulo **Cuentas por Pagar** (`accounts-payable`) que permita registrar, gestionar y hacer seguimiento de todas las obligaciones financieras de la empresa: proveedores, arriendos, servicios, créditos bancarios, nómina, impuestos y cualquier deuda pendiente. El módulo debe integrarse con las **Órdenes de Gasto** (OG) y con la **Caja Registradora** para registrar los movimientos de dinero.

---

## 2. Modelos de base de datos (Prisma)

Agregar al archivo `backend/prisma/schema.prisma` **al final del archivo**, antes de cerrar:

### 2.1 Enums nuevos

```prisma
enum AccountPayableStatus {
  PENDING    // Pendiente - sin ningún abono
  PARTIAL    // Abonada - tiene pagos parciales
  PAID       // Pagada - saldo completamente cubierto
  OVERDUE    // Vencida - pasó fecha de pago sin completarse
  CANCELLED  // Anulada
}

enum AccountPayableType {
  RENT                // Arriendo
  PUBLIC_SERVICES     // Servicios públicos (agua, luz, internet, etc.)
  BANK_CREDIT         // Crédito bancario
  SUPPLIER            // Proveedor (compras a crédito)
  THIRD_PARTY_SERVICE // Servicio de terceros
  PAYROLL             // Nómina / honorarios
  TAX                 // Impuestos
  MAINTENANCE         // Mantenimiento
  SUBSCRIPTION        // Suscripciones
  TRANSPORT           // Transporte / logística
  OTHER               // Otros
}
```

### 2.2 Modelo principal `AccountPayable`

```prisma
model AccountPayable {
  id               String                 @id @default(uuid())
  apNumber         String                 @unique @map("ap_number") // "CP-2026-001"
  type             AccountPayableType
  status           AccountPayableStatus   @default(PENDING)
  description      String
  observations     String?
  totalAmount      Decimal                @map("total_amount")   @db.Decimal(12, 2)
  paidAmount       Decimal                @default(0) @map("paid_amount") @db.Decimal(12, 2)
  balance          Decimal                @map("balance")        @db.Decimal(12, 2) // totalAmount - paidAmount
  dueDate          DateTime               @map("due_date")       // Fecha de vencimiento
  isRecurring      Boolean                @default(false) @map("is_recurring")
  recurringDay     Int?                   @map("recurring_day")  // Día del mes para pagos recurrentes

  // Relaciones opcionales
  supplierId       String?                @map("supplier_id")    // Proveedor / acreedor (usa model Supplier existente)
  expenseOrderId   String?                @unique @map("expense_order_id") // OG que originó esta cuenta

  // Auditoría
  createdById      String                 @map("created_by_id")
  createdAt        DateTime               @default(now()) @map("created_at")
  updatedAt        DateTime               @updatedAt @map("updated_at")
  cancelledAt      DateTime?              @map("cancelled_at")
  cancelledById    String?                @map("cancelled_by_id")
  cancelReason     String?                @map("cancel_reason")

  // Relaciones
  supplier         Supplier?              @relation(fields: [supplierId], references: [id])
  expenseOrder     ExpenseOrder?          @relation(fields: [expenseOrderId], references: [id])
  createdBy        User                   @relation("AccountPayableCreatedBy", fields: [createdById], references: [id])
  cancelledBy      User?                  @relation("AccountPayableCancelledBy", fields: [cancelledById], references: [id])
  payments         AccountPayablePayment[]
  attachments      AccountPayableAttachment[]

  @@index([status])
  @@index([dueDate])
  @@index([supplierId])
  @@index([createdById])
  @@index([createdAt])
  @@map("accounts_payable")
}
```

### 2.3 Modelo de pagos/abonos `AccountPayablePayment`

```prisma
model AccountPayablePayment {
  id               String        @id @default(uuid())
  accountPayableId String        @map("account_payable_id")
  amount           Decimal       @db.Decimal(12, 2)
  paymentMethod    PaymentMethod @default(CASH) @map("payment_method")
  reference        String?       // Número de referencia / comprobante
  notes            String?
  cashMovementId   String?       @unique @map("cash_movement_id") // Movimiento de caja generado

  registeredById   String        @map("registered_by_id")
  paymentDate      DateTime      @map("payment_date")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  accountPayable   AccountPayable @relation(fields: [accountPayableId], references: [id], onDelete: Cascade)
  cashMovement     CashMovement?  @relation(fields: [cashMovementId], references: [id])
  registeredBy     User           @relation("AccountPayablePaymentRegisteredBy", fields: [registeredById], references: [id])

  @@index([accountPayableId])
  @@index([paymentDate])
  @@map("account_payable_payments")
}
```

### 2.4 Modelo de adjuntos `AccountPayableAttachment`

```prisma
model AccountPayableAttachment {
  id               String        @id @default(uuid())
  accountPayableId String        @map("account_payable_id")
  fileUrl          String        @map("file_url")
  fileName         String        @map("file_name")
  fileType         String?       @map("file_type") // "application/pdf", "image/jpeg", etc.
  uploadedById     String        @map("uploaded_by_id")
  createdAt        DateTime      @default(now()) @map("created_at")

  accountPayable   AccountPayable @relation(fields: [accountPayableId], references: [id], onDelete: Cascade)
  uploadedBy       User           @relation("AccountPayableAttachmentUploadedBy", fields: [uploadedById], references: [id])

  @@index([accountPayableId])
  @@map("account_payable_attachments")
}
```

### 2.5 Agregar relaciones al modelo `User` existente

Agregar dentro del modelo `User` en `schema.prisma`:

```prisma
// Cuentas por Pagar
createdAccountsPayable     AccountPayable[]              @relation("AccountPayableCreatedBy")
cancelledAccountsPayable   AccountPayable[]              @relation("AccountPayableCancelledBy")
registeredApPayments       AccountPayablePayment[]       @relation("AccountPayablePaymentRegisteredBy")
uploadedApAttachments      AccountPayableAttachment[]    @relation("AccountPayableAttachmentUploadedBy")
```

### 2.6 Agregar relación en `CashMovement`

Agregar dentro del modelo `CashMovement`:

```prisma
accountPayablePayment AccountPayablePayment?
```

### 2.7 Agregar relación en `Supplier`

Agregar dentro del modelo `Supplier`:

```prisma
accountsPayable AccountPayable[]
```

### 2.8 Agregar relación en `ExpenseOrder`

Agregar dentro del modelo `ExpenseOrder`:

```prisma
accountPayable AccountPayable?
```

### 2.9 Ejecutar migración

```bash
cd backend
npx prisma migrate dev --name add_accounts_payable_module
npx prisma generate
```

---

## 3. Backend: Módulo NestJS

### 3.1 Estructura de carpetas

```
backend/src/modules/accounts-payable/
├── dto/
│   ├── create-account-payable.dto.ts
│   ├── update-account-payable.dto.ts
│   ├── filter-account-payable.dto.ts
│   ├── register-payment.dto.ts
│   └── index.ts
├── accounts-payable.controller.ts
├── accounts-payable.service.ts
├── accounts-payable.repository.ts
└── accounts-payable.module.ts
```

### 3.2 DTOs requeridos

#### `create-account-payable.dto.ts`
Campos:
- `type`: `AccountPayableType` (requerido, `@IsEnum(AccountPayableType)`)
- `description`: string (requerido, min 3 chars)
- `observations`: string (opcional)
- `totalAmount`: number (requerido, `@IsPositive()`)
- `dueDate`: string ISO (requerido, `@IsDateString()`)
- `supplierId`: string UUID (opcional, `@IsUUID()`)
- `expenseOrderId`: string UUID (opcional, `@IsUUID()`)
- `isRecurring`: boolean (opcional, default false)
- `recurringDay`: number (opcional, entre 1 y 31, requerido si `isRecurring=true`)

#### `update-account-payable.dto.ts`
Todos los campos de create como opcionales (excepto type y totalAmount no se pueden cambiar si ya tiene pagos).

#### `filter-account-payable.dto.ts`
Campos de filtro:
- `status`: `AccountPayableStatus` (opcional)
- `type`: `AccountPayableType` (opcional)
- `supplierId`: string (opcional)
- `search`: string (opcional, busca en description)
- `dueDateFrom`: string ISO (opcional)
- `dueDateTo`: string ISO (opcional)
- `page`: number (default 1)
- `limit`: number (default 20, max 100)
- `orderBy`: `'dueDate' | 'totalAmount' | 'createdAt'` (default `'dueDate'`)
- `orderDir`: `'asc' | 'desc'` (default `'asc'`)

#### `register-payment.dto.ts`
Campos:
- `amount`: number (requerido, `@IsPositive()`)
- `paymentMethod`: `PaymentMethod` (requerido)
- `paymentDate`: string ISO (requerido)
- `reference`: string (opcional)
- `notes`: string (opcional)
- `cashSessionId`: string UUID (opcional, para vincular movimiento de caja)

### 3.3 Métodos del servicio (`accounts-payable.service.ts`)

```typescript
// CRUD principal
findAll(filters: FilterAccountPayableDto): Promise<PaginatedResult>
findOne(id: string): Promise<AccountPayableWithRelations>
create(dto: CreateAccountPayableDto, userId: string): Promise<AccountPayable>
update(id: string, dto: UpdateAccountPayableDto, userId: string): Promise<AccountPayable>
cancel(id: string, reason: string, userId: string): Promise<AccountPayable>

// Pagos
registerPayment(id: string, dto: RegisterPaymentDto, userId: string): Promise<AccountPayablePayment>
getPaymentHistory(id: string): Promise<AccountPayablePayment[]>

// Métricas / resumen
getSummary(): Promise<AccountPayableSummary>
// Retorna: totalPending, totalOverdue, totalPartial, totalPaid, upcomingCount, totalAmountPending

// Generación automática de número
generateApNumber(): Promise<string>  // "CP-2026-001"
```

**Lógica importante en el servicio:**
- Al crear: calcular `balance = totalAmount`, establecer status `PENDING`
- Al registrar pago: actualizar `paidAmount`, recalcular `balance = totalAmount - paidAmount`
  - Si `balance <= 0` → status `PAID`
  - Si `balance < totalAmount` → status `PARTIAL`
- Al registrar pago, si hay `cashSessionId`: crear `CashMovement` de tipo `EXPENSE` en la caja vinculada
- Nunca permitir `paidAmount > totalAmount` (lanzar `BadRequestException`)
- Al cancelar: solo si status no es `PAID`
- Tarea programada (`@Cron`): cada día a medianoche, marcar como `OVERDUE` las cuentas `PENDING` o `PARTIAL` cuya `dueDate < now()`
- Al crear desde una OG: recibir `expenseOrderId` y verificar que la OG exista y no tenga ya una cuenta asociada

### 3.4 Endpoints del controlador (`accounts-payable.controller.ts`)

Todos bajo `@Controller('accounts-payable')` con guards `JwtAuthGuard` + `PermissionsGuard`:

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/` | `read_accounts_payable` | Listar con filtros y paginación |
| GET | `/summary` | `read_accounts_payable` | Métricas y totales |
| GET | `/:id` | `read_accounts_payable` | Detalle de una cuenta |
| POST | `/` | `create_accounts_payable` | Crear cuenta |
| PUT | `/:id` | `update_accounts_payable` | Actualizar cuenta |
| DELETE | `/:id` | `delete_accounts_payable` | Anular cuenta (soft) |
| POST | `/:id/payments` | `register_ap_payment` | Registrar pago/abono |
| GET | `/:id/payments` | `read_accounts_payable` | Historial de pagos |
| DELETE | `/:id/payments/:paymentId` | `delete_accounts_payable` | Anular un pago (solo admin) |

Documentar todos los endpoints con `@ApiTags('accounts-payable')`, `@ApiOperation`, `@ApiResponse`.

### 3.5 Permisos para el seed (`backend/prisma/seed.ts`)

```typescript
const accountsPayablePermissions = [
  { name: 'create_accounts_payable', description: 'Crear cuentas por pagar' },
  { name: 'read_accounts_payable',   description: 'Ver cuentas por pagar' },
  { name: 'update_accounts_payable', description: 'Editar cuentas por pagar' },
  { name: 'delete_accounts_payable', description: 'Anular cuentas por pagar' },
  { name: 'register_ap_payment',     description: 'Registrar pagos en cuentas por pagar' },
];
```

Asignar todos al rol `admin`. Asignar `read_accounts_payable` y `register_ap_payment` al rol `manager`.

### 3.6 Módulo NestJS (`accounts-payable.module.ts`)

Importar: `PrismaModule` (para `PrismaService`), `ScheduleModule` (para crons). Exportar el servicio si se necesita en otros módulos (ej: `ExpenseOrdersModule` para la integración).

---

## 4. Integración con Órdenes de Gasto (OG)

Cuando una `ExpenseOrder` cambie a estado `AUTHORIZED` o `PAID`:
- Verificar si ya tiene una `AccountPayable` asociada
- Si **no** tiene: crear automáticamente una `AccountPayable` con:
  - `type = OTHER` (o mapear desde el `expenseType` de la OG)
  - `description`: descripción de la OG
  - `totalAmount`: suma total de los items de la OG
  - `dueDate`: fecha actual + 30 días (configurable)
  - `expenseOrderId`: id de la OG
  - `status`: `PENDING`

Esto se hace desde `ExpenseOrdersService` llamando a `AccountsPayableService.createFromExpenseOrder()`.

---

## 5. Frontend: Módulo React

### 5.1 Estructura de carpetas

```
frontend/src/features/accounts-payable/
├── pages/
│   ├── AccountsPayableListPage.tsx   ← Lista principal con filtros
│   ├── AccountsPayableDetailPage.tsx ← Detalle + historial de pagos
│   └── AccountsPayableFormPage.tsx   ← Crear / editar
├── components/
│   ├── AccountPayableStatusChip.tsx  ← Chip de estado con colores
│   ├── AccountPayableSummaryCards.tsx← Cards de métricas en la lista
│   ├── RegisterPaymentDialog.tsx     ← Dialog para registrar pago
│   └── PaymentHistoryTable.tsx       ← Tabla de abonos
└── hooks/
    └── useAccountsPayable.ts         ← React Query hooks
```

### 5.2 API service (`frontend/src/api/accounts-payable.api.ts`)

```typescript
export const accountsPayableApi = {
  getAll:          (params) => axiosInstance.get('/accounts-payable', { params }),
  getSummary:      ()       => axiosInstance.get('/accounts-payable/summary'),
  getOne:          (id)     => axiosInstance.get(`/accounts-payable/${id}`),
  create:          (dto)    => axiosInstance.post('/accounts-payable', dto),
  update:          (id, dto)=> axiosInstance.put(`/accounts-payable/${id}`, dto),
  cancel:          (id, dto)=> axiosInstance.delete(`/accounts-payable/${id}`, { data: dto }),
  registerPayment: (id, dto)=> axiosInstance.post(`/accounts-payable/${id}/payments`, dto),
  getPayments:     (id)     => axiosInstance.get(`/accounts-payable/${id}/payments`),
};
```

### 5.3 Tipos TypeScript (`frontend/src/types/accounts-payable.types.ts`)

```typescript
export type AccountPayableStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type AccountPayableType = 'RENT' | 'PUBLIC_SERVICES' | 'BANK_CREDIT' | 'SUPPLIER' | 
  'THIRD_PARTY_SERVICE' | 'PAYROLL' | 'TAX' | 'MAINTENANCE' | 'SUBSCRIPTION' | 'TRANSPORT' | 'OTHER';

export const ACCOUNT_PAYABLE_STATUS_LABELS: Record<AccountPayableStatus, string> = {
  PENDING:   'Pendiente',
  PARTIAL:   'Abonada',
  PAID:      'Pagada',
  OVERDUE:   'Vencida',
  CANCELLED: 'Anulada',
};

export const ACCOUNT_PAYABLE_TYPE_LABELS: Record<AccountPayableType, string> = {
  RENT:                'Arriendo',
  PUBLIC_SERVICES:     'Servicios Públicos',
  BANK_CREDIT:         'Crédito Bancario',
  SUPPLIER:            'Proveedor',
  THIRD_PARTY_SERVICE: 'Servicio de Terceros',
  PAYROLL:             'Nómina / Honorarios',
  TAX:                 'Impuestos',
  MAINTENANCE:         'Mantenimiento',
  SUBSCRIPTION:        'Suscripción',
  TRANSPORT:           'Transporte / Logística',
  OTHER:               'Otros',
};

export interface AccountPayable {
  id:            string;
  apNumber:      string;
  type:          AccountPayableType;
  status:        AccountPayableStatus;
  description:   string;
  observations?: string;
  totalAmount:   string;
  paidAmount:    string;
  balance:       string;
  dueDate:       string;
  isRecurring:   boolean;
  recurringDay?: number;
  supplier?:     { id: string; name: string };
  expenseOrder?: { id: string; ogNumber: string };
  createdBy:     { id: string; firstName?: string; lastName?: string };
  createdAt:     string;
  updatedAt:     string;
  payments?:     AccountPayablePayment[];
}

export interface AccountPayablePayment {
  id:            string;
  amount:        string;
  paymentMethod: string;
  paymentDate:   string;
  reference?:    string;
  notes?:        string;
  registeredBy:  { id: string; firstName?: string; lastName?: string };
  createdAt:     string;
}

export interface AccountPayableSummary {
  totalPending:       number;
  totalOverdue:       number;
  totalPartial:       number;
  totalPaid:          number;
  upcomingCount:      number; // vencen en los próximos 7 días
  totalAmountPending: string;
  totalAmountOverdue: string;
}
```

### 5.4 Colores de estado

Usar la paleta del tema del proyecto (`theme/colors.ts`):

| Estado | Color MUI | Hex referencia |
|--------|-----------|----------------|
| PENDING | `warning.main` | `#F97316` |
| PARTIAL | `info.main` | `#2EB0C4` |
| PAID | `success.main` | `#22D3EE` |
| OVERDUE | `error.main` | `#FF2D95` |
| CANCELLED | `text.disabled` | gris |

### 5.5 Página de lista (`AccountsPayableListPage.tsx`)

Incluir:
- **Cards de resumen** arriba (Total pendiente, Total vencido, Próximos a vencer, Total abonado) usando `AccountPayableSummaryCards`
- **Filtros**: estado, tipo, proveedor, fecha vencimiento (desde/hasta), búsqueda por descripción
- **Tabla** (`DataTable`) con columnas: Número (CP-), Descripción, Proveedor, Tipo, Total, Abonado, Saldo, Vencimiento, Estado, Acciones
- **Indicadores visuales** en la columna "Vencimiento": 🔴 si vencida, 🟡 si vence en los próximos 7 días
- Botón "Nueva Cuenta" (requiere permiso `create_accounts_payable`)
- Botón de exportar PDF/Excel (si aplica)

### 5.6 Página de detalle (`AccountsPayableDetailPage.tsx`)

Incluir:
- Información completa de la cuenta
- Barra de progreso del pago (`paidAmount / totalAmount`)
- Botón "Registrar Pago" → abre `RegisterPaymentDialog` (requiere permiso `register_ap_payment`)
- Botón "Anular" → confirmación (requiere permiso `delete_accounts_payable`)
- Sección de **historial de pagos** (`PaymentHistoryTable`)
- Sección de **adjuntos** (subir y ver comprobantes)
- Si viene de una OG: mostrar enlace a la Orden de Gasto

### 5.7 Formulario de creación (`AccountsPayableFormPage.tsx`)

Validación con **Zod**:
- `type`: requerido
- `description`: requerido, mínimo 3 caracteres
- `totalAmount`: requerido, mayor a 0
- `dueDate`: requerido, fecha futura o presente
- `supplierId`: opcional
- `isRecurring + recurringDay`: si `isRecurring=true`, `recurringDay` requerido (1-31)

### 5.8 Dialog de registro de pago (`RegisterPaymentDialog.tsx`)

- Campo `amount` con formato de moneda colombiana
- Advertencia si `amount > balance` restante (no debe permitirse)
- Selector `paymentMethod` con los mismos valores del sistema
- Campo fecha `paymentDate` con DatePicker
- Campo opcional `reference` y `notes`
- Mostrar resumen: Total · Abonado · Saldo antes y después del pago

### 5.9 Ruta y menú

**Router** (`frontend/src/router/index.tsx`):
```tsx
<Route path="/accounts-payable" element={
  <PermissionGuard permission="read_accounts_payable">
    <AccountsPayableListPage />
  </PermissionGuard>
} />
<Route path="/accounts-payable/new" element={
  <PermissionGuard permission="create_accounts_payable">
    <AccountsPayableFormPage />
  </PermissionGuard>
} />
<Route path="/accounts-payable/:id" element={
  <PermissionGuard permission="read_accounts_payable">
    <AccountsPayableDetailPage />
  </PermissionGuard>
} />
<Route path="/accounts-payable/:id/edit" element={
  <PermissionGuard permission="update_accounts_payable">
    <AccountsPayableFormPage />
  </PermissionGuard>
} />
```

**Sidebar** (`frontend/src/components/layout/Sidebar.tsx`): agregar entrada en la sección financiera:
```typescript
{
  label: 'Cuentas por Pagar',
  path: '/accounts-payable',
  icon: <AccountBalanceIcon />, // o CreditCardIcon
  permission: 'read_accounts_payable',
}
```

---

## 6. Validaciones y reglas de negocio

1. **No permitir pago mayor al saldo**: `amount > balance` → error 400
2. **No editar si está pagada o anulada**: status `PAID` o `CANCELLED` → solo lectura
3. **No anular si tiene pagos registrados** sin revertirlos primero (o preguntar al usuario)
4. **Número auto-incremental** con formato `CP-{AÑO}-{NNN}` (ej: `CP-2026-001`)
5. **Estado OVERDUE automático**: cron job diario que marca vencidas las cuentas `PENDING` / `PARTIAL` con `dueDate < today`
6. **Una sola cuenta por OG**: la relación `expenseOrderId` es `@unique`, validar en el servicio
7. **Movimiento de caja**: si se provee `cashSessionId` al registrar pago, crear `CashMovement` de tipo `EXPENSE` automáticamente

---

## 7. Checklist de implementación

### Backend
- [ ] Agregar enums al schema de Prisma
- [ ] Agregar modelos `AccountPayable`, `AccountPayablePayment`, `AccountPayableAttachment`
- [ ] Agregar relaciones a `User`, `Supplier`, `ExpenseOrder`, `CashMovement`
- [ ] Ejecutar `npx prisma migrate dev` y `npx prisma generate`
- [ ] Crear DTOs con validaciones
- [ ] Crear repository con métodos CRUD y queries de filtros
- [ ] Crear service con lógica de negocio
- [ ] Crear controller con guards y Swagger
- [ ] Crear módulo y registrar en `AppModule`
- [ ] Agregar permisos al `seed.ts`
- [ ] Implementar cron job para OVERDUE
- [ ] Implementar integración con `ExpenseOrdersService`
- [ ] Ejecutar `npm run prisma:seed`

### Frontend
- [ ] Crear `accounts-payable.types.ts`
- [ ] Crear `accounts-payable.api.ts`
- [ ] Crear `useAccountsPayable.ts` (React Query hooks)
- [ ] Crear `AccountPayableStatusChip.tsx`
- [ ] Crear `AccountPayableSummaryCards.tsx`
- [ ] Crear `AccountsPayableListPage.tsx`
- [ ] Crear `AccountsPayableDetailPage.tsx`
- [ ] Crear `AccountsPayableFormPage.tsx`
- [ ] Crear `RegisterPaymentDialog.tsx`
- [ ] Crear `PaymentHistoryTable.tsx`
- [ ] Agregar rutas al router
- [ ] Agregar entrada al Sidebar

---

## 8. Notas finales para el asistente

- **Seguir exactamente** la arquitectura Controller → Service → Repository → PrismaService
- **No** poner lógica de negocio en el controller ni en el repository
- **Usar** `@UseGuards(JwtAuthGuard, PermissionsGuard)` en todos los endpoints
- **Usar** `@CurrentUser()` para obtener el usuario autenticado
- **Usar** `class-validator` en todos los DTOs del backend
- **Usar** `zod` para validación de formularios en el frontend
- **Usar** `useQuery` / `useMutation` de React Query para todas las llamadas API
- **Respetar** la paleta de colores del tema neón del proyecto (ver `frontend/src/theme/colors.ts`)
- **Exportar** el servicio del módulo si otros módulos lo necesitan (integración OG)
- Los valores monetarios se manejan como `Decimal` en Prisma y `string` en las respuestas JSON (igual que en `Order` y `ExpenseOrder`)
