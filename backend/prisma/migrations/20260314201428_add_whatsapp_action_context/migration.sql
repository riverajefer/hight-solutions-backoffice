-- CreateTable
CREATE TABLE "whatsapp_action_contexts" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "admin_phone" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_action_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_action_contexts_message_id_key" ON "whatsapp_action_contexts"("message_id");

-- CreateIndex
CREATE INDEX "whatsapp_action_contexts_message_id_idx" ON "whatsapp_action_contexts"("message_id");

-- CreateIndex
CREATE INDEX "whatsapp_action_contexts_expires_at_idx" ON "whatsapp_action_contexts"("expires_at");
