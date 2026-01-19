# 🗄️ Datenbank-Migration Guide

Sichere Schritt-für-Schritt Anleitung für die Datenbank-Optimierung.

---

## ⚠️ WICHTIG: Login/Logout/Premium bleiben unverändert!

Alle kritischen Funktionen bleiben erhalten:
- ✅ `subscriptionEnd` - Premium-Check funktioniert weiterhin
- ✅ Login/Logout - Keine Änderungen
- ✅ Sessions - Funktionieren weiterhin

---

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: Backup erstellen

```bash
npm run backup
```

Oder manuell:
```bash
npm run backup:db
```

---

### Schritt 2: SQL-Migration ausführen (auf Server)

**Im Terminal 2 (auf dem Server):**

```bash
cd /var/www/sinispace-v2

# Neuesten Code holen
git pull origin main

# SQL-Migration direkt ausführen (umgeht Prisma Migrate)
bash scripts/apply-db-migration.sh
```

**Oder manuell per SQL:**
```bash
# SQL-Script direkt ausführen
psql $DATABASE_URL -f scripts/add-db-columns.sql
```

---

### Schritt 3: Schema aktualisieren

**Lokal (oder auf Server):**

Das Schema wird automatisch aktualisiert, wenn du den neuesten Code pullst.

---

### Schritt 4: Prisma Client neu generieren

**Im Terminal 2 (auf dem Server):**

```bash
npx prisma generate
```

---

### Schritt 5: Builden und neu starten

```bash
rm -rf .next
npm run build
pm2 restart sinispace
```

---

## ✅ Was wird hinzugefügt?

### User
- `isActive` (Boolean) - User manuell deaktivieren
- `notes` (Text) - Admin-Notizen

### Session
- `ipAddress` (Text) - IP-Adresse für Sicherheit
- `userAgent` (Text) - Welches Gerät/Browser
- `isActive` (Boolean) - Session manuell deaktivieren

### Chat
- `expiresAt` (DateTime) - Explizites Ablaufdatum
- `isArchived` (Boolean) - Manuell archivieren
- `isDeleted` (Boolean) - Soft Delete

### Message
- `tokenCount` (Integer) - Anzahl Tokens (für Kosten-Tracking)
- `modelUsed` (Text) - Welches Modell verwendet wurde

### Document
- `isDeleted` (Boolean) - Soft Delete

### AdminLog (NEU)
- Neue Tabelle für Admin-Logging

---

## 🔄 Rollback (falls Probleme)

```bash
# Code zurückrollen
npm run rollback
# → Wähle Commit VOR der Migration

# Prisma Client neu generieren
npx prisma generate

# Builden und neu starten
rm -rf .next
npm run build
pm2 restart sinispace
```

**Hinweis:** Die Spalten bleiben in der DB, aber der Code verwendet sie nicht mehr.

---

## 🛠️ Manuelle SQL-Ausführung

Falls das Script nicht funktioniert, kannst du die SQL direkt ausführen:

```bash
# Im DB Admin Tool (localhost:3001)
# → SQL Query ausführen
# → Kopiere Inhalt von scripts/add-db-columns.sql
# → Führe aus
```

---

## ✅ Nach erfolgreicher Migration

Die neuen Felder sind verfügbar:
- Im DB Admin Tool sichtbar
- Im Code verwendbar
- Login/Logout/Premium funktionieren weiterhin

---

## 🚨 Troubleshooting

**Problem: "must be owner of table"**
- Lösung: SQL-Script direkt ausführen (umgeht Prisma Migrate)

**Problem: "column does not exist"**
- Lösung: Migration nochmal ausführen

**Problem: Login funktioniert nicht**
- Lösung: Rollback → Code zurückrollen
