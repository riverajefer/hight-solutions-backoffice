-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_light_id" TEXT,
    "logo_dark_id" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "mobile_phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "nit" TEXT,
    "legal_representative" TEXT,
    "founded_year" INTEGER,
    "tax_regime" TEXT,
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "bank_account_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);
