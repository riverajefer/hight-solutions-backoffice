/*
  Warnings:

  - You are about to alter the column `quantity` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `unit_cost` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `previous_stock` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `new_stock` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.

*/
-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('PAPEL', 'PLANCHAS', 'CARTON', 'MUESTRA_COLOR', 'PLASTIFICADO', 'CORTE', 'TROQUEL', 'REVISION', 'ARMADO', 'EMPAQUE');

-- CreateEnum
CREATE TYPE "ComponentPhase" AS ENUM ('impresion', 'material', 'armado', 'despacho');

-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED');

-- AlterTable
ALTER TABLE "inventory_movements" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "unit_cost" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "previous_stock" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "new_stock" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "step_definitions" (
    "id" TEXT NOT NULL,
    "type" "StepType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "field_schema" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_components" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "phase" "ComponentPhase" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_component_steps" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "step_definition_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "field_overrides" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_component_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_components" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "phase" "ComponentPhase" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_order_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_steps" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "step_definition_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "ProductionStepStatus" NOT NULL DEFAULT 'PENDING',
    "field_values" JSONB NOT NULL DEFAULT '{}',
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_order_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "step_definitions_type_key" ON "step_definitions"("type");

-- CreateIndex
CREATE INDEX "template_components_template_id_idx" ON "template_components"("template_id");

-- CreateIndex
CREATE INDEX "template_component_steps_component_id_idx" ON "template_component_steps"("component_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_code_key" ON "production_orders"("code");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_work_order_id_key" ON "production_orders"("work_order_id");

-- CreateIndex
CREATE INDEX "production_orders_status_idx" ON "production_orders"("status");

-- CreateIndex
CREATE INDEX "production_orders_created_by_id_idx" ON "production_orders"("created_by_id");

-- CreateIndex
CREATE INDEX "production_order_components_production_order_id_idx" ON "production_order_components"("production_order_id");

-- CreateIndex
CREATE INDEX "production_order_steps_component_id_idx" ON "production_order_steps"("component_id");

-- CreateIndex
CREATE INDEX "production_order_steps_status_idx" ON "production_order_steps"("status");

-- AddForeignKey
ALTER TABLE "template_components" ADD CONSTRAINT "template_components_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "product_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_component_steps" ADD CONSTRAINT "template_component_steps_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "template_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_component_steps" ADD CONSTRAINT "template_component_steps_step_definition_id_fkey" FOREIGN KEY ("step_definition_id") REFERENCES "step_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "product_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_components" ADD CONSTRAINT "production_order_components_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_steps" ADD CONSTRAINT "production_order_steps_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "production_order_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_steps" ADD CONSTRAINT "production_order_steps_step_definition_id_fkey" FOREIGN KEY ("step_definition_id") REFERENCES "step_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_steps" ADD CONSTRAINT "production_order_steps_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
