# Nginx Upload-Limit erhöhen (413 Request Entity Too Large Fix)

## Problem
Nginx blockiert große Datei-Uploads mit "413 Request Entity Too Large" bevor die Request Next.js erreicht.

## Lösung

**Auf dem Server:**

1. **Nginx-Konfiguration finden:**
   ```bash
   # Meistens hier:
   /etc/nginx/sites-available/sinispace
   # Oder:
   /etc/nginx/nginx.conf
   ```

2. **Nginx-Config öffnen:**
   ```bash
   sudo nano /etc/nginx/sites-available/sinispace
   # oder
   sudo nano /etc/nginx/nginx.conf
   ```

3. **`client_max_body_size` hinzufügen/erhöhen:**
   
   In der `server` oder `location /` Sektion hinzufügen:
   ```nginx
   server {
       listen 80;
       server_name sinispace.app;
       
       # WICHTIG: Upload-Limit erhöhen (50 MB)
       client_max_body_size 50M;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Nginx-Konfiguration testen:**
   ```bash
   sudo nginx -t
   ```

5. **Nginx neu laden:**
   ```bash
   sudo systemctl reload nginx
   # oder
   sudo service nginx reload
   ```

## Wichtig
- `client_max_body_size` muss in der `server` oder `location` Sektion stehen
- Wert kann sein: `10M`, `50M`, `100M`, etc.
- Nach Änderung immer `sudo nginx -t` zum Testen!
- Danach `sudo systemctl reload nginx` zum Anwenden

## Für alle Locations (globale Config)
Falls du es global setzen willst, in `/etc/nginx/nginx.conf` im `http` Block:
```nginx
http {
    client_max_body_size 50M;
    # ... rest der Config
}
```
