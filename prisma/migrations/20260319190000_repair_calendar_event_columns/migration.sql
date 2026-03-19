-- Reparatur: CalendarEvent existiert, aber Spalten fehlen (Migration 20250203000000 war in der DB als "failed").
-- PostgreSQL 11+: ADD COLUMN IF NOT EXISTS
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "recipeId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "resultId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "mealType" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "servings" INTEGER;

-- FK zu Result (nur wenn noch nicht vorhanden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_resultId_fkey'
  ) THEN
    ALTER TABLE "CalendarEvent"
      ADD CONSTRAINT "CalendarEvent_resultId_fkey"
      FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
