-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "areaId" TEXT NOT NULL,
    CONSTRAINT "cargos_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "refreshToken" TEXT,
    "roleId" TEXT NOT NULL,
    "cargoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "users_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "cargos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("createdAt", "email", "firstName", "id", "lastName", "password", "refreshToken", "roleId", "updatedAt") SELECT "createdAt", "email", "firstName", "id", "lastName", "password", "refreshToken", "roleId", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "areas_name_key" ON "areas"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_name_areaId_key" ON "cargos"("name", "areaId");
