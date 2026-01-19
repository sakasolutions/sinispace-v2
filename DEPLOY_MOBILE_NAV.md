# Server-Befehle: Mobile Navigation Update deployen

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

### Mobile Nav wird nicht angezeigt
```bash
# Browser Cache leeren (Strg+Shift+R oder Cmd+Shift+R)
# Oder im Inkognito-Modus testen

# Prüfen ob neue Komponente deployed wurde
ls -la components/mobile-nav.tsx

# Prüfen auf Mobile-Gerät oder mit DevTools (Mobile-Ansicht)
```

### Safe Area (iPhone Notch) funktioniert nicht
```bash
# Prüfen ob pb-[env(safe-area-inset-bottom)] in der Komponente ist
grep -r "safe-area-inset-bottom" components/mobile-nav.tsx
```

---

## 🎯 Was wurde geändert?

- ✅ **Mobile Navigation**: Fixed Bottom Nav Bar (wie Instagram/Spotify)
- ✅ **SiniChat Highlight**: Hervorgehobener Button mit Gradient Circle
- ✅ **Dashboard Mobile**: Optimierte Karten (kleineres Padding, versteckte Beschreibung)
- ✅ **Layout**: Hamburger-Menü durch Bottom Nav ersetzt
- ✅ **Safe Area**: Unterstützung für iPhone Notch/Home-Balken

---

## 📱 Mobile Experience

**Vorher:**
- Hamburger-Menü oben rechts
- Sidebar-Overlay beim Klick
- Responsive Webseite

**Jetzt:**
- Fixed Bottom Navigation
- Native App-Feeling
- Schneller Zugriff auf Home, SiniChat, Profil
- SiniChat Button hervorgehoben

---

## 📝 Zusammenfassung

**Ein-Zeilen-Deploy:**
```bash
cd /var/www/sinispace-v2 && git pull origin main && npm install && npm run build && pm2 restart all && pm2 save
```

**Fertig!** 🎉
