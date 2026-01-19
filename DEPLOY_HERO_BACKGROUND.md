# Server-Befehle: Hero Background Update deployen

## 🚀 Schnell-Deploy

```bash
# Auf dem Server (als root)
cd /var/www/sinispace-v2
git pull origin main
npm install
npm run build
pm2 restart sinispace
pm2 restart db-admin
pm2 save
```

---

## 📋 Schritt-für-Schritt

### 1. Code holen
```bash
cd /var/www/sinispace-v2
git pull origin main
```

### 2. Dependencies prüfen (falls nötig)
```bash
npm install
```

### 3. Build erstellen
```bash
npm run build
```

### 4. PM2 neu starten
```bash
# Haupt-App neu starten
pm2 restart sinispace

# Admin-Tool neu starten (falls läuft)
pm2 restart db-admin

# Status prüfen
pm2 status

# Logs anschauen
pm2 logs sinispace --lines 50
```

### 5. PM2 speichern (für Auto-Start)
```bash
pm2 save
```

---

## ✅ Prüfen ob alles läuft

```bash
# PM2 Status
pm2 status

# App-Logs
pm2 logs sinispace --lines 20

# Admin-Logs (falls aktiv)
pm2 logs db-admin --lines 20

# Ports prüfen
netstat -tuln | grep -E '3000|3001'
```

**Erwartung:**
- Port 3000: sinispace (Haupt-App)
- Port 3001: db-admin (Admin-Tool, optional)

---

## 🐛 Falls Probleme

### Build fehlgeschlagen
```bash
# Node Version prüfen
node -v  # Sollte v18+ sein

# Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install
npm run build
```

### PM2 startet nicht
```bash
# PM2 Logs prüfen
pm2 logs sinispace --err

# Manuell starten
pm2 start ecosystem.config.js --update-env
```

### Background wird nicht angezeigt
```bash
# Browser Cache leeren (Strg+Shift+R oder Cmd+Shift+R)
# Oder im Inkognito-Modus testen

# Prüfen ob neue Komponente deployed wurde
ls -la components/ui/hero-background.tsx
```

---

## 🎯 Was wurde geändert?

- ✅ Hero Background auf alle Seiten angewendet
- ✅ Neue Komponente: `components/ui/hero-background.tsx`
- ✅ Grid-Pattern + Glows auf allen Seiten
- ✅ Einfache Rollback-Option (siehe `HERO_BACKGROUND_ROLLBACK.md`)

---

## 🔄 Zurück zum alten Stand (falls nötig)

Falls der Background nicht gefällt:

1. Auf Server: `components/ui/hero-background.tsx` öffnen
2. Zeile 15 ändern: `const USE_HERO_BACKGROUND = false;`
3. PM2 neu starten: `pm2 restart sinispace`

Oder siehe: `HERO_BACKGROUND_ROLLBACK.md`

---

## 📝 Zusammenfassung

**Ein-Zeilen-Deploy:**
```bash
cd /var/www/sinispace-v2 && git pull origin main && npm install && npm run build && pm2 restart all && pm2 save
```

**Fertig!** 🎉
