-- =============================================================================
-- CATCHUP MIGRATION: All features added via db push after 20260303120000
-- Covers: users fields, expense_orders auth, expense_order_auth_requests,
--         attendance, employees, payroll, inventory_movements
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE NEW ENUM TYPES
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "AttendanceSource" AS ENUM ('BUTTON', 'INACTIVITY', 'LOGOUT', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AttendanceType" AS ENUM ('MANUAL', 'AUTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ContractType" AS ENUM ('FIXED_TERM', 'INDEFINITE', 'SERVICE_CONTRACT', 'INTERNSHIP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EmployeeType" AS ENUM ('REGULAR', 'TEMPORARY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryMovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT', 'RETURN', 'INITIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollPeriodStatus" AS ENUM ('DRAFT', 'CALCULATED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollPeriodType" AS ENUM ('BIWEEKLY', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. ALTER EXISTING ENUMS: Add missing values
-- -----------------------------------------------------------------------------

-- OrderStatus: re-add RETURNED (was removed in 20260227013507)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

-- NotificationType: expense order auth
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXPENSE_ORDER_AUTH_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXPENSE_ORDER_AUTH_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXPENSE_ORDER_AUTH_REQUEST_REJECTED';

-- NotificationType: inventory
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LOW_STOCK_ALERT';

-- -----------------------------------------------------------------------------
-- 3. ALTER TABLE users: Add username, mustChangePassword; make email nullable
-- -----------------------------------------------------------------------------

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Make email nullable (was NOT NULL)
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Unique index on username (only if doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- -----------------------------------------------------------------------------
-- 4. ALTER TABLE expense_orders: Add authorization fields
-- -----------------------------------------------------------------------------

ALTER TABLE "expense_orders"
  ADD COLUMN IF NOT EXISTS "authorized_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "authorized_at" TIMESTAMP(3);

-- FK: expense_orders.authorized_by_id -> users
DO $$ BEGIN
  ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_authorized_by_id_fkey"
    FOREIGN KEY ("authorized_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 5. CREATE TABLE expense_order_auth_requests
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "expense_order_auth_requests" (
    "id" TEXT NOT NULL,
    "expense_order_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_order_auth_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "expense_order_auth_requests_expense_order_id_idx"
  ON "expense_order_auth_requests"("expense_order_id");
CREATE INDEX IF NOT EXISTS "expense_order_auth_requests_requested_by_id_idx"
  ON "expense_order_auth_requests"("requested_by_id");
CREATE INDEX IF NOT EXISTS "expense_order_auth_requests_status_idx"
  ON "expense_order_auth_requests"("status");

DO $$ BEGIN
  ALTER TABLE "expense_order_auth_requests" ADD CONSTRAINT "expense_order_auth_requests_expense_order_id_fkey"
    FOREIGN KEY ("expense_order_id") REFERENCES "expense_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "expense_order_auth_requests" ADD CONSTRAINT "expense_order_auth_requests_requested_by_id_fkey"
    FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "expense_order_auth_requests" ADD CONSTRAINT "expense_order_auth_requests_reviewed_by_id_fkey"
    FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 6. CREATE TABLE attendance_records
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "attendance_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "type" "AttendanceType" NOT NULL DEFAULT 'MANUAL',
    "source" "AttendanceSource" NOT NULL DEFAULT 'BUTTON',
    "notes" TEXT,
    "total_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attendance_records_user_id_date_idx"
  ON "attendance_records"("user_id", "date");

DO $$ BEGIN
  ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 7. CREATE TABLE activity_heartbeats
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "activity_heartbeats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpoint" TEXT,

    CONSTRAINT "activity_heartbeats_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "activity_heartbeats_user_id_timestamp_idx"
  ON "activity_heartbeats"("user_id", "timestamp");

DO $$ BEGIN
  ALTER TABLE "activity_heartbeats" ADD CONSTRAINT "activity_heartbeats_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 8. CREATE TABLE employees
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cargoId" TEXT,
    "employeeType" "EmployeeType" NOT NULL DEFAULT 'REGULAR',
    "monthlySalary" DECIMAL(12,2),
    "dailyRate" DECIMAL(12,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "contractType" "ContractType",
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "employees_userId_key" ON "employees"("userId");

DO $$ BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_cargoId_fkey"
    FOREIGN KEY ("cargoId") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 9. CREATE TABLE payroll_periods
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "payroll_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "periodType" "PayrollPeriodType" NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "overtimeDaytimeRate" DECIMAL(10,2),
    "overtimeNighttimeRate" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- -----------------------------------------------------------------------------
-- 10. CREATE TABLE payroll_items
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "payroll_items" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "daysWorked" DECIMAL(5,2),
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "overtimeDaytimeHours" DECIMAL(7,2),
    "overtimeNighttimeHours" DECIMAL(7,2),
    "overtimeDaytimeValue" DECIMAL(12,2),
    "overtimeNighttimeValue" DECIMAL(12,2),
    "commissions" DECIMAL(12,2),
    "restDayValue" DECIMAL(12,2),
    "transportAllowance" DECIMAL(12,2),
    "workdayDiscount" DECIMAL(12,2),
    "loans" DECIMAL(12,2),
    "advances" DECIMAL(12,2),
    "nonPaidDays" DECIMAL(12,2),
    "epsAndPensionDiscount" DECIMAL(12,2),
    "totalPayment" DECIMAL(12,2) NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payroll_items_periodId_employeeId_key"
  ON "payroll_items"("periodId", "employeeId");

DO $$ BEGIN
  ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 11. CREATE TABLE inventory_movements
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "inventory_movements" (
    "id" TEXT NOT NULL,
    "supply_id" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_cost" DECIMAL,
    "previous_stock" DECIMAL NOT NULL,
    "new_stock" DECIMAL NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "performed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_movements_supply_id_idx"
  ON "inventory_movements"("supply_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_type_idx"
  ON "inventory_movements"("type");
CREATE INDEX IF NOT EXISTS "inventory_movements_reference_type_reference_id_idx"
  ON "inventory_movements"("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_created_at_idx"
  ON "inventory_movements"("created_at");

DO $$ BEGIN
  ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_supply_id_fkey"
    FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_performed_by_id_fkey"
    FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
