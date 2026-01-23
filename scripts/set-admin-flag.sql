-- Script zum Setzen des Admin-Flags für den aktuellen Admin-User
-- WICHTIG: Ersetze 'kontakt@saka-it.de' mit der tatsächlichen Admin-E-Mail aus .env

-- Admin-Flag setzen basierend auf E-Mail
UPDATE "User" 
SET "isAdmin" = true 
WHERE "email" = 'kontakt@saka-it.de';

-- Prüfe ob Admin-Flag gesetzt wurde
SELECT id, email, "isAdmin" FROM "User" WHERE "isAdmin" = true;
