-- AlterTable
ALTER TABLE "payroll_periods" ADD COLUMN IF NOT EXISTS "overtimeDaytimeFestiveRate" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "overtimeNighttimeFestiveRate" DECIMAL(10,2);
