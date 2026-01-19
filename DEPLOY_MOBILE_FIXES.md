# Server-Befehle: Mobile Layout Fixes deployen

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

### Safe Area funktioniert nicht auf iPhone
```bash
# Prüfen ob env() CSS-Funktion unterstützt wird
# Moderne Browser sollten das unterstützen

# Testen auf echtem iPhone oder mit Safari DevTools
# Die env() Variablen funktionieren nur in unterstützten Browsern
```

---

## 🎯 Was wurde gefixt?

### 1. ✅ Safe Area Top (Header nicht mehr gequetscht)
- Dashboard: `pt-[calc(env(safe-area-inset-top)+1rem)]` auf Mobile
- Settings: `pt-[calc(env(safe-area-inset-top)+1rem)]` auf Mobile
- Desktop: Kein zusätzliches Padding (`md:pt-0`)

### 2. ✅ Chat Input Overlap behoben
- Chat Page: `pb-[calc(4rem+env(safe-area-inset-bottom))]` auf Mobile
- Chat [id] Page: `pb-[calc(4rem+env(safe-area-inset-bottom))]` auf Mobile
- Desktop: Kein zusätzliches Padding (`md:pb-0`)
- 4rem = 64px (Höhe der Bottom Nav)

### 3. ✅ SiniChat Hero Button
- Neuer Stil: Herausragender Kreis mit Gradient
- Größe: `h-14 w-14` (größer als normale Buttons)
- Position: `-top-4` (ragt aus der Nav Bar heraus)
- Styling: Gradient (`from-teal-500 to-indigo-500`), Shadow, Border
- Icon: `h-7 w-7` (größer), weiß

---

## 📱 Mobile Experience Verbesserungen

**Vorher:**
- ❌ Header klebte unter der Statusleiste
- ❌ Chat-Eingabe wurde von Bottom Nav überdeckt
- ❌ SiniChat Button war nicht prominent genug

**Jetzt:**
- ✅ Header hat Abstand zur Statusleiste (Safe Area)
- ✅ Chat-Eingabe ist vollständig sichtbar
- ✅ SiniChat Button ist prominent und herausragend
- ✅ Premium-Feeling auf allen iPhones

---

## 📝 Zusammenfassung

**Ein-Zeilen-Deploy:**
```bash
cd /var/www/sinispace-v2 && git pull origin main && npm install && npm run build && pm2 restart all && pm2 save
```

**Fertig!** 🎉
