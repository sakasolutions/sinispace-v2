-- AddColumn: isAdmin Flag zu User-Tabelle
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- WICHTIG: Markiere den aktuellen Admin-User (basierend auf ADMIN_EMAIL aus .env)
-- Dieser Befehl muss manuell angepasst werden mit der tatsächlichen Admin-E-Mail
-- Beispiel: UPDATE "User" SET "isAdmin" = true WHERE "email" = 'kontakt@saka-it.de';
-- Wird in der Migration nicht automatisch ausgeführt, da .env nicht verfügbar ist

-- Index für schnelle Admin-Checks
CREATE INDEX "User_isAdmin_idx" ON "User"("isAdmin");
