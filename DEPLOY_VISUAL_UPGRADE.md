# Server-Befehle: Visual Upgrade deployen

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

### Fonts werden nicht geladen
```bash
# Browser Cache leeren (Strg+Shift+R oder Cmd+Shift+R)
# Oder im Inkognito-Modus testen

# Prüfen ob neue Fonts deployed wurden
ls -la .next/server/app/layout.js
```

### Noise Texture wird nicht angezeigt
```bash
# Prüfen ob die URL erreichbar ist
curl -I https://grainy-gradients.vercel.app/noise.svg

# Falls nicht, kann man eine lokale Alternative nutzen
# (Dann müsste man die Datei lokal hosten)
```

---

## 🎯 Was wurde geändert?

- ✅ **Typography**: Plus Jakarta Sans für Headings, Inter mit tracking-wide
- ✅ **Background**: Noise Texture Overlay für Tiefe
- ✅ **Cards**: Spotlight-Effekt mit radialem Gradient Glow
- ✅ **Icons**: Leuchteffekte mit drop-shadow
- ✅ **Polish**: Fettere Titel, weichere Transitions

---

## 📝 Zusammenfassung

**Ein-Zeilen-Deploy:**
```bash
cd /var/www/sinispace-v2 && git pull origin main && npm install && npm run build && pm2 restart all && pm2 save
```

**Fertig!** 🎉
