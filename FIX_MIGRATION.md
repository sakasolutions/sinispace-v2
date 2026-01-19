# Migration-Fix Anleitung

Die Migration `20250117000000_add_base64_for_images` ist fehlgeschlagen.

## Lösung: Migration als aufgelöst markieren

Falls die Spalte `base64Data` bereits in der `Document` Tabelle existiert, kannst du die Migration als aufgelöst markieren:

```bash
# Auf dem Server ausführen:
cd /var/www/sinispace-v2

# Prüfe ob die Spalte bereits existiert:
psql $DATABASE_URL -c "\d \"Document\"" | grep base64Data

# Falls die Spalte existiert, markiere die Migration als aufgelöst:
npx prisma migrate resolve --applied 20250117000000_add_base64_for_images

# Dann normale Migration fortsetzen:
npx prisma migrate deploy
```

## Alternative: Migration manuell ausführen

Falls die Spalte NICHT existiert, führe die Migration manuell aus:

```bash
# Auf dem Server ausführen:
cd /var/www/sinispace-v2

# Migration manuell ausführen:
psql $DATABASE_URL -c "ALTER TABLE \"Document\" ADD COLUMN IF NOT EXISTS \"base64Data\" TEXT;"

# Dann markiere die Migration als aufgelöst:
npx prisma migrate resolve --applied 20250117000000_add_base64_for_images

# Dann normale Migration fortsetzen:
npx prisma migrate deploy
```

## Falls nichts funktioniert: Migration zurücksetzen

```bash
# Auf dem Server ausführen:
cd /var/www/sinispace-v2

# Migration als zurückgerollt markieren:
npx prisma migrate resolve --rolled-back 20250117000000_add_base64_for_images

# Dann normale Migration fortsetzen:
npx prisma migrate deploy
```
