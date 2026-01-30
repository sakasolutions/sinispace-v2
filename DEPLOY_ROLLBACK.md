# Rollback-Anleitung

Falls das neue Dashboard-Design nicht passt, kannst du auf den vorherigen Stand zurückgehen.

## Vor dem Design-Update (Commit-Hash prüfen)
```bash
git log --oneline -1
# Merke dir den Hash VOR dem Design-Update (z.B. f40a891)
```

## Rollback ausführen (lokal)

### Option A: Kompletter Reset (alle Design-Änderungen verwerfen)
```bash
git reset --hard f40a891   # Ersetze mit dem Hash VOR dem Design-Update
git push --force origin main
```

### Option B: Nur die letzten Änderungen rückgängig machen
```bash
git revert HEAD --no-edit   # Erstellt einen neuen Commit der die Änderungen rückgängig macht
git push origin main
```

## Nach dem Rollback (Server)
```bash
cd /var/www/sinispace-v2 && git pull origin main && npm run build && pm2 restart sinispace
```

## Betroffene Dateien beim Design-Update
- `app/globals.css` – Card-Elevation, Trending-Ribbon
- `app/(platform)/dashboard/dashboard-client.tsx` – Cards, Icons, Animationen
