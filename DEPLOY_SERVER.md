# Server Deployment Befehle

## Schnell-Deployment (Alles in einem)
```bash
cd /var/www/sinispace-v2
git pull origin main
npm install
npx prisma generate
npm run build
pm2 restart sinispace
pm2 logs sinispace --lines 50
```

## Schritt-für-Schritt

### 1. Ins Verzeichnis wechseln
```bash
cd /var/www/sinispace-v2
```

### 2. Neueste Änderungen holen
```bash
git pull origin main
```

### 3. Dependencies installieren (falls neue Packages hinzugefügt wurden)
```bash
npm install
```

### 4. Prisma Client generieren (wichtig nach Schema-Änderungen)
```bash
npx prisma generate
```

### 5. Production Build erstellen
```bash
npm run build
```

### 6. PM2 Prozess neu starten
```bash
pm2 restart sinispace
```

### 7. Logs prüfen (optional, aber empfohlen)
```bash
pm2 logs sinispace --lines 50
```

### 8. Status prüfen
```bash
pm2 status
```

## Falls PM2 Prozess nicht läuft
```bash
pm2 start npm --name "sinispace" -- start
pm2 save
```

## Falls Port 3000 blockiert ist
```bash
lsof -ti:3000 | xargs kill -9
pm2 restart sinispace
```

## Mit ecosystem.config.js (falls vorhanden)
```bash
cd /var/www/sinispace-v2
git pull origin main
npm install
npx prisma generate
npm run build
pm2 restart ecosystem.config.js
pm2 logs sinispace --lines 50
```
