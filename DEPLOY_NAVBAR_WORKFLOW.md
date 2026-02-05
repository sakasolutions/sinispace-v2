# Deploy-Workflow (lokal + Server)

## Lokal (Commit & Push)

```bash
git add -A
git commit -m "Fix: Navbar-Höhe reduziert, Chat-Input über Navbar, Content-Padding für Navbar+Input"
git push origin main
```

## Auf dem Server (nach Push)

```bash
cd /var/www/sinispace-v2
git pull origin main
npm install
npx prisma generate
rm -rf .next
npm run build
pm2 restart sinispace
```

---

*Commit-Message bei Bedarf anpassen.*
