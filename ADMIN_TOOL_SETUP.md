# Admin-Tool Setup - Dauerhafter Browser-Zugriff

## Problem gelöst ✅

Du hast jetzt volle Kontrolle über die Datenbank über den Browser!

## Schnellstart

### 1. Admin-Tool starten

```bash
cd /var/www/sinispace-v2
git pull origin main
npm run db:admin
```

Dann öffne: `http://localhost:3001` (oder deine Server-IP:3001)

**Passwort:** `admin123` (⚠️ ÄNDERE DAS in `admin-db.js`!)

---

## Dauerhaft laufen lassen (mit PM2)

### Schritt 1: PM2 Config erweitern

Füge zum `ecosystem.config.js` hinzu:

```javascript
module.exports = {
  apps: [
    {
      name: 'sinispace',
      script: 'npm',
      args: 'start',
      // ... deine bestehende Config
    },
    {
      name: 'db-admin',
      script: 'node',
      args: 'admin-db.js',
      cwd: '/var/www/sinispace-v2',
      env: {
        NODE_ENV: 'production',
        ADMIN_PORT: 3001,
      },
      error_file: '/root/.pm2/logs/db-admin-error.log',
      out_file: '/root/.pm2/logs/db-admin-out.log',
    }
  ]
};
```

### Schritt 2: PM2 starten

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Falls noch nicht gemacht
```

### Schritt 3: Prüfen

```bash
pm2 status
pm2 logs db-admin
```

---

## Features des Admin-Tools

### ✅ Tabellen-Übersicht
- Zeige alle Tabellen
- Prüfe Rechte (SELECT, INSERT, UPDATE, DELETE, ALTER)
- URL: `http://localhost:3001/tables`

### ✅ SQL Query ausführen
- **Alle SQL-Befehle erlaubt!**
- SELECT, INSERT, UPDATE, DELETE, ALTER, etc.
- Direkt im Browser

### ✅ Schnellzugriffe
- User Premium setzen
- Daten ändern
- Tabellen ändern
- Alles über SQL

---

## WICHTIG: Tabellennamen

**Prisma nutzt Großbuchstaben!** Nutze immer:

- ✅ `"User"` (nicht `user` oder `account`)
- ✅ `"Account"` (nicht `account`)
- ✅ `"Session"` (nicht `session`)
- ✅ `"Chat"` (nicht `chat`)
- ✅ `"Message"` (nicht `message`)
- ✅ `"Document"` (nicht `document`)

**Beispiel:**
```sql
-- ✅ RICHTIG
SELECT * FROM "User" WHERE email = 'test@example.com';

-- ❌ FALSCH
SELECT * FROM user WHERE email = 'test@example.com';
```

---

## Häufige Queries

### User Premium setzen
```sql
UPDATE "User" 
SET "subscriptionEnd" = '2025-12-31' 
WHERE email = 'user@example.com';
```

### Alle User anzeigen
```sql
SELECT id, email, "subscriptionEnd", "createdAt" 
FROM "User" 
ORDER BY "createdAt" DESC;
```

### Chats eines Users
```sql
SELECT * FROM "Chat" 
WHERE "userId" = 'USER_ID_HIER';
```

### Alte Sessions löschen
```sql
DELETE FROM "Session" 
WHERE expires < NOW();
```

### Spalte hinzufügen
```sql
ALTER TABLE "Chat" 
ADD COLUMN "isArchived" BOOLEAN DEFAULT false;
```

---

## Sicherheit

⚠️ **WICHTIG:**
- Ändere das Passwort in `admin-db.js`!
- Nutze es nur über SSH-Tunnel oder VPN!
- Niemals öffentlich zugänglich machen!
- Nur für lokalen/Server-Zugriff!

### Passwort ändern

In `admin-db.js` Zeile 8:
```javascript
const ADMIN_PASSWORD = 'dein_sicheres_passwort_hier';
```

---

## Troubleshooting

### Port 3001 bereits belegt
```bash
# Prüfe was auf Port 3001 läuft
netstat -tuln | grep 3001

# Oder ändere Port in admin-db.js
const PORT = process.env.ADMIN_PORT || 3002;
```

### Admin-Tool startet nicht
```bash
# Prüfe ob alle Dependencies installiert sind
npm install

# Prüfe Logs
pm2 logs db-admin
```

### Datenbank-Verbindung fehlt
```bash
# Prüfe .env Datei
cat .env | grep DATABASE_URL

# Prüfe ob Datenbank läuft
bash scripts/check-db-permissions.sh
```

---

## Zugriff von außen (optional)

**NUR wenn sicher!** In `admin-db.js` ändern:

```javascript
app.listen(PORT, '0.0.0.0', () => {
  // ...
});
```

Dann über Firewall/NGINX zugänglich machen (mit Passwort-Schutz!).

---

## Zusammenfassung

✅ **Du hast jetzt:**
- Volle Kontrolle über die Datenbank
- Browser-basiertes Admin-Tool
- Tabellen-Übersicht
- SQL Query-Editor
- Schnellzugriffe für häufige Operationen

🎉 **Fertig!** Du kannst jetzt alle Daten über den Browser ändern!
