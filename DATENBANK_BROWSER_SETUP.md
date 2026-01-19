# Datenbank Browser-Zugriff einrichten - Schritt für Schritt

## 🎯 Ziel
Datenbank über den Browser verwalten können.

---

## 📋 Vorbereitung

### Terminal 1 & 2: Als root auf Server verbinden
```bash
ssh root@deine-server-ip
```

### Terminal 3: Als Mac-User (lokal)
```bash
# Bleibt auf deinem Mac
```

---

## 🔧 Schritt 1: Auf Server wechseln (Terminal 1 - root)

```bash
# Ins Projekt-Verzeichnis wechseln
cd /var/www/sinispace-v2

# Aktuellen Stand holen
git pull origin main

# Prüfen ob .env existiert und DATABASE_URL gesetzt ist
cat .env | grep DATABASE_URL
```

**✅ Erwartung:** Du solltest eine Zeile sehen wie:
```
DATABASE_URL="postgresql://user:password@host:5432/database"
```

---

## 🔧 Schritt 2: Dependencies prüfen (Terminal 1 - root)

```bash
# Prüfen ob node_modules existieren
ls -la node_modules | head -5

# Falls nicht, installieren
npm install
```

---

## 🔧 Schritt 3: Admin-Tool testen (Terminal 1 - root)

```bash
# Admin-Tool starten (läuft im Vordergrund)
npm run db:admin
```

**✅ Erwartung:** Du solltest sehen:
```
🔐 DB Admin läuft auf Port 3001
📊 Öffne: http://localhost:3001
⚠️  Passwort: admin123 (ÄNDERE DAS!)
```

**⚠️ WICHTIG:** Lass dieses Terminal offen! Drücke `Ctrl+C` um zu stoppen.

---

## 🔧 Schritt 4: Zugriff testen (Terminal 3 - Mac)

### Option A: SSH-Tunnel (SICHER - Empfohlen)

```bash
# SSH-Tunnel erstellen (Port 3001 vom Server zu lokalem Port 3001)
ssh -L 3001:localhost:3001 root@deine-server-ip -N

# Lass das Terminal offen!
```

Dann öffne im Browser: `http://localhost:3001`

### Option B: Direkt über Server-IP (nur wenn Firewall offen)

Im Browser öffnen: `http://deine-server-ip:3001`

**⚠️ WICHTIG:** Stelle sicher, dass Port 3001 in der Firewall offen ist!

---

## 🔧 Schritt 5: Im Browser einloggen

1. Öffne `http://localhost:3001` (oder Server-IP:3001)
2. Passwort eingeben: `admin123`
3. ✅ Du solltest jetzt das Admin-Dashboard sehen!

---

## 🔧 Schritt 6: Dauerhaft laufen lassen (Terminal 2 - root)

Jetzt machen wir es dauerhaft mit PM2:

```bash
# Ins Projekt-Verzeichnis wechseln
cd /var/www/sinispace-v2

# Aktuellen Stand holen
git pull origin main

# PM2 Config prüfen (sollte jetzt db-admin enthalten)
cat ecosystem.config.js
```

Falls `db-admin` noch nicht in der Config ist, füge es hinzu (siehe nächster Schritt).

---

## 🔧 Schritt 7: PM2 Config aktualisieren (falls nötig)

Die `ecosystem.config.js` sollte so aussehen:

```javascript
module.exports = {
  apps: [
    {
      name: 'sinispace',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/sinispace-v2',
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
      error_file: './logs/db-admin-error.log',
      out_file: './logs/db-admin-out.log',
    }
  ]
};
```

---

## 🔧 Schritt 8: Admin-Tool mit PM2 starten (Terminal 2 - root)

```bash
# PM2 starten/neu starten
pm2 start ecosystem.config.js --update-env

# Oder nur db-admin starten
pm2 start ecosystem.config.js --only db-admin

# Status prüfen
pm2 status

# Logs anschauen
pm2 logs db-admin
```

**✅ Erwartung:** Du solltest sehen:
```
┌─────────────┬────┬─────────┬──────┬──────────┐
│ App name    │ id │ version │ mode │ pid      │
├─────────────┼────┼─────────┼──────┼──────────┤
│ sinispace   │ 0  │ 0.1.0   │ fork │ 12345    │
│ db-admin    │ 1  │ N/A     │ fork │ 12346    │
└─────────────┴────┴─────────┴──────┴──────────┘
```

---

## 🔧 Schritt 9: PM2 Auto-Start einrichten (Terminal 2 - root)

```bash
# PM2 beim System-Start starten
pm2 save
pm2 startup

# Folge den Anweisungen (normalerweise einen Befehl kopieren und ausführen)
```

---

## ✅ Fertig! Testen

1. **Terminal 3 (Mac):** SSH-Tunnel starten (falls Option A):
   ```bash
   ssh -L 3001:localhost:3001 root@deine-server-ip -N
   ```

2. **Browser:** Öffne `http://localhost:3001`

3. **Login:** Passwort: `admin123`

4. **✅ Du kannst jetzt:**
   - Tabellen anzeigen
   - SQL-Queries ausführen
   - Daten ändern
   - User Premium setzen
   - Alles über den Browser!

---

## 🔒 Sicherheit: Passwort ändern

**WICHTIG:** Ändere das Passwort in `admin-db.js`:

```bash
# Auf Server (Terminal 1 oder 2 - root)
cd /var/www/sinispace-v2
nano admin-db.js

# Zeile 8 ändern:
# const ADMIN_PASSWORD = 'dein_sicheres_passwort_hier';

# Speichern (Ctrl+O, Enter, Ctrl+X)

# PM2 neu starten
pm2 restart db-admin
```

---

## 🐛 Troubleshooting

### Port 3001 bereits belegt
```bash
# Prüfen was auf Port 3001 läuft
netstat -tuln | grep 3001

# Oder Port ändern in admin-db.js
# const PORT = process.env.ADMIN_PORT || 3002;
```

### Admin-Tool startet nicht
```bash
# Logs anschauen
pm2 logs db-admin

# Prüfen ob DATABASE_URL gesetzt ist
cd /var/www/sinispace-v2
cat .env | grep DATABASE_URL

# Prüfen ob Dependencies installiert sind
npm install
```

### Datenbank-Verbindung fehlt
```bash
# Datenbank-Verbindung testen
cd /var/www/sinispace-v2
npm run db:test
```

### SSH-Tunnel funktioniert nicht
```bash
# Prüfen ob Port lokal belegt ist
lsof -i :3001

# Anderen Port verwenden
ssh -L 3002:localhost:3001 root@deine-server-ip -N
# Dann: http://localhost:3002
```

---

## 📝 Zusammenfassung

✅ **Du hast jetzt:**
- Admin-Tool läuft dauerhaft auf Port 3001
- Zugriff über Browser (via SSH-Tunnel oder direkt)
- Volle Kontrolle über die Datenbank
- Tabellen-Übersicht
- SQL Query-Editor

🎉 **Fertig!** Du kannst jetzt alle Daten über den Browser verwalten!
