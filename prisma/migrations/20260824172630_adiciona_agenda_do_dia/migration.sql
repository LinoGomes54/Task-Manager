-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "agenda_date" TEXT,
ADD COLUMN     "agenda_position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "duration_minutes" INTEGER NOT NULL DEFAULT 25;

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "agenda_start_time" TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN     "break_minutes" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "pomodoro_minutes" INTEGER NOT NULL DEFAULT 25;

-- CreateIndex
CREATE INDEX "idx_tasks_agenda" ON "tasks"("user_id", "agenda_date", "agenda_position");
