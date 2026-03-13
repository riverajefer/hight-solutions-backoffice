/*
  Warnings:

  - You are about to drop the column `code` on the `production_orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[oprod_number]` on the table `production_orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `oprod_number` to the `production_orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "production_orders_code_key";

-- AlterTable
ALTER TABLE "production_orders" DROP COLUMN "code",
ADD COLUMN     "oprod_number" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_oprod_number_key" ON "production_orders"("oprod_number");
