// prisma.config.ts
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma", // Adjust path if necessary
  datasource: {
    url: env("DATABASE_URL"),
  },
});