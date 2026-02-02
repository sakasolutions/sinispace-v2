# Befehlskurzreferenz

Kopiere diese Befehle am Ende jeder Session – für GitHub-Upload und Server-Build.

---

## 1. GitHub-Upload (lokal)

```bash
git add .
git status
git commit -m "Deine Commit-Nachricht hier"
git push origin main
```

---

## 2. Auf dem Server: Code holen & neu bauen

**Einzeiler (nach SSH auf den Server):**

```bash
cd /var/www/sinispace-v2 && git pull origin main && npm install && npx prisma generate && rm -rf .next && npm run build && pm2 restart sinispace
```

**Schrittweise:**

```bash
cd /var/www/sinispace-v2
git pull origin main
npm install
npx prisma generate
rm -rf .next
npm run build
pm2 restart sinispace
pm2 logs sinispace --lines 50
```

---

*(Datei: `BEFEHLE.md` im Projektroot)*
