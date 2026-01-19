# Datenbank-Berechtigungen - Volle Kontrolle

## Problem
Du kannst nichts in der Datenbank ändern, weil der Datenbank-User nicht die nötigen Rechte hat.

## Lösung 1: Rechte prüfen

```bash
# Auf dem Server
cd /var/www/sinispace-v2
git pull origin main
bash scripts/check-db-permissions.sh
```

Das zeigt dir:
- Welcher User verwendet wird
- Ob er Superuser ist
- Welche Rechte er hat (CREATE, ALTER, INSERT, UPDATE, DELETE)

## Lösung 2: Rechte automatisch erhöhen

```bash
# Auf dem Server (als root oder mit sudo)
cd /var/www/sinispace-v2
git pull origin main
bash scripts/grant-db-permissions.sh
```

**WICHTIG:** Dieses Script benötigt das Postgres Superuser-Passwort!

## Lösung 3: Rechte manuell erhöhen

Falls das automatische Script nicht funktioniert:

### Schritt 1: Als postgres User einloggen

```bash
# Auf dem Server
sudo -u postgres psql -d deine_datenbank_name
```

Oder wenn du das Postgres-Passwort kennst:
```bash
psql -h localhost -U postgres -d deine_datenbank_name
```

### Schritt 2: Rechte vergeben

In der PostgreSQL-Konsole:

```sql
-- Hole dir den Datenbank-User aus DATABASE_URL
-- (normalerweise steht er in .env)

-- Rechte auf alle bestehenden Tabellen
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "dein_db_user";

-- Rechte auf alle Sequenzen (für AUTO_INCREMENT)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "dein_db_user";

-- Rechte für zukünftige Tabellen
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "dein_db_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "dein_db_user";

-- Optional: Superuser-Rechte (NUR wenn wirklich nötig!)
-- ALTER USER "dein_db_user" WITH SUPERUSER;
```

### Schritt 3: Prüfen

```bash
bash scripts/check-db-permissions.sh
```

## Lösung 4: Admin-Tool mit voller Kontrolle

Das Admin-Tool (`admin-db.js`) wurde erweitert und erlaubt jetzt **alle SQL-Befehle**:

```bash
# Auf dem Server
cd /var/www/sinispace-v2
npm run db:admin
```

Dann öffne: `http://localhost:3001` (oder deine Server-IP:3001)

**WICHTIG:** Ändere das Passwort in `admin-db.js`!

### Was du jetzt machen kannst:

- ✅ **SELECT** - Daten lesen
- ✅ **INSERT** - Daten einfügen
- ✅ **UPDATE** - Daten ändern
- ✅ **DELETE** - Daten löschen
- ✅ **ALTER TABLE** - Tabellen ändern (Spalten hinzufügen/löschen)
- ✅ **CREATE TABLE** - Neue Tabellen erstellen
- ✅ **DROP TABLE** - Tabellen löschen

### Beispiel-Queries:

```sql
-- User Premium setzen
UPDATE "User" SET "subscriptionEnd" = '2025-12-31' WHERE email = 'user@example.com';

-- Spalte hinzufügen
ALTER TABLE "Chat" ADD COLUMN "isArchived" BOOLEAN DEFAULT false;

-- Daten ändern
UPDATE "Chat" SET title = 'Neuer Titel' WHERE id = 'chat_id';

-- Daten löschen
DELETE FROM "Session" WHERE expires < NOW();
```

## Welche Lösung solltest du verwenden?

1. **Wenn du Zugriff auf postgres User hast:** Lösung 2 oder 3
2. **Wenn du keinen Superuser-Zugriff hast:** Lösung 4 (Admin-Tool)
3. **Wenn du unsicher bist:** Lösung 1 (erst prüfen)

## Sicherheit

⚠️ **WICHTIG:** 
- Das Admin-Tool ist nur für lokalen Zugriff gedacht!
- Ändere das Passwort in `admin-db.js`!
- Nutze es nur über SSH-Tunnel oder VPN!
- Niemals öffentlich zugänglich machen!

## Troubleshooting

### "must be owner of table"
→ Du hast nicht die nötigen Rechte. Führe Lösung 2 oder 3 aus.

### "permission denied for schema public"
→ Rechte fehlen. Führe Lösung 2 oder 3 aus.

### "relation does not exist"
→ Tabelle existiert nicht oder falscher Name. Prüfe mit:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Admin-Tool funktioniert nicht
→ Prüfe ob Port 3001 frei ist:
```bash
netstat -tuln | grep 3001
```
