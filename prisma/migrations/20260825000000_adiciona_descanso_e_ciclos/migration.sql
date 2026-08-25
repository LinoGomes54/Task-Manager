-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "break_after_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cycle_break_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "focus_minutes" INTEGER NOT NULL DEFAULT 0;
