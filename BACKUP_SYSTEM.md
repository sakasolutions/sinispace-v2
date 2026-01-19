# 🔒 Backup-System

Dieses Backup-System ermöglicht es, sowohl Code als auch Datenbank-Backups zu erstellen und wiederherzustellen.

## 📋 Übersicht

### Code-Backups
- **Methode**: Git Tags
- **Format**: `backup_YYYYMMDD_HHMMSS`
- **Speicherort**: Git Repository (lokal + optional GitHub)

### Datenbank-Backups
- **Methode**: PostgreSQL Dumps
- **Format**: `db_backup_YYYYMMDD_HHMMSS.sql.gz` (komprimiert)
- **Speicherort**: `./backups/db/`

---

## 🚀 Schnellstart

### Komplettes Backup (Code + DB)
```bash
npm run backup:all
```

### Nur Code-Backup
```bash
npm run backup:code
```

### Nur Datenbank-Backup
```bash
npm run backup:db
```

---

## 📦 Backup erstellen

### 1. Code-Backup

Erstellt einen Git Tag für den aktuellen Stand:

```bash
bash scripts/backup-code.sh
```

**Was passiert:**
- Prüft auf uncommitted changes
- Erstellt Git Tag: `backup_20250120_143022`
- Optional: Push zu GitHub

**Wiederherstellen:**
```bash
npm run restore:code
# oder
bash scripts/restore-code.sh
```

### 2. Datenbank-Backup

Erstellt einen PostgreSQL Dump:

```bash
bash scripts/backup-db.sh
```

**Was passiert:**
- Liest `DATABASE_URL` aus `.env`
- Erstellt SQL Dump der kompletten DB
- Komprimiert zu `.sql.gz`
- Speichert in `./backups/db/`
- Erstellt Symlink `latest.sql.gz`

**Wiederherstellen:**
```bash
npm run restore:db
# oder
bash scripts/restore-db.sh
```

---

## 🔄 Wiederherstellen

### Code wiederherstellen

```bash
npm run restore:code
```

**Schritte:**
1. Zeigt verfügbare Backup-Tags
2. Wähle Backup aus
3. Checkout zu diesem Tag

**Nach dem Restore:**
```bash
# Zurück zum neuesten Stand
git checkout main
git pull origin main
```

### Datenbank wiederherstellen

```bash
npm run restore:db
```

**Schritte:**
1. Zeigt verfügbare Backups
2. Wähle Backup aus
3. **WARNUNG**: Überschreibt komplette DB!
4. Bestätige mit `yes`

---

## 📁 Verzeichnisstruktur

```
sinispacev2/
├── scripts/
│   ├── backup-code.sh      # Code-Backup erstellen
│   ├── backup-db.sh        # DB-Backup erstellen
│   ├── backup-all.sh       # Komplettes Backup
│   ├── restore-code.sh     # Code wiederherstellen
│   └── restore-db.sh       # DB wiederherstellen
├── backups/
│   └── db/
│       ├── db_backup_20250120_143022.sql.gz
│       ├── db_backup_20250120_150000.sql.gz
│       └── latest.sql.gz -> db_backup_20250120_150000.sql.gz
└── .git/
    └── refs/tags/
        ├── backup_20250120_143022
        └── backup_20250120_150000
```

---

## ⚠️ Wichtige Hinweise

### Vor größeren Änderungen

**IMMER vorher ein Backup erstellen:**

```bash
# Komplettes Backup
npm run backup:all

# Oder einzeln
npm run backup:code
npm run backup:db
```

### Datenbank-Restore

- **⚠️ Überschreibt die komplette Datenbank!**
- Alle aktuellen Daten gehen verloren
- Nur verwenden wenn wirklich nötig

### Code-Restore

- **⚠️ Überschreibt aktuellen Code!**
- Uncommitted changes gehen verloren
- Kann mit `git stash` gesichert werden

---

## 🔧 Workflow-Beispiel

### Vor Datenbank-Änderungen

```bash
# 1. Backup erstellen
npm run backup:all

# 2. Änderungen machen
# ... Schema ändern, Migrationen, etc.

# 3. Testen
npm run build
npm run start

# 4. Falls Probleme:
npm run restore:db    # DB wiederherstellen
npm run restore:code  # Code wiederherstellen
```

### Vor Code-Änderungen

```bash
# 1. Code-Backup
npm run backup:code

# 2. Änderungen machen
# ... Code ändern, Features hinzufügen

# 3. Testen
npm run dev

# 4. Falls Probleme:
npm run restore:code  # Code wiederherstellen
```

---

## 🛠️ Manuelle Befehle

### Git Tags anzeigen

```bash
git tag -l "backup_*"
```

### Backup-Dateien anzeigen

```bash
ls -lh backups/db/
```

### Neuestes DB-Backup wiederherstellen

```bash
# Direkt latest.sql.gz verwenden
gunzip -c backups/db/latest.sql.gz | psql $DATABASE_URL
```

### Git Tag löschen

```bash
git tag -d backup_20250120_143022
git push origin :refs/tags/backup_20250120_143022  # Remote löschen
```

---

## 📊 Backup-Verwaltung

### Alte Backups löschen

**Code-Backups (Git Tags):**
```bash
# Alle Backup-Tags anzeigen
git tag -l "backup_*"

# Tag löschen
git tag -d backup_YYYYMMDD_HHMMSS
```

**Datenbank-Backups:**
```bash
# Alte Backups löschen (z.B. älter als 30 Tage)
find backups/db/ -name "*.sql.gz" -mtime +30 -delete
```

### Backup-Größe prüfen

```bash
du -sh backups/db/
```

---

## 🚨 Notfall-Wiederherstellung

### Kompletter System-Restore

```bash
# 1. Code wiederherstellen
npm run restore:code
# Wähle gewünschten Tag

# 2. Dependencies installieren
npm install

# 3. Prisma Client generieren
npx prisma generate

# 4. Datenbank wiederherstellen
npm run restore:db
# Wähle passendes Backup

# 5. Builden und starten
npm run build
pm2 restart sinispace
```

---

## 💡 Best Practices

1. **Vor jeder größeren Änderung**: Backup erstellen
2. **Regelmäßige Backups**: Täglich oder wöchentlich
3. **Backups testen**: Ab und zu Restore testen
4. **Backups extern speichern**: Nicht nur lokal
5. **Backup-Versionen**: Nicht zu viele alte Backups behalten

---

## ❓ FAQ

**Q: Wie oft sollte ich Backups erstellen?**
A: Vor jeder größeren Änderung + regelmäßig (täglich/wöchentlich)

**Q: Wo werden Backups gespeichert?**
A: Code: Git Tags (lokal + GitHub), DB: `./backups/db/`

**Q: Kann ich Backups automatisch erstellen?**
A: Ja, mit Cron-Job (siehe unten)

**Q: Wie groß werden die Backups?**
A: DB-Backups sind komprimiert (meist < 10MB), Code-Backups sind Git Tags (sehr klein)

---

## 🤖 Automatische Backups (Cron)

### Tägliches Backup

```bash
# Crontab bearbeiten
crontab -e

# Täglich um 2 Uhr morgens
0 2 * * * cd /var/www/sinispace-v2 && npm run backup:all
```

### Wöchentliches Backup

```bash
# Jeden Sonntag um 3 Uhr
0 3 * * 0 cd /var/www/sinispace-v2 && npm run backup:all
```

---

## 📝 Changelog

- **2025-01-20**: Initiales Backup-System erstellt
  - Code-Backups via Git Tags
  - Datenbank-Backups via PostgreSQL Dumps
  - Restore-Scripts für beide
