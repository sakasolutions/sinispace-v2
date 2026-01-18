# Server Fix: 502 Bad Gateway

## Problem
Nginx gibt 502 Bad Gateway zurück, weil die Next.js-App nicht erreichbar ist.

## Lösungsschritte

### 1. Auf Server verbinden und ins Verzeichnis wechseln
```bash
cd /var/www/sinispace-v2
```

### 2. PM2 Status prüfen
```bash
pm2 status
pm2 logs sinispace --lines 50
```

### 3. Prüfen ob Port 3000 belegt ist
```bash
netstat -tulpn | grep 3000
# oder
lsof -i :3000
```

### 4. Git Pull (neueste Änderungen holen)
```bash
git pull origin main
```

### 5. Dependencies installieren (falls nötig)
```bash
npm install
```

### 6. Prisma Client generieren
```bash
npx prisma generate
```

### 7. Build erstellen
```bash
npm run build
```

### 8. PM2 Prozess neu starten
```bash
# Falls Prozess existiert, stoppen
pm2 stop sinispace

# Neu starten
pm2 start npm --name "sinispace" -- start

# Oder falls bereits konfiguriert:
pm2 restart sinispace

# PM2 beim Systemstart starten
pm2 save
pm2 startup
```

### 9. PM2 Logs prüfen
```bash
pm2 logs sinispace --lines 100
```

### 10. Nginx Status prüfen
```bash
sudo systemctl status nginx
sudo nginx -t
```

### 11. Nginx neu laden (falls nötig)
```bash
sudo systemctl reload nginx
```

## Schnell-Fix (alles in einem)
```bash
cd /var/www/sinispace-v2
git pull origin main
npm install
npx prisma generate
npm run build
pm2 restart sinispace
pm2 logs sinispace --lines 50
```

## Häufige Probleme

### Problem: PM2 Prozess läuft nicht
```bash
# Prozess neu starten
pm2 start npm --name "sinispace" -- start
pm2 save
```

### Problem: Port 3000 ist bereits belegt
```bash
# Prozess auf Port 3000 finden und beenden
lsof -ti:3000 | xargs kill -9
# Dann PM2 neu starten
pm2 restart sinispace
```

### Problem: Build fehlgeschlagen
```bash
# Logs prüfen
npm run build
# Fehler beheben und erneut bauen
```

### Problem: Nginx kann nicht verbinden
```bash
# Prüfen ob Next.js auf Port 3000 läuft
curl http://localhost:3000

# Nginx Config prüfen
sudo nginx -t
sudo cat /etc/nginx/sites-available/sinispace
```

## PM2 Ecosystem Config (empfohlen)

Erstelle `ecosystem.config.js` im Projektverzeichnis:
```javascript
module.exports = {
  apps: [{
    name: 'sinispace',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/sinispace-v2',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Dann starten mit:
```bash
pm2 start ecosystem.config.js
pm2 save
```
