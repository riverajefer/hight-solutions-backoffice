-- Traslado de un movimiento en efectivo de una sesión cerrada a la sesión
-- abierta de la misma caja. Ver docs/PROPUESTA_TRASLADO_MOVIMIENTOS_CAJA.md.

-- AlterEnum
ALTER TYPE "ApprovalRequestType" ADD VALUE 'CASH_MOVEMENT_TRANSFER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CASH_TRANSFER_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'CASH_TRANSFER_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CASH_TRANSFER_REQUEST_REJECTED';

-- CreateTable
CREATE TABLE "cash_movement_transfer_requests" (
    "id" TEXT NOT NULL,
    "cash_movement_id" TEXT NOT NULL,
    "source_session_id" TEXT NOT NULL,
    "target_session_id" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "cash_stayed_in_drawer" BOOLEAN NOT NULL,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "source_system_balance_before" DECIMAL(14,2),
    "source_system_balance_after" DECIMAL(14,2),
    "source_discrepancy_before" DECIMAL(14,2),
    "source_discrepancy_after" DECIMAL(14,2),
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_movement_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_movement_transfer_requests_cash_movement_id_idx" ON "cash_movement_transfer_requests"("cash_movement_id");

-- CreateIndex
CREATE INDEX "cash_movement_transfer_requests_source_session_id_idx" ON "cash_movement_transfer_requests"("source_session_id");

-- CreateIndex
CREATE INDEX "cash_movement_transfer_requests_target_session_id_idx" ON "cash_movement_transfer_requests"("target_session_id");

-- CreateIndex
CREATE INDEX "cash_movement_transfer_requests_requested_by_id_idx" ON "cash_movement_transfer_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "cash_movement_transfer_requests_status_idx" ON "cash_movement_transfer_requests"("status");

-- AddForeignKey
ALTER TABLE "cash_movement_transfer_requests" ADD CONSTRAINT "cash_movement_transfer_requests_cash_movement_id_fkey" FOREIGN KEY ("cash_movement_id") REFERENCES "cash_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement_transfer_requests" ADD CONSTRAINT "cash_movement_transfer_requests_source_session_id_fkey" FOREIGN KEY ("source_session_id") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement_transfer_requests" ADD CONSTRAINT "cash_movement_transfer_requests_target_session_id_fkey" FOREIGN KEY ("target_session_id") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement_transfer_requests" ADD CONSTRAINT "cash_movement_transfer_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement_transfer_requests" ADD CONSTRAINT "cash_movement_transfer_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Una sola solicitud pendiente por movimiento: el doble clic crea dos
-- solicitudes con milisegundos de diferencia y un `findFirst` no lo frena.
CREATE UNIQUE INDEX "cash_movement_transfer_requests_pending_movement_unique"
  ON "cash_movement_transfer_requests"("cash_movement_id")
  WHERE "status" = 'PENDING';

-- Un movimiento se traslada una sola vez: si se pudiera volver a mover, un
-- mismo billete podría tapar faltantes en varias sesiones.
CREATE UNIQUE INDEX "cash_movement_transfer_requests_applied_movement_unique"
  ON "cash_movement_transfer_requests"("cash_movement_id")
  WHERE "status" = 'APPROVED';
