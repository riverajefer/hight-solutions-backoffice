-- CreateEnum
CREATE TYPE "ApprovalRequestType" AS ENUM ('ORDER_EDIT', 'STATUS_CHANGE', 'EXPENSE_ORDER_AUTH', 'CLIENT_OWNERSHIP_AUTH', 'ADVANCE_PAYMENT');

-- AlterTable
ALTER TABLE "whatsapp_action_contexts" ADD COLUMN     "request_type" "ApprovalRequestType" NOT NULL DEFAULT 'ORDER_EDIT';
