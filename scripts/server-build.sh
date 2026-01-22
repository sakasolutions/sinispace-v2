#!/bin/bash
# Server-Neubuild – auf dem Server ausführen (z. B. nach SSH)
# Einzeiler: cd /var/www/sinispace-v2 && git pull origin main && npm install && npx prisma generate && rm -rf .next && npm run build && pm2 restart sinispace

set -e
cd /var/www/sinispace-v2
git pull origin main
npm install
npx prisma generate
rm -rf .next
npm run build
pm2 restart sinispace
echo "✅ Build & Restart fertig. Logs: pm2 logs sinispace --lines 50"
