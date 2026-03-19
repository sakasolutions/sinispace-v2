-- createMany liefert sonst keine @default-Werte zuverlässig; Spalten für Prod/Dev angleichen
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
