# 🔒 Backup-System

Einfaches Backup-System: Git für Code, PostgreSQL Dumps für Datenbank.

## 📋 Übersicht

### Code-Backups
- **Methode**: Git Commits (zu GitHub pushen)
- **Zurückkehren**: `git checkout <commit-hash>` oder `git reset --hard <commit-hash>`
- **Vorteil**: Bereits vorhanden, keine zusätzlichen Tags nötig

### Datenbank-Backups
- **Methode**: PostgreSQL Dumps
- **Format**: `db_backup_YYYYMMDD_HHMMSS.sql.gz` (komprimiert)
- **Speicherort**: `./backups/db/`

---

## 🚀 Schnellstart

### Backup vor Änderungen (empfohlen)
```bash
npm run backup
```

Das macht:
1. Committet uncommitted changes (optional)
2. Pusht zu GitHub (optional)
3. Erstellt DB-Backup

### Nur Datenbank-Backup
```bash
npm run backup:db
```

---

## 📦 Backup erstellen

### Einfaches Backup (Code + DB)

```bash
npm run backup
```

**Was passiert:**
- Prüft auf uncommitted changes
- Committet diese (optional)
- Pusht zu GitHub (optional)
- Erstellt DB-Backup

**Code wiederherstellen:**
```bash
# Zeige Commit-History
git log --oneline -10

# Zurück zu einem Commit
git checkout <commit-hash>

# Oder zurück zum neuesten Stand
git checkout main
git pull origin main
```

### Nur Datenbank-Backup

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

### Code wiederherstellen (via Git)

```bash
# 1. Zeige Commit-History
git log --oneline -20

# 2. Zurück zu einem Commit
git checkout <commit-hash>

# 3. Oder zurück zum neuesten Stand
git checkout main
git pull origin main

# 4. Falls du den Code überschreiben willst (ACHTUNG!)
git reset --hard <commit-hash>
```

**Oder via GitHub:**
- Gehe zu GitHub → Commits
- Kopiere Commit-Hash
- `git checkout <commit-hash>`

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
│   ├── backup-before-change.sh  # Einfaches Backup (Code + DB)
│   ├── backup-db.sh             # Nur DB-Backup
│   └── restore-db.sh            # DB wiederherstellen
├── backups/
│   └── db/
│       ├── db_backup_20250120_143022.sql.gz
│       ├── db_backup_20250120_150000.sql.gz
│       └── latest.sql.gz -> db_backup_20250120_150000.sql.gz
└── .git/
    └── (Git Commits = Code-Backups)
```

---

## ⚠️ Wichtige Hinweise

### Vor größeren Änderungen

**IMMER vorher ein Backup erstellen:**

```bash
# Einfaches Backup (Code + DB)
npm run backup
```

Das committet deine Änderungen und erstellt ein DB-Backup.

### Datenbank-Restore

- **⚠️ Überschreibt die komplette Datenbank!**
- Alle aktuellen Daten gehen verloren
- Nur verwenden wenn wirklich nötig

### Code-Restore

- **⚠️ `git reset --hard` überschreibt aktuellen Code!**
- Uncommitted changes gehen verloren
- Sicherer: `git checkout <commit>` (kannst zurück mit `git checkout main`)

---

## 🔧 Workflow-Beispiel

### Vor Änderungen (egal ob Code oder DB)

```bash
# 1. Backup erstellen
npm run backup

# 2. Änderungen machen
# ... Schema ändern, Code ändern, etc.

# 3. Testen
npm run build
npm run start

# 4. Falls Probleme:
# Code: git checkout <commit-hash>
# DB: npm run restore:db
```

### Code wiederherstellen

```bash
# 1. Zeige Commits
git log --oneline -10

# 2. Zurück zu einem Commit
git checkout abc1234

# 3. Testen

# 4. Zurück zum neuesten Stand
git checkout main
git pull origin main
```

---

## 🛠️ Manuelle Befehle

### Git Commits anzeigen

```bash
# Kompakt
git log --oneline -20

# Mit Datum
git log --pretty=format:"%h - %an, %ar : %s" -10

# Mit Graph
git log --oneline --graph -10
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

### Zu GitHub zurückkehren

```bash
# Zeige Remote-Commits
git log origin/main --oneline -10

# Zurück zu einem Remote-Commit
git checkout <commit-hash>
```

---

## 📊 Backup-Verwaltung

### Alte Backups löschen

**Code-Backups:**
- Git Commits bleiben für immer (kostenlos)
- Keine Löschung nötig

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
# 1. Code wiederherstellen (von GitHub)
git log --oneline -20  # Zeige Commits
git checkout <commit-hash>  # Oder: git checkout main

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

1. **Vor jeder größeren Änderung**: `npm run backup`
2. **Immer zu GitHub pushen**: Code ist dann sicher
3. **DB-Backups regelmäßig**: Täglich oder wöchentlich
4. **Backups testen**: Ab und zu Restore testen
5. **Commit-Messages**: Beschreibend schreiben (z.B. "vor DB-Änderungen")

---

## ❓ FAQ

**Q: Wie oft sollte ich Backups erstellen?**
A: Vor jeder größeren Änderung mit `npm run backup`

**Q: Wo werden Backups gespeichert?**
A: Code: Git Commits (GitHub), DB: `./backups/db/`

**Q: Kann ich Backups automatisch erstellen?**
A: Ja, DB-Backups mit Cron-Job (siehe unten). Code: Einfach regelmäßig committen + pushen

**Q: Wie groß werden die Backups?**
A: DB-Backups sind komprimiert (meist < 10MB), Code: Git Commits (sehr klein)

**Q: Wie komme ich zu einem alten Commit zurück?**
A: `git log --oneline` → `git checkout <hash>` → Testen → `git checkout main` zum Zurückkehren

---

## 🤖 Automatische Backups (Cron)

### Tägliches DB-Backup

```bash
# Crontab bearbeiten
crontab -e

# Täglich um 2 Uhr morgens (nur DB, Code wird via Git gemanaged)
0 2 * * * cd /var/www/sinispace-v2 && npm run backup:db
```

### Wöchentliches DB-Backup

```bash
# Jeden Sonntag um 3 Uhr
0 3 * * 0 cd /var/www/sinispace-v2 && npm run backup:db
```

---

## 📝 Changelog

- **2025-01-20**: Backup-System vereinfacht
  - Code-Backups via Git Commits (keine Tags nötig)
  - Datenbank-Backups via PostgreSQL Dumps
  - Einfaches `npm run backup` für beides
