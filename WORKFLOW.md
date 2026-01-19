# 🚀 Workflow-Guide

Einfacher Workflow für sichere Änderungen.

---

## 📋 Standard-Workflow

### 1. Vor Änderungen: Backup

```bash
npm run backup
```

Oder automatisch mit Deployment:

```bash
npm run deploy
```

---

### 2. Änderungen machen

```bash
# Code ändern
# ... deine Änderungen ...

# Lokal testen
npm run dev
```

---

### 3. Deployen

```bash
npm run deploy
```

Das macht:
- ✅ Backup erstellen
- ✅ Änderungen committen
- ✅ Zu GitHub pushen
- ✅ Zeigt Server-Build-Befehle

---

### 4. Server-Build

Kopiere die Befehle vom `deploy` Script und führe sie auf dem Server aus:

```bash
cd /var/www/sinispace-v2
git pull origin main
npm install
npx prisma generate
rm -rf .next
npm run build
pm2 restart sinispace
```

**Oder als ein Befehl:**
```bash
cd /var/www/sinispace-v2 && git pull origin main && npm install && npx prisma generate && rm -rf .next && npm run build && pm2 restart sinispace
```

---

## ⏪ Rollback (wenn etwas schiefgeht)

### Code-Rollback

```bash
npm run rollback
```

Das macht:
- Zeigt letzte Commits
- Wähle Commit aus
- Stellt Code wieder her
- Zeigt Server-Build-Befehle

**Oder manuell:**
```bash
# Zeige Commits
git log --oneline -10

# Zurück zu einem Commit
git checkout <commit-hash>

# Auf Server:
cd /var/www/sinispace-v2
git checkout <commit-hash>
npm install
npx prisma generate
rm -rf .next
npm run build
pm2 restart sinispace
```

### Datenbank-Rollback

```bash
npm run restore:db
```

---

## 📝 Beispiel: Landingpage ändern

```bash
# 1. Deploy (macht Backup + Commit + Push)
npm run deploy

# 2. Änderungen machen
# ... Landingpage Code ändern ...

# 3. Testen
npm run dev

# 4. Nochmal deployen (committet neue Änderungen)
npm run deploy

# 5. Server-Build (Befehle werden angezeigt)
# Kopiere Befehle → Auf Server ausführen

# 6. Falls Probleme:
npm run rollback
# → Wähle Backup-Commit
# → Kopiere Server-Befehle → Auf Server ausführen
```

---

## 🛠️ Verfügbare Scripts

| Script | Befehl | Beschreibung |
|--------|--------|--------------|
| Backup | `npm run backup` | Backup erstellen (Code + DB) |
| Deploy | `npm run deploy` | Backup → Commit → Push → Server-Befehle |
| Rollback | `npm run rollback` | Code zu früherem Commit zurück |
| DB Backup | `npm run backup:db` | Nur Datenbank-Backup |
| DB Restore | `npm run restore:db` | Datenbank wiederherstellen |

---

## ✅ Checkliste

### Vor Änderungen
- [ ] `npm run backup` oder `npm run deploy`
- [ ] Code zu GitHub gepusht

### Nach Änderungen
- [ ] Lokal getestet (`npm run dev`)
- [ ] `npm run deploy` ausgeführt
- [ ] Server-Build durchgeführt

### Bei Problemen
- [ ] `npm run rollback` (Code)
- [ ] `npm run restore:db` (Datenbank)

---

## 🚨 Notfall-Workflow

### Kompletter Rollback

```bash
# 1. Code-Rollback
npm run rollback
# → Wähle Backup-Commit

# 2. Server-Build
# → Kopiere Befehle vom Script

# 3. Falls DB-Problem:
npm run restore:db
```

---

## 💡 Tipps

1. **Immer zuerst deployen** - dann sind Änderungen sicher
2. **Lokal testen** - bevor du auf Server baust
3. **Commit-Messages beschreibend** - z.B. "FEAT: Landingpage verbessert"
4. **Bei Unsicherheit: Rollback** - schnell zurück zum Backup

---

## 📊 Workflow-Visualisierung

```
┌─────────────────┐
│  npm run deploy │  ← Start hier
└────────┬────────┘
         │
         ├─→ Backup erstellen
         ├─→ Änderungen committen
         ├─→ Zu GitHub pushen
         └─→ Server-Befehle anzeigen
              │
              ▼
    ┌─────────────────┐
    │  Server-Build   │  ← Auf Server ausführen
    └─────────────────┘
              │
         ┌────┴────┐
         │         │
    ✅ Erfolg  ❌ Problem
         │         │
         │         └─→ npm run rollback
         │
    ✅ Fertig!
```

---

## ❓ FAQ

**Q: Muss ich immer `npm run deploy` verwenden?**
A: Ja, das ist am sichersten. Es macht Backup + Commit + Push automatisch.

**Q: Was wenn ich nur lokal testen will?**
A: Einfach `npm run dev` - kein Deploy nötig.

**Q: Wie oft sollte ich deployen?**
A: Nach jeder funktionierenden Änderung, bevor du auf Server baust.

**Q: Was wenn der Server-Build fehlschlägt?**
A: `npm run rollback` → Wähle letzten funktionierenden Commit.
