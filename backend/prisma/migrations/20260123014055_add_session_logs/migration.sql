-- CreateTable
CREATE TABLE "session_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "login_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_at" DATETIME,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "session_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "session_logs_user_id_idx" ON "session_logs"("user_id");

-- CreateIndex
CREATE INDEX "session_logs_login_at_idx" ON "session_logs"("login_at");

-- CreateIndex
CREATE INDEX "session_logs_logout_at_idx" ON "session_logs"("logout_at");
