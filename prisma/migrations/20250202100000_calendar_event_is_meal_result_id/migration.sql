-- CalendarEvent: isMeal + resultId für Gourmet/Wochenplaner-Sync
ALTER TABLE "CalendarEvent" ADD COLUMN "isMeal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CalendarEvent" ADD COLUMN "resultId" TEXT;

CREATE INDEX "CalendarEvent_resultId_idx" ON "CalendarEvent"("resultId");
