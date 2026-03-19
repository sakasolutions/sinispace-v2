-- Spalte entfernen (falls vorhanden): Prisma-Client darf isMeal nicht mehr referenzieren.
-- Auf DBs ohne diese Spalte ist DROP IF EXISTS ein No-Op.
ALTER TABLE "CalendarEvent" DROP COLUMN IF EXISTS "isMeal";
