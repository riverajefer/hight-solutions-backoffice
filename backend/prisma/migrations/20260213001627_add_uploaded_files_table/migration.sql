-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_bucket" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "uploaded_by" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uploaded_files_file_name_key" ON "uploaded_files"("file_name");

-- CreateIndex
CREATE UNIQUE INDEX "uploaded_files_s3_key_key" ON "uploaded_files"("s3_key");

-- CreateIndex
CREATE INDEX "uploaded_files_entity_type_entity_id_idx" ON "uploaded_files"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "uploaded_files_uploaded_by_idx" ON "uploaded_files"("uploaded_by");

-- CreateIndex
CREATE INDEX "uploaded_files_is_deleted_idx" ON "uploaded_files"("is_deleted");
