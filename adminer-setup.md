# Datenbank-Zugang über Browser einrichten

## Option 1: Adminer (Einfachste Lösung)

Adminer ist ein einfaches PHP-Tool für Datenbank-Verwaltung.

### Installation auf dem Server:

```bash
cd /var/www/sinispace-v2
mkdir -p public/adminer
cd public/adminer

# Adminer herunterladen
wget https://www.adminer.org/latest.php -O index.php

# Oder mit curl:
curl -L https://www.adminer.org/latest.php -o index.php
```

### Zugriff:
- URL: `https://sinispace.app/adminer/` oder `http://5.181.51.56:3000/adminer/`
- System: PostgreSQL
- Server: Aus `.env` Datei: `DATABASE_URL` (nur der Host-Teil)
- Benutzername: Aus `.env` Datei
- Passwort: Aus `.env` Datei
- Datenbank: Aus `.env` Datei

### Sicherheit:
```bash
# .htaccess erstellen (falls Apache)
echo "AuthType Basic
AuthName 'Adminer Access'
AuthUserFile /var/www/sinispace-v2/.htpasswd
Require valid-user" > /var/www/sinispace-v2/public/adminer/.htaccess

# Passwort erstellen (wenn Apache)
htpasswd -c /var/www/sinispace-v2/.htpasswd admin
```

## Option 2: pgAdmin (Für PostgreSQL)

### Installation:
```bash
# Auf dem Server installieren
sudo apt update
sudo apt install pgadmin4-web

# Konfigurieren
sudo /usr/pgadmin4/bin/setup-web.sh
```

## Option 3: Einfache Node.js Admin-Oberfläche

Siehe `admin-db.js` für eine einfache Express-basierte Admin-Oberfläche.
